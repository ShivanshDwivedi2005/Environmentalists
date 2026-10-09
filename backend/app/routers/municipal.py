import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    AdministrativeRegion,
    Evidence,
    MunicipalEmployeeInvite,
    MunicipalNotification,
    Municipality,
    Report,
    User,
)
from app.schemas import (
    MunicipalEmployeeInviteCreate,
    MunicipalEmployeeInviteOut,
    MunicipalNotificationOut,
    MunicipalityOut,
    ReportOut,
)
from app.security import get_current_user
from app.services.audit_service import AuditService


router = APIRouter(tags=["Municipalities"])


def _require_municipal_scope(current_user: User, requested_municipality_id: Optional[str] = None) -> str:
    if current_user.role == "ADMIN":
        if not requested_municipality_id:
            raise HTTPException(status_code=400, detail="municipality_id is required for an admin")
        return requested_municipality_id
    if current_user.role != "MUNICIPAL" or not current_user.municipality_id:
        raise HTTPException(status_code=403, detail="Municipal or admin access required")
    if requested_municipality_id and requested_municipality_id != current_user.municipality_id:
        raise HTTPException(status_code=403, detail="Cannot manage another municipality")
    return current_user.municipality_id


def _report_out(db: Session, report: Report) -> ReportOut:
    evidence = db.query(Evidence).filter(Evidence.report_id == report.id).all()
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
        evidence=evidence,
    )


@router.get("/municipalities", response_model=List[MunicipalityOut])
def list_municipalities(region_id: Optional[str] = None, db: Session = Depends(get_db)):
    """List verified municipalities available for optional report tagging."""
    query = db.query(Municipality).filter(Municipality.verification_status == "VERIFIED")
    if region_id:
        region_ids = []
        region = db.query(AdministrativeRegion).filter(AdministrativeRegion.id == region_id).first()
        while region:
            region_ids.append(region.id)
            region = region.parent
        query = query.filter(Municipality.administrative_region_id.in_(region_ids))
    return query.order_by(Municipality.name.asc()).all()


@router.post("/municipal/employees", response_model=MunicipalEmployeeInviteOut)
def load_municipal_employee(
    invite_in: MunicipalEmployeeInviteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    municipality_id = _require_municipal_scope(current_user, invite_in.municipality_id)
    municipality = db.query(Municipality).filter(Municipality.id == municipality_id).first()
    if not municipality:
        raise HTTPException(status_code=404, detail="Municipality not found")

    email = str(invite_in.email).lower()
    duplicate = db.query(MunicipalEmployeeInvite).filter(
        MunicipalEmployeeInvite.municipality_id == municipality_id,
        (
            (MunicipalEmployeeInvite.employee_id == invite_in.employee_id)
            | (MunicipalEmployeeInvite.email == email)
        ),
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Employee ID or email is already loaded for this municipality")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    invite = MunicipalEmployeeInvite(
        municipality_id=municipality_id,
        employee_id=invite_in.employee_id,
        email=email,
        full_name=invite_in.full_name,
        invited_by_id=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    AuditService.log(
        db,
        action="MUNICIPAL_EMPLOYEE_LOADED",
        entity_name="MunicipalEmployeeInvite",
        entity_id=invite.id,
        actor_id=current_user.id,
        payload={"municipality_id": municipality_id, "employee_id": invite.employee_id},
    )
    return invite


@router.get("/municipal/employees", response_model=List[MunicipalEmployeeInviteOut])
def list_municipal_employees(
    municipality_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scoped_id = _require_municipal_scope(current_user, municipality_id)
    return db.query(MunicipalEmployeeInvite).filter(
        MunicipalEmployeeInvite.municipality_id == scoped_id
    ).order_by(MunicipalEmployeeInvite.created_at.desc()).all()


@router.get("/municipal/tagged-reports", response_model=List[ReportOut])
def list_tagged_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    municipality_id = _require_municipal_scope(current_user)
    reports = db.query(Report).filter(
        Report.municipality_id == municipality_id
    ).order_by(Report.created_at.desc()).all()
    return [_report_out(db, report) for report in reports]


@router.get("/municipal/notifications", response_model=List[MunicipalNotificationOut])
def list_municipal_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    municipality_id = _require_municipal_scope(current_user)
    query = db.query(MunicipalNotification).filter(
        MunicipalNotification.municipality_id == municipality_id
    )
    if unread_only:
        query = query.filter(MunicipalNotification.acknowledged_at.is_(None))
    return query.order_by(MunicipalNotification.created_at.desc()).all()


@router.patch("/municipal/notifications/{notification_id}/read", response_model=MunicipalNotificationOut)
def acknowledge_municipal_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    municipality_id = _require_municipal_scope(current_user)
    notification = db.query(MunicipalNotification).filter(
        MunicipalNotification.id == notification_id,
        MunicipalNotification.municipality_id == municipality_id,
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if not notification.acknowledged_at:
        notification.acknowledged_at = datetime.now(timezone.utc)
        notification.acknowledged_by_id = current_user.id
        db.commit()
        db.refresh(notification)
    return notification
