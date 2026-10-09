from datetime import datetime, timezone
from app.services.crypto_service import CryptoService

def test_crypto_evidence_hashing_and_signing():
    sample_bytes = b"IMAGE_BINARY_TEST_DATA_2026_ORIGINAL"
    now = datetime.now(timezone.utc)
    
    img_hash, manifest_str, signature = CryptoService.generate_signed_evidence(
        image_bytes=sample_bytes,
        report_id="test-rep-01",
        capture_timestamp=now,
        latitude=21.1458,
        longitude=79.0882,
        location_accuracy=4.5,
        capture_method="IN_APP_CAMERA",
        uploaded_by_id="user-123"
    )

    assert len(img_hash) == 64
    assert len(signature) == 64

    # Verify untampered evidence
    result = CryptoService.verify_evidence(
        image_bytes=sample_bytes,
        canonical_manifest_str=manifest_str,
        recorded_signature=signature,
        recorded_hash=img_hash
    )

    assert result["hash_matches"] is True
    assert result["signature_valid"] is True
    assert result["tamper_detected"] is False

def test_crypto_evidence_tamper_detection_on_byte_modification():
    sample_bytes = b"IMAGE_BINARY_TEST_DATA_ORIGINAL"
    tampered_bytes = b"IMAGE_BINARY_TEST_DATA_TAMPERED!"
    now = datetime.now(timezone.utc)

    img_hash, manifest_str, signature = CryptoService.generate_signed_evidence(
        image_bytes=sample_bytes,
        report_id="test-rep-02",
        capture_timestamp=now,
        latitude=21.1458,
        longitude=79.0882,
        location_accuracy=4.5,
        capture_method="IN_APP_CAMERA",
        uploaded_by_id="user-123"
    )

    # Verification with tampered bytes must fail hash matching and detect tampering
    tampered_result = CryptoService.verify_evidence(
        image_bytes=tampered_bytes,
        canonical_manifest_str=manifest_str,
        recorded_signature=signature,
        recorded_hash=img_hash
    )

    assert tampered_result["hash_matches"] is False
    assert tampered_result["tamper_detected"] is True
    assert "Hash mismatch" in tampered_result["details"]

def test_crypto_evidence_forged_manifest_signature_failure():
    sample_bytes = b"IMAGE_BINARY_TEST_DATA_VALID"
    now = datetime.now(timezone.utc)

    img_hash, manifest_str, signature = CryptoService.generate_signed_evidence(
        image_bytes=sample_bytes,
        report_id="test-rep-03",
        capture_timestamp=now,
        latitude=21.1458,
        longitude=79.0882,
        location_accuracy=4.5,
        capture_method="IN_APP_CAMERA",
        uploaded_by_id="user-123"
    )

    # Forged manifest (e.g. attacker modified GPS coordinates in json)
    forged_manifest = manifest_str.replace("21.1458", "28.6139")

    forged_result = CryptoService.verify_evidence(
        image_bytes=sample_bytes,
        canonical_manifest_str=forged_manifest,
        recorded_signature=signature,
        recorded_hash=img_hash
    )

    assert forged_result["signature_valid"] is False
    assert forged_result["tamper_detected"] is True

