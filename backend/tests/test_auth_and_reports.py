import io
from PIL import Image

def create_dummy_png():
    img = Image.new("RGB", (100, 100), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf

def test_login_and_create_report(client):
    # 1. Login as citizen
    login_res = client.post("/api/auth/login", json={
        "email": "citizen_test@test.org",
        "password": "testpass123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Submit Report
    img_data = create_dummy_png()
    report_res = client.post(
        "/api/reports",
        data={
            "latitude": "21.1458",
            "longitude": "79.0882",
            "address": "123 Green Avenue, Test Ward",
            "location_accuracy": "4.0",
            "description": "Plastic bottles and trash littering public pathway",
            "waste_categories_raw": '["Plastic Waste"]',
            "capture_method": "IN_APP_CAMERA"
        },
        files={"file": ("test.png", img_data, "image/png")},
        headers=headers
    )
    assert report_res.status_code == 200
    rep_json = report_res.json()
    assert rep_json["description"] == "Plastic bottles and trash littering public pathway"
    assert rep_json["is_duplicate"] is False
    assert len(rep_json["evidence"]) == 1
    evidence_id = rep_json["evidence"][0]["id"]

    # 3. Verify evidence integrity
    verify_res = client.post(f"/api/evidence/{evidence_id}/verify", headers=headers)
    assert verify_res.status_code == 200
    verify_json = verify_res.json()
    assert verify_json["hash_matches"] is True
    assert verify_json["signature_valid"] is True
    assert verify_json["tamper_detected"] is False

    # 4. Duplicate report detection at the same coordinates (<50m)
    img_data_2 = create_dummy_png()
    dup_res = client.post(
        "/api/reports",
        data={
            "latitude": "21.1458",
            "longitude": "79.0882",
            "address": "123 Green Avenue, same location",
            "location_accuracy": "4.0",
            "description": "Another report of the same bottles",
            "waste_categories_raw": '["Plastic Waste"]',
            "capture_method": "IN_APP_CAMERA"
        },
        files={"file": ("test2.png", img_data_2, "image/png")},
        headers=headers
    )
    assert dup_res.status_code == 200
    dup_json = dup_res.json()
    assert dup_json["is_duplicate"] is True
    assert dup_json["duplicate_of_id"] == rep_json["id"]

