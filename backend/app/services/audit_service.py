import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import AuditLog

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_name: str,
        entity_id: str,
        actor_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> AuditLog:
        """Appends an immutable audit log entry."""
        log_entry = AuditLog(
            actor_id=actor_id,
            entity_name=entity_name,
            entity_id=entity_id,
            action=action,
            payload=json.dumps(payload or {})
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry

