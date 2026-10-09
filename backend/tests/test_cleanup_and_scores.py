import io
from PIL import Image
from app.models import Report, Evidence, Cleanup, AdministrativeRegion, User
from app.services.scoring_service import ScoringService

def create_test_img():
    img = Image.new("RGB", (120, 120), color=(150, 180, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf

def test_full_cleanup_verification_and_points_award(client, db_session):
    # 1. Login as citizen to create report
    c_login = client.post("/api/auth/login", json={
        "email": "citizen_test@test.org",
        "password": "testpass123"
    })
    c_token = c_login.json()["access_token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    rep_res = client.post(
        "/api/reports",
        data={
            "latitude": "21.1458",
            "longitude": "79.0882",
            "address": "Civil Lines garden perimeter",
            "description": "Scattered garbage bottles and plastic wrappers",
            "waste_categories_raw": '["Plastic Waste"]',
            "capture_method": "IN_APP_CAMERA"
        },
        files={"file": ("report.jpg", create_test_img(), "image/jpeg")},
        headers=c_headers
    )
    assert rep_res.status_code == 200
    report_id = rep_res.json()["id"]

    # 2. Initiate Cleanup
    cleanup_res = client.post(
        "/api/cleanups",
        json={"report_id": report_id},
        headers=c_headers
    )
    assert cleanup_res.status_code == 200
    cleanup_id = cleanup_res.json()["id"]
    assert cleanup_res.json()["status"] == "IN_PROGRESS"

    # 3. Submit After-Cleanup Evidence
    after_res = client.post(
        f"/api/cleanups/{cleanup_id}/submit-evidence",
        data={
            "latitude": "21.1458",
            "longitude": "79.0882",
            "capture_method": "IN_APP_CAMERA"
        },
        files={"file": ("after.jpg", create_test_img(), "image/jpeg")},
        headers=c_headers
    )
    assert after_res.status_code == 200
    assert after_res.json()["status"] == "SUBMITTED"
    assert after_res.json()["ai_cleanliness_delta"] > 0

    # 4. Municipal Officer Login & Verification
    m_login = client.post("/api/auth/login", json={
        "email": "officer_test@test.org",
        "password": "testpass123"
    })
    m_token = m_login.json()["access_token"]
    m_headers = {"Authorization": f"Bearer {m_token}"}

    verify_res = client.post(
        f"/api/cleanups/{cleanup_id}/verify",
        json={
            "status": "VERIFIED",
            "verification_notes": "Officer verified site spotless and sanitized.",
            "award_points": True
        },
        headers=m_headers
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # Check report status updated to CLEANED_AND_VERIFIED
    rep_check = client.get(f"/api/reports/{report_id}", headers=c_headers)
    assert rep_check.json()["status"] == "CLEANED_AND_VERIFIED"

    # Check citizen points awarded (+100 for cleanup + 25 for report)
    citizen_user = db_session.query(User).filter(User.email == "citizen_test@test.org").first()
    assert citizen_user.cached_points == 125

