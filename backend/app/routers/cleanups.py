import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Cleanup, Report, Evidence, User
from app.schemas import CleanupCreate, CleanupOut, CleanupVerifyRequest, EvidenceOut
from app.security import get_current_user
from app.services.crypto_service import CryptoService
from app.services.ai_service import AIService
from app.services.rewards_service import RewardsService
from app.services.scoring_service import ScoringService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/cleanups", tags=["Cleanups"])

@router.get("", response_model=List[CleanupOut])
def list_cleanups(
    report_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Cleanup)
    if report_id:
        query = query.filter(Cleanup.report_id == report_id)
    
    cleanups = query.order_by(Cleanup.created_at.desc()).all()
    results = []
    for c in cleanups:
        before_ev = db.query(Evidence).filter(Evidence.id == c.before_evidence_id).first()
        after_ev = db.query(Evidence).filter(Evidence.id == c.after_evidence_id).first() if c.after_evidence_id else None
        
        results.append(CleanupOut(
            id=c.id,
            report_id=c.report_id,
            organizer_id=c.organizer_id,
            organizer_name=c.organizer.full_name if c.organizer else "Unknown",
            organization_id=c.organization_id,
            organization_name=c.organization.name if c.organization else None,
            before_evidence_id=c.before_evidence_id,
            after_evidence_id=c.after_evidence_id,
            status=c.status,
            ai_cleanliness_delta=c.ai_cleanliness_delta,
            verification_notes=c.verification_notes,
            verified_by_id=c.verified_by_id,
            completed_at=c.completed_at,
            verified_at=c.verified_at,
            created_at=c.created_at,
            before_evidence=before_ev,
            after_evidence=after_ev
        ))
    return results

@router.post("", response_model=CleanupOut)
def create_cleanup(
    cleanup_in: CleanupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == cleanup_in.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Target report not found")
    if report.is_duplicate or report.status in ["CLEANUP_SUBMITTED", "CLEANED_AND_VERIFIED"]:
        raise HTTPException(status_code=409, detail="This report is not available for cleanup")

    active_cleanup = db.query(Cleanup).filter(
        Cleanup.report_id == report.id,
        Cleanup.status.in_(["IN_PROGRESS", "SUBMITTED"]),
    ).first()
    if active_cleanup:
        raise HTTPException(status_code=409, detail="An active cleanup already exists for this report")

    # Find initial before-evidence
    before_ev = db.query(Evidence).filter(
        Evidence.report_id == report.id,
        Evidence.evidence_type == "BEFORE_POLLUTION"
    ).first()

    if not before_ev:
        raise HTTPException(status_code=400, detail="Cannot create cleanup: original report has no before-evidence.")

    cleanup = Cleanup(
        report_id=report.id,
        organizer_id=current_user.id,
        organization_id=cleanup_in.organization_id or current_user.organization_id,
        municipality_id=report.municipality_id,
        before_evidence_id=before_ev.id,
        status="IN_PROGRESS"
    )
    db.add(cleanup)

    report.status = "CLEANING_IN_PROGRESS"
    db.commit()
    db.refresh(cleanup)

    AuditService.log(
        db,
        action="CLEANUP_INITIATED",
        entity_name="Cleanup",
        entity_id=cleanup.id,
        actor_id=current_user.id,
        payload={"report_id": report.id}
    )

    return CleanupOut(
        id=cleanup.id,
        report_id=cleanup.report_id,
        organizer_id=cleanup.organizer_id,
        organizer_name=current_user.full_name,
        organization_id=cleanup.organization_id,
        before_evidence_id=cleanup.before_evidence_id,
        after_evidence_id=None,
        status=cleanup.status,
        ai_cleanliness_delta=0.0,
        created_at=cleanup.created_at,
        before_evidence=before_ev,
        after_evidence=None
    )

@router.post("/{cleanup_id}/submit-evidence", response_model=CleanupOut)
async def submit_cleanup_evidence(
    cleanup_id: str,
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_accuracy: float = Form(5.0),
    capture_method: str = Form("IN_APP_CAMERA"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cleanup = db.query(Cleanup).filter(Cleanup.id == cleanup_id).first()
    if not cleanup:
        raise HTTPException(status_code=404, detail="Cleanup not found")
    if cleanup.organizer_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only the cleanup organizer can submit after-evidence")
    if cleanup.status != "IN_PROGRESS":
        raise HTTPException(status_code=409, detail="Cleanup is not accepting after-evidence")

    after_bytes = await file.read()
    if not after_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Fetch before-evidence bytes from disk for AI delta comparison
    before_ev = db.query(Evidence).filter(Evidence.id == cleanup.before_evidence_id).first()
    before_bytes = b""
    if before_ev:
        before_filename = Path(before_ev.file_url).name
        before_path = settings.UPLOAD_DIR / before_filename
        if before_path.exists():
            with open(before_path, "rb") as f:
                before_bytes = f.read()

    # AI comparison
    comparison_result = AIService.compare_before_after(before_bytes, after_bytes)

    # Save after-image to disk
    now = datetime.now(timezone.utc)
    filename = f"cleanup_after_{cleanup.id}_{uuid.uuid4().hex[:8]}.jpg"
    file_path = settings.UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        f.write(after_bytes)

    # Generate cryptographic manifest and HMAC signature
    img_hash, manifest_str, signature = CryptoService.generate_signed_evidence(
        image_bytes=after_bytes,
        report_id=cleanup.report_id,
        capture_timestamp=now,
        latitude=latitude,
        longitude=longitude,
        location_accuracy=location_accuracy,
        capture_method=capture_method,
        uploaded_by_id=current_user.id
    )

    after_evidence = Evidence(
        report_id=cleanup.report_id,
        cleanup_id=cleanup.id,
        uploaded_by_id=current_user.id,
        evidence_type="AFTER_CLEANUP",
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
    db.add(after_evidence)
    db.commit()
    db.refresh(after_evidence)

    # Update cleanup
    cleanup.after_evidence_id = after_evidence.id
    cleanup.status = "SUBMITTED"
    cleanup.ai_cleanliness_delta = comparison_result["cleanliness_delta"]
    cleanup.completed_at = now

    report = db.query(Report).filter(Report.id == cleanup.report_id).first()
    if report:
        report.status = "CLEANUP_SUBMITTED"

    db.commit()
    db.refresh(cleanup)

    AuditService.log(
        db,
        action="CLEANUP_EVIDENCE_SUBMITTED",
        entity_name="Cleanup",
        entity_id=cleanup.id,
        actor_id=current_user.id,
        payload={"cleanliness_delta": cleanup.ai_cleanliness_delta, "sha256": img_hash}
    )

    return CleanupOut(
        id=cleanup.id,
        report_id=cleanup.report_id,
        organizer_id=cleanup.organizer_id,
        organizer_name=cleanup.organizer.full_name if cleanup.organizer else "Unknown",
        organization_id=cleanup.organization_id,
        before_evidence_id=cleanup.before_evidence_id,
        after_evidence_id=cleanup.after_evidence_id,
        status=cleanup.status,
        ai_cleanliness_delta=cleanup.ai_cleanliness_delta,
        verification_notes=comparison_result.get("notes"),
        completed_at=cleanup.completed_at,
        created_at=cleanup.created_at,
        before_evidence=before_ev,
        after_evidence=after_evidence
    )

@router.post("/{cleanup_id}/verify", response_model=CleanupOut)
def verify_cleanup(
    cleanup_id: str,
    verify_req: CleanupVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Municipal Authority or Admin verifies the cleanup.
    Idempotently awards points to the organizer and original reporter.
    Updates area cleanliness score.
    """
    if current_user.role not in ["MUNICIPAL", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only municipal authorities or admins can verify cleanups.")

    cleanup = db.query(Cleanup).filter(Cleanup.id == cleanup_id).first()
    if not cleanup:
        raise HTTPException(status_code=404, detail="Cleanup not found")

    if cleanup.status in ["VERIFIED", "REJECTED"]:
        raise HTTPException(status_code=409, detail="Cleanup has already received a final decision")

    if not cleanup.after_evidence_id:
        raise HTTPException(status_code=400, detail="Cannot verify cleanup without submitted after-evidence.")

    now = datetime.now(timezone.utc)
    cleanup.status = verify_req.status
    cleanup.verification_notes = verify_req.verification_notes
    cleanup.verified_by_id = current_user.id
    cleanup.verified_at = now

    report = db.query(Report).filter(Report.id == cleanup.report_id).first()

    if current_user.role == "MUNICIPAL":
        if not current_user.municipality_id or cleanup.municipality_id != current_user.municipality_id:
            raise HTTPException(status_code=403, detail="Cleanup is outside your municipal jurisdiction")

    if verify_req.status == "VERIFIED":
        if report:
            report.status = "CLEANED_AND_VERIFIED"
            report.resolved_at = now

        # Award points idempotently
        if verify_req.award_points:
            # 1. Organizer reward (+100 points)
            RewardsService.award_points(
                db=db,
                user_id=cleanup.organizer_id,
                points_delta=RewardsService.POINTS_POLICY["CLEANUP_VERIFIED"],
                reason="Verified Cleanup Drive Completed",
                reference_type="CLEANUP_VERIFIED",
                reference_id=cleanup.id
            )

            # 2. Original Reporter reward (+25 points)
            if report and report.reporter_id:
                RewardsService.award_points(
                    db=db,
                    user_id=report.reporter_id,
                    points_delta=RewardsService.POINTS_POLICY["REPORT_VERIFIED"],
                    reason="Pollution Report Successfully Verified & Cleaned",
                    reference_type="REPORT_VERIFIED",
                    reference_id=report.id
                )

        # Update region cleanliness score
        if report:
            ScoringService.calculate_region_score(db, report.administrative_region_id)
    elif verify_req.status == "REJECTED" and report:
        # Rejected evidence puts the garbage report back into active listings.
        report.status = "REOPENED"
        report.resolved_at = None
        ScoringService.calculate_region_score(db, report.administrative_region_id)

    db.commit()
    db.refresh(cleanup)

    AuditService.log(
        db,
        action="CLEANUP_REVIEWED",
        entity_name="Cleanup",
        entity_id=cleanup.id,
        actor_id=current_user.id,
        payload={"status": cleanup.status, "points_awarded": verify_req.award_points}
    )

    before_ev = db.query(Evidence).filter(Evidence.id == cleanup.before_evidence_id).first()
    after_ev = db.query(Evidence).filter(Evidence.id == cleanup.after_evidence_id).first()

    return CleanupOut(
        id=cleanup.id,
        report_id=cleanup.report_id,
        organizer_id=cleanup.organizer_id,
        organizer_name=cleanup.organizer.full_name if cleanup.organizer else "Unknown",
        organization_id=cleanup.organization_id,
        before_evidence_id=cleanup.before_evidence_id,
        after_evidence_id=cleanup.after_evidence_id,
        status=cleanup.status,
        ai_cleanliness_delta=cleanup.ai_cleanliness_delta,
        verification_notes=cleanup.verification_notes,
        verified_by_id=cleanup.verified_by_id,
        completed_at=cleanup.completed_at,
        verified_at=cleanup.verified_at,
        created_at=cleanup.created_at,
        before_evidence=before_ev,
        after_evidence=after_ev
    )

