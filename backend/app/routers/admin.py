import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog, User, Report, Cleanup, Evidence
from app.security import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin & Auditing"])

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["ADMIN", "MUNICIPAL"]:
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges.")

    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "action": l.action,
            "entity_name": l.entity_name,
            "entity_id": l.entity_id,
            "actor_id": l.actor_id,
            "actor_name": l.actor.full_name if l.actor else "System",
            "payload": json.loads(l.payload) if l.payload else {},
            "timestamp": l.timestamp
        }
        for l in logs
    ]

@router.get("/overview")
def get_admin_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["ADMIN", "MUNICIPAL"]:
        raise HTTPException(status_code=403, detail="Forbidden: Insufficient privileges.")

    total_users = db.query(User).count()
    total_reports = db.query(Report).count()
    active_reports = db.query(Report).filter(Report.status.in_(["REPORTED", "UNDER_REVIEW", "VERIFIED", "ASSIGNED", "CLEANING_IN_PROGRESS"])).count()
    verified_cleanups = db.query(Cleanup).filter(Cleanup.status == "VERIFIED").count()
    evidence_count = db.query(Evidence).count()
    tampered_evidence = db.query(Evidence).filter(Evidence.verification_status == "TAMPERED").count()

    return {
        "total_users": total_users,
        "total_reports": total_reports,
        "active_reports": active_reports,
        "verified_cleanups": verified_cleanups,
        "total_evidence_files": evidence_count,
        "tampered_evidence_detected": tampered_evidence
    }

