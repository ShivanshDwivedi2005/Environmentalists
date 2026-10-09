import io
import json
import uuid
from datetime import datetime, timezone, timedelta
from PIL import Image, ImageDraw
from app.config import settings
from app.database import SessionLocal, Base, engine
from app.models import (
    User, AdministrativeRegion, Municipality, Organization,
    Report, Evidence, Cleanup, PointTransaction
)
from app.security import hash_password
from app.services.crypto_service import CryptoService
from app.services.ai_service import AIService
from app.services.scoring_service import ScoringService

def create_sample_image(text: str, color: tuple, add_noise: bool = True) -> bytes:
    """Generates a realistic test image with visual texture for AI feature testing."""
    img = Image.new("RGB", (400, 300), color=color)
    draw = ImageDraw.Draw(img)
    
    # Add texture/patterns
    if add_noise:
        for i in range(10, 390, 25):
            draw.rectangle([i, 100, i + 15, 200], fill=(200, 100, 50))
            draw.ellipse([i + 5, 120, i + 20, 160], fill=(30, 120, 220))
            draw.line([(i, 50), (i + 40, 250)], fill=(80, 80, 80), width=3)
            
    draw.text((20, 20), text, fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "citizen@ecotrack.org").first():
            print("Database already contains seed data. Skipping.")
            return

        print("Seeding EcoTrack Database...")

        # 1. Administrative Hierarchy
        # Country -> State -> District -> Wards
        country = AdministrativeRegion(
            code="IND",
            name="India",
            region_type="COUNTRY",
            center_lat=21.1458,
            center_lng=79.0882,
            population=1400000000,
            area_sq_km=3287263.0
        )
        db.add(country)
        db.commit()
        db.refresh(country)

        state = AdministrativeRegion(
            code="IND-MH",
            name="Maharashtra",
            region_type="STATE",
            parent_id=country.id,
            center_lat=19.7515,
            center_lng=75.7139,
            population=123000000,
            area_sq_km=307713.0
        )
        db.add(state)
        db.commit()
        db.refresh(state)

        district = AdministrativeRegion(
            code="IND-MH-NGP",
            name="Nagpur District",
            region_type="DISTRICT",
            parent_id=state.id,
            center_lat=21.1458,
            center_lng=79.0882,
            population=4650000,
            area_sq_km=9892.0
        )
        db.add(district)
        db.commit()
        db.refresh(district)

        # Nagpur Wards
        ward12 = AdministrativeRegion(
            code="IND-MH-NGP-W12",
            name="Ward 12 - Sitabuldi Central",
            region_type="WARD",
            parent_id=district.id,
            center_lat=21.1466,
            center_lng=79.0825,
            population=48000,
            area_sq_km=3.5
        )
        ward15 = AdministrativeRegion(
            code="IND-MH-NGP-W15",
            name="Ward 15 - Dharampeth West",
            region_type="WARD",
            parent_id=district.id,
            center_lat=21.1399,
            center_lng=79.0601,
            population=52000,
            area_sq_km=4.2
        )
        ward24 = AdministrativeRegion(
            code="IND-MH-NGP-W24",
            name="Ward 24 - Civil Lines North",
            region_type="WARD",
            parent_id=district.id,
            center_lat=21.1550,
            center_lng=79.0750,
            population=42000,
            area_sq_km=5.1
        )
        db.add_all([ward12, ward15, ward24])
        db.commit()
        db.refresh(ward12)
        db.refresh(ward15)
        db.refresh(ward24)

        # 2. Municipality
        muni = Municipality(
            name="Nagpur Municipal Corporation (NMC)",
            official_email="contact@nmc.gov.in",
            administrative_region_id=district.id,
            verification_status="VERIFIED"
        )
        db.add(muni)
        db.commit()
        db.refresh(muni)

        # 3. Organization
        org = Organization(
            name="Green Earth Foundation",
            description="Leading urban waste management and civic cleanup NGO.",
            registration_number="NGO-MH-2024-8841",
            verification_status="VERIFIED",
            average_rating=4.9,
            total_cleanups=12
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        # 4. Users across all 4 roles (default password: password123)
        pwd_hash = hash_password("password123")
        citizen = User(
            email="citizen@ecotrack.org",
            hashed_password=pwd_hash,
            full_name="Priya Sharma",
            role="CITIZEN",
            cached_points=50
        )
        officer = User(
            email="officer@nmc.gov.in",
            hashed_password=pwd_hash,
            full_name="Rajesh Patil",
            role="MUNICIPAL",
            municipality_id=muni.id,
            cached_points=0
        )
        ngo_user = User(
            email="ngo@greenearth.org",
            hashed_password=pwd_hash,
            full_name="Arun Kumar",
            role="ORGANIZATION",
            organization_id=org.id,
            cached_points=120
        )
        admin = User(
            email="admin@ecotrack.org",
            hashed_password=pwd_hash,
            full_name="EcoTrack Admin",
            role="ADMIN",
            cached_points=0
        )
        db.add_all([citizen, officer, ngo_user, admin])
        db.commit()
        db.refresh(citizen)
        db.refresh(officer)
        db.refresh(ngo_user)
        db.refresh(admin)

        # 5. Create Initial Reports with cryptographic evidence
        now = datetime.now(timezone.utc)

        # Report 1 in Ward 12
        rep1_img_bytes = create_sample_image("EVIDENCE 1: Sitabuldi Plastic Dumpsite", (60, 50, 40), add_noise=True)
        rep1_filename = f"report_seed_sitabuldi.jpg"
        with open(settings.UPLOAD_DIR / rep1_filename, "wb") as f:
            f.write(rep1_img_bytes)

        rep1_hash, rep1_manifest, rep1_sig = CryptoService.generate_signed_evidence(
            image_bytes=rep1_img_bytes,
            report_id="seed-report-1",
            capture_timestamp=now - timedelta(days=2),
            latitude=21.1466,
            longitude=79.0825,
            location_accuracy=4.2,
            capture_method="IN_APP_CAMERA",
            uploaded_by_id=citizen.id
        )

        rep1 = Report(
            reporter_id=citizen.id,
            administrative_region_id=ward12.id,
            municipality_id=muni.id,
            latitude=21.1466,
            longitude=79.0825,
            address="Near Sitabuldi Main Market Square, Ward 12, Nagpur",
            location_accuracy=4.2,
            description="Accumulated single-use plastic bottles, polythene bags, and roadside garbage overflow blocking sidewalk.",
            waste_categories=json.dumps(["Plastic Waste", "Mixed Household Garbage"]),
            severity="HIGH",
            status="VERIFIED",
            ai_confidence=0.88,
            ai_metadata=json.dumps({"confidence": 0.88, "severity": "HIGH", "waste_categories": ["Plastic Waste", "Mixed Household Garbage"]}),
            is_duplicate=False,
            created_at=now - timedelta(days=2)
        )
        db.add(rep1)
        db.commit()
        db.refresh(rep1)

        ev1 = Evidence(
            report_id=rep1.id,
            uploaded_by_id=citizen.id,
            evidence_type="BEFORE_POLLUTION",
            file_url=f"/uploads/{rep1_filename}",
            sha256_hash=rep1_hash,
            signed_manifest=rep1_manifest,
            manifest_signature=rep1_sig,
            capture_timestamp=now - timedelta(days=2),
            latitude=21.1466,
            longitude=79.0825,
            location_accuracy=4.2,
            capture_method="IN_APP_CAMERA",
            verification_status="VALID",
            signature_valid=True,
            hash_verified=True,
            created_at=now - timedelta(days=2)
        )
        db.add(ev1)
        db.commit()

        # Report 2 in Ward 15
        rep2_img_bytes = create_sample_image("EVIDENCE 2: Dharampeth Debris", (120, 110, 100), add_noise=True)
        rep2_filename = f"report_seed_dharampeth.jpg"
        with open(settings.UPLOAD_DIR / rep2_filename, "wb") as f:
            f.write(rep2_img_bytes)

        rep2_hash, rep2_manifest, rep2_sig = CryptoService.generate_signed_evidence(
            image_bytes=rep2_img_bytes,
            report_id="seed-report-2",
            capture_timestamp=now - timedelta(days=1),
            latitude=21.1399,
            longitude=79.0601,
            location_accuracy=3.5,
            capture_method="IN_APP_CAMERA",
            uploaded_by_id=citizen.id
        )

        rep2 = Report(
            reporter_id=citizen.id,
            administrative_region_id=ward15.id,
            municipality_id=muni.id,
            latitude=21.1399,
            longitude=79.0601,
            address="Plot 44, WHC Road, Dharampeth, Ward 15, Nagpur",
            location_accuracy=3.5,
            description="Demolition concrete rubble and tile remnants illegally discarded on empty plot.",
            waste_categories=json.dumps(["Construction Debris"]),
            severity="MEDIUM",
            status="ASSIGNED",
            assigned_to="NMC Sanitation Team West Zone",
            ai_confidence=0.84,
            ai_metadata=json.dumps({"confidence": 0.84, "severity": "MEDIUM", "waste_categories": ["Construction Debris"]}),
            is_duplicate=False,
            created_at=now - timedelta(days=1)
        )
        db.add(rep2)
        db.commit()
        db.refresh(rep2)

        ev2 = Evidence(
            report_id=rep2.id,
            uploaded_by_id=citizen.id,
            evidence_type="BEFORE_POLLUTION",
            file_url=f"/uploads/{rep2_filename}",
            sha256_hash=rep2_hash,
            signed_manifest=rep2_manifest,
            manifest_signature=rep2_sig,
            capture_timestamp=now - timedelta(days=1),
            latitude=21.1399,
            longitude=79.0601,
            location_accuracy=3.5,
            capture_method="IN_APP_CAMERA",
            verification_status="VALID",
            signature_valid=True,
            hash_verified=True,
            created_at=now - timedelta(days=1)
        )
        db.add(ev2)
        db.commit()

        # Seed Point Transactions
        tx1 = PointTransaction(
            user_id=citizen.id,
            points_delta=25,
            reason="Pollution Report Successfully Verified",
            reference_type="REPORT_VERIFIED",
            reference_id=rep1.id,
            idempotency_key=f"REPORT_VERIFIED:{rep1.id}:{citizen.id}"
        )
        tx2 = PointTransaction(
            user_id=citizen.id,
            points_delta=25,
            reason="Pollution Report Successfully Verified",
            reference_type="REPORT_VERIFIED",
            reference_id=rep2.id,
            idempotency_key=f"REPORT_VERIFIED:{rep2.id}:{citizen.id}"
        )
        db.add_all([tx1, tx2])
        db.commit()

        # Recompute all hierarchical scores
        ScoringService.recompute_all_scores(db)

        print("Database successfully seeded with hierarchical regions, users, reports, evidence, and scores!")

    finally:
        db.close()

if __name__ == "__main__":
    seed()

