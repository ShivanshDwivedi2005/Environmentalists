import math
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Report, Evidence, AdministrativeRegion, Municipality, User
from app.schemas import ReportOut, ReportStatusUpdate
from app.security import get_current_user
from app.services.crypto_service import CryptoService
from app.services.ai_service import AIService
from app.services.scoring_service import ScoringService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/reports", tags=["Reports"])

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_nearest_region(db: Session, lat: float, lng: float) -> AdministrativeRegion:
    """Finds the closest administrative region (preferring WARD level)."""
    regions = db.query(AdministrativeRegion).all()
    if not regions:
        # Create a fallback default region if none exists
        default_region = AdministrativeRegion(
            code="IND-DEFAULT",
            name="Default Metropolitan Zone",
            region_type="WARD",
            center_lat=lat,
            center_lng=lng
        )
        db.add(default_region)
        db.commit()
        db.refresh(default_region)
        return default_region

    best_region = regions[0]
    min_dist = float("inf")
    for r in regions:
        dist = haversine_distance_meters(lat, lng, r.center_lat, r.center_lng)
        # Prioritize ward-level resolution
        weight = 0.5 if r.region_type == "WARD" else 1.0
        if (dist * weight) < min_dist:
            min_dist = (dist * weight)
            best_region = r
    return best_region

@router.get("", response_model=List[ReportOut])
def list_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    region_id: Optional[str] = None,
    mine_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Report)

    # Municipal user jurisdiction scoping
    if current_user.role == "MUNICIPAL":
        if current_user.municipality_id:
            muni = db.query(Municipality).filter(Municipality.id == current_user.municipality_id).first()
            if muni:
                # Include reports matching municipality or region
                query = query.filter(
                    (Report.municipality_id == muni.id) | 
                    (Report.administrative_region_id == muni.administrative_region_id)
                )

    if mine_only:
        query = query.filter(Report.reporter_id == current_user.id)

    if status_filter:
        query = query.filter(Report.status == status_filter)

    if severity:
        query = query.filter(Report.severity == severity)

    if region_id:
        query = query.filter(Report.administrative_region_id == region_id)

    reports = query.order_by(Report.created_at.desc()).all()

    # Enrich response
    results = []
    for r in reports:
        evidence_items = db.query(Evidence).filter(Evidence.report_id == r.id).all()
        results.append(ReportOut(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_name=r.reporter.full_name if r.reporter else "Anonymous",
            administrative_region_id=r.administrative_region_id,
            region_name=r.administrative_region.name if r.administrative_region else "Unknown",
            municipality_id=r.municipality_id,
            municipality_name=r.municipality.name if r.municipality else None,
            latitude=r.latitude,
            longitude=r.longitude,
            address=r.address,
            location_accuracy=r.location_accuracy,
            description=r.description,
            waste_categories=r.waste_categories_list,
            severity=r.severity,
            status=r.status,
            ai_confidence=r.ai_confidence,
            ai_metadata=json.loads(r.ai_metadata) if r.ai_metadata else {},
            is_duplicate=r.is_duplicate,
            duplicate_of_id=r.duplicate_of_id,
            assigned_to=r.assigned_to,
            created_at=r.created_at,
            updated_at=r.updated_at,
            resolved_at=r.resolved_at,
            evidence=evidence_items
        ))
    return results

@router.post("", response_model=ReportOut)
async def create_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(...),
    location_accuracy: float = Form(5.0),
    description: str = Form(...),
    waste_categories_raw: Optional[str] = Form("[]"),
    capture_method: str = Form("IN_APP_CAMERA"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Read file bytes
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 2. Parse claimed waste categories
    try:
        user_categories = json.loads(waste_categories_raw) if waste_categories_raw else []
    except Exception:
        user_categories = [c.strip() for c in waste_categories_raw.split(",") if c.strip()]

    # 3. AI Computer Vision Analysis
    ai_result = AIService.analyze_pollution_image(image_bytes, user_categories)

    # 4. Resolve Administrative Region & Municipality
    region = find_nearest_region(db, latitude, longitude)
    muni = db.query(Municipality).filter(Municipality.administrative_region_id == region.id).first()
    if not muni and region.parent_id:
        muni = db.query(Municipality).filter(Municipality.administrative_region_id == region.parent_id).first()

    # 5. Spatial Duplicate Detection (within 50 meters, reported in last 14 days)
    fourteen_days_ago = datetime.now(timezone.utc) - timedelta(days=14)
    recent_reports = db.query(Report).filter(
        Report.created_at >= fourteen_days_ago,
        Report.status.in_(["REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "CLEANING_IN_PROGRESS"]),
        Report.is_duplicate == False
    ).all()

    is_duplicate = False
    duplicate_of_id = None
    for rep in recent_reports:
        dist = haversine_distance_meters(latitude, longitude, rep.latitude, rep.longitude)
        if dist <= 50.0:
            is_duplicate = True
            duplicate_of_id = rep.id
            break

    # 6. Report status determination
    initial_status = "REPORTED"
    if is_duplicate:
        initial_status = "DUPLICATE"
    elif ai_result["requires_human_review"]:
        initial_status = "UNDER_REVIEW"
    elif ai_result["confidence"] >= 0.70:
        initial_status = "VERIFIED"

    # 7. Create Report Record
    report = Report(
        reporter_id=current_user.id,
        administrative_region_id=region.id,
        municipality_id=muni.id if muni else None,
        latitude=latitude,
        longitude=longitude,
        address=address,
        location_accuracy=location_accuracy,
        description=description,
        waste_categories=json.dumps(ai_result["waste_categories"]),
        severity=ai_result["severity"],
        status=initial_status,
        ai_confidence=ai_result["confidence"],
        ai_metadata=json.dumps(ai_result),
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # 8. Save image & generate cryptographic evidence manifest
    filename = f"{report.id}_{uuid.uuid4().hex[:8]}.jpg"
    file_path = settings.UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        f.write(image_bytes)

    now = datetime.now(timezone.utc)
    img_hash, manifest_str, signature = CryptoService.generate_signed_evidence(
        image_bytes=image_bytes,
        report_id=report.id,
        capture_timestamp=now,
        latitude=latitude,
        longitude=longitude,
        location_accuracy=location_accuracy,
        capture_method=capture_method,
        uploaded_by_id=current_user.id
    )

    evidence = Evidence(
        report_id=report.id,
        uploaded_by_id=current_user.id,
        evidence_type="BEFORE_POLLUTION",
        file_url=f"/uploads/{filename}",
        sha256_hash=img_hash,
        signed_manifest=manifest_str,
        manifest_signature=signature,
        capture_timestamp=now,
        latitude=latitude,
        longitude=longitude,
        location_accuracy=location_accuracy,
        capture_method=capture_method,
        verification_status="VALID",
        signature_valid=True,
        hash_verified=True
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # 9. Audit Logging & Score Recalculation
    AuditService.log(
        db,
        action="REPORT_CREATED",
        entity_name="Report",
        entity_id=report.id,
        actor_id=current_user.id,
        payload={"severity": report.severity, "status": report.status, "sha256": img_hash}
    )

    ScoringService.calculate_region_score(db, region.id)

    return ReportOut(
        id=report.id,
        reporter_id=report.reporter_id,
        reporter_name=current_user.full_name,
        administrative_region_id=report.administrative_region_id,
        region_name=region.name,
        municipality_id=report.municipality_id,
        municipality_name=muni.name if muni else None,
        latitude=report.latitude,
        longitude=report.longitude,
        address=report.address,
        location_accuracy=report.location_accuracy,
        description=report.description,
        waste_categories=report.waste_categories_list,
        severity=report.severity,
        status=report.status,
        ai_confidence=report.ai_confidence,
        ai_metadata=ai_result,
        is_duplicate=report.is_duplicate,
        duplicate_of_id=report.duplicate_of_id,
        assigned_to=report.assigned_to,
        created_at=report.created_at,
        updated_at=report.updated_at,
        resolved_at=report.resolved_at,
        evidence=[evidence]
    )

@router.get("/{report_id}", response_model=ReportOut)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    evidence_items = db.query(Evidence).filter(Evidence.report_id == report.id).all()
    return ReportOut(
        id=report.id,
        reporter_id=report.reporter_id,
        reporter_name=report.reporter.full_name if report.reporter else "Anonymous",
        administrative_region_id=report.administrative_region_id,
        region_name=report.administrative_region.name if report.administrative_region else "Unknown",
        municipality_id=report.municipality_id,
        municipality_name=report.municipality.name if report.municipality else None,
        latitude=report.latitude,
        longitude=report.longitude,
        address=report.address,
        location_accuracy=report.location_accuracy,
        description=report.description,
        waste_categories=report.waste_categories_list,
        severity=report.severity,
        status=report.status,
        ai_confidence=report.ai_confidence,
        ai_metadata=json.loads(report.ai_metadata) if report.ai_metadata else {},
        is_duplicate=report.is_duplicate,
        duplicate_of_id=report.duplicate_of_id,
        assigned_to=report.assigned_to,
        created_at=report.created_at,
        updated_at=report.updated_at,
        resolved_at=report.resolved_at,
        evidence=evidence_items
    )

@router.patch("/{report_id}/status", response_model=ReportOut)
def update_report_status(
    report_id: str,
    update_data: ReportStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["MUNICIPAL", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only municipal authorities or admins can update report status.")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Municipal Jurisdiction Security Check
    if current_user.role == "MUNICIPAL" and current_user.municipality_id:
        muni = db.query(Municipality).filter(Municipality.id == current_user.municipality_id).first()
        if muni and report.municipality_id and report.municipality_id != muni.id:
            raise HTTPException(status_code=403, detail="Forbidden: Report is outside your municipal jurisdiction.")

    report.status = update_data.status
    if update_data.assigned_to:
        report.assigned_to = update_data.assigned_to
    if update_data.status == "CLEANED_AND_VERIFIED":
        report.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(report)

    AuditService.log(
        db,
        action="REPORT_STATUS_UPDATED",
        entity_name="Report",
        entity_id=report.id,
        actor_id=current_user.id,
        payload={"new_status": report.status, "assigned_to": report.assigned_to}
    )

    ScoringService.calculate_region_score(db, report.administrative_region_id)

    evidence_items = db.query(Evidence).filter(Evidence.report_id == report.id).all()
    return ReportOut(
        id=report.id,
        reporter_id=report.reporter_id,
        reporter_name=report.reporter.full_name if report.reporter else "Anonymous",
        administrative_region_id=report.administrative_region_id,
        region_name=report.administrative_region.name if report.administrative_region else "Unknown",
        municipality_id=report.municipality_id,
        municipality_name=report.municipality.name if report.municipality else None,
        latitude=report.latitude,
        longitude=report.longitude,
        address=report.address,
        location_accuracy=report.location_accuracy,
        description=report.description,
        waste_categories=report.waste_categories_list,
        severity=report.severity,
        status=report.status,
        ai_confidence=report.ai_confidence,
        ai_metadata=json.loads(report.ai_metadata) if report.ai_metadata else {},
        is_duplicate=report.is_duplicate,
        duplicate_of_id=report.duplicate_of_id,
        assigned_to=report.assigned_to,
        created_at=report.created_at,
        updated_at=report.updated_at,
        resolved_at=report.resolved_at,
        evidence=evidence_items
    )

