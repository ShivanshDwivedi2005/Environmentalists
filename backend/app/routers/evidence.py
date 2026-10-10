import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Evidence, User
from app.schemas import EvidenceOut, EvidenceVerificationResult
from app.security import get_current_user
from app.services.crypto_service import CryptoService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/evidence", tags=["Evidence Integrity"])

@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence(evidence_id: str, db: Session = Depends(get_db)):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return evidence

@router.post("/{evidence_id}/verify", response_model=EvidenceVerificationResult)
def verify_evidence_integrity(
    evidence_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Forensic cryptographic integrity verification endpoint:
    1. Reads actual disk image bytes.
    2. Recalculates SHA-256 hash.
    3. Re-verifies HMAC-SHA256 digital signature on Canonical Signed Manifest.
    4. Detects any bit-level tampering or metadata forging.
    """
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found")

    # Locate file on disk
    filename = Path(evidence.file_url).name
    file_path = settings.UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Evidence file missing from disk storage.")

    with open(file_path, "rb") as f:
        disk_bytes = f.read()

    # Perform verification
    result = CryptoService.verify_evidence(
        image_bytes=disk_bytes,
        canonical_manifest_str=evidence.signed_manifest,
        recorded_signature=evidence.manifest_signature,
        recorded_hash=evidence.sha256_hash
    )

    # Update database verification flags
    evidence.hash_verified = result["hash_matches"]
    evidence.signature_valid = result["signature_valid"]
    evidence.verification_status = "TAMPERED" if result["tamper_detected"] else "VALID"
    db.commit()

    AuditService.log(
        db,
        action="EVIDENCE_VERIFIED",
        entity_name="Evidence",
        entity_id=evidence.id,
        actor_id=current_user.id,
        payload={
            "hash_matches": result["hash_matches"],
            "signature_valid": result["signature_valid"],
            "tamper_detected": result["tamper_detected"]
        }
    )

    return EvidenceVerificationResult(
        evidence_id=evidence.id,
        original_sha256=evidence.sha256_hash,
        computed_sha256=result["current_hash"],
        hash_matches=result["hash_matches"],
        signature_valid=result["signature_valid"],
        tamper_detected=result["tamper_detected"],
        manifest=result["manifest"],
        details=result["details"]
    )

