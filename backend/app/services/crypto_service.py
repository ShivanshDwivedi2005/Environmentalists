import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from app.config import settings

class CryptoService:
    @staticmethod
    def compute_sha256(data: bytes) -> str:
        """Computes the cryptographic SHA-256 hex digest of raw binary data."""
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def create_canonical_manifest(
        report_id: str,
        image_hash: str,
        capture_timestamp: datetime,
        latitude: float,
        longitude: float,
        location_accuracy: float,
        capture_method: str,
        uploaded_by_id: str,
        additional_metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Creates a canonical evidence manifest dictionary with sorted keys."""
        manifest = {
            "version": "1.0",
            "report_id": report_id,
            "image_hash_sha256": image_hash,
            "capture_timestamp_iso": capture_timestamp.isoformat(),
            "coordinates": {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "accuracy_meters": round(location_accuracy, 2)
            },
            "capture_method": capture_method,
            "uploaded_by_id": uploaded_by_id,
            "metadata": additional_metadata or {}
        }
        return manifest

    @staticmethod
    def canonical_json(data: Dict[str, Any]) -> str:
        """Serializes dictionary to strict canonical JSON format (sorted keys, no extra whitespace)."""
        return json.dumps(data, sort_keys=True, separators=(',', ':'))

    @staticmethod
    def sign_manifest(canonical_manifest_str: str) -> str:
        """Signs the canonical manifest string using server-side HMAC-SHA256."""
        secret = settings.SIGNING_KEY.encode('utf-8')
        signature = hmac.new(secret, canonical_manifest_str.encode('utf-8'), hashlib.sha256).hexdigest()
        return signature

    @classmethod
    def generate_signed_evidence(
        cls,
        image_bytes: bytes,
        report_id: str,
        capture_timestamp: datetime,
        latitude: float,
        longitude: float,
        location_accuracy: float,
        capture_method: str,
        uploaded_by_id: str
    ) -> Tuple[str, str, str]:
        """
        Returns:
            (image_sha256, canonical_manifest_json, hmac_signature)
        """
        image_hash = cls.compute_sha256(image_bytes)
        manifest = cls.create_canonical_manifest(
            report_id=report_id,
            image_hash=image_hash,
            capture_timestamp=capture_timestamp,
            latitude=latitude,
            longitude=longitude,
            location_accuracy=location_accuracy,
            capture_method=capture_method,
            uploaded_by_id=uploaded_by_id
        )
        manifest_json = cls.canonical_json(manifest)
        signature = cls.sign_manifest(manifest_json)
        return image_hash, manifest_json, signature

    @classmethod
    def verify_evidence(
        cls,
        image_bytes: bytes,
        canonical_manifest_str: str,
        recorded_signature: str,
        recorded_hash: str
    ) -> Dict[str, Any]:
        """
        Verifies cryptographic integrity of evidence:
        1. Current image bytes hash == recorded hash
        2. Computed signature of manifest == recorded signature
        3. Manifest payload hash == recorded hash
        """
        current_hash = cls.compute_sha256(image_bytes)
        hash_matches = hmac.compare_digest(current_hash, recorded_hash)

        computed_signature = cls.sign_manifest(canonical_manifest_str)
        signature_valid = hmac.compare_digest(computed_signature, recorded_signature)

        try:
            manifest = json.loads(canonical_manifest_str)
            manifest_hash = manifest.get("image_hash_sha256", "")
            manifest_hash_matches = hmac.compare_digest(manifest_hash, recorded_hash)
        except Exception:
            manifest = {}
            manifest_hash_matches = False

        tamper_detected = not (hash_matches and signature_valid and manifest_hash_matches)

        details = "Evidence verified authentic."
        if not hash_matches:
            details = "ALERT: File bytes have been modified since upload (Hash mismatch)."
        elif not signature_valid:
            details = "ALERT: Manifest signature verification failed (Manifest forged or corrupted)."
        elif not manifest_hash_matches:
            details = "ALERT: Manifest references a different image hash."

        return {
            "current_hash": current_hash,
            "recorded_hash": recorded_hash,
            "hash_matches": hash_matches,
            "signature_valid": signature_valid,
            "tamper_detected": tamper_detected,
            "manifest": manifest,
            "details": details
        }

