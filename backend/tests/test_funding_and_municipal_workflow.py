import io

from PIL import Image

from app.models import AdministrativeRegion, Municipality


def create_test_image(color=(110, 140, 170)):
    image = Image.new("RGB", (120, 120), color=color)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    buffer.seek(0)
    return buffer


def login(client, email, password="testpass123"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def create_report(client, headers, municipality_id=None):
    data = {
        "latitude": "21.1458",
        "longitude": "79.0882",
        "address": "Funding test garbage location",
        "description": "Garbage requiring a community-funded cleanup",
        "waste_categories_raw": '["Plastic Waste"]',
        "capture_method": "IN_APP_CAMERA",
    }
    if municipality_id:
        data["tagged_municipality_id"] = municipality_id
    response = client.post(
        "/api/reports",
        data=data,
        files={"file": ("garbage.jpg", create_test_image(), "image/jpeg")},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_bids_are_visible_with_total_and_contact_details(client, db_session):
    citizen_headers = login(client, "citizen_test@test.org")
    report = create_report(client, citizen_headers)

    register = client.post("/api/auth/register", json={
        "email": "donor@test.org",
        "password": "donorpass123",
        "full_name": "Community Donor",
        "role": "CITIZEN",
    })
    assert register.status_code == 200
    donor_headers = login(client, "donor@test.org", "donorpass123")

    bid = client.post(
        f"/api/reports/{report['id']}/bids",
        json={
            "amount": "275.50",
            "message": "Contact me when a cleaner claims this site.",
            "contact_phone": "+91-9000000000",
        },
        headers=donor_headers,
    )
    assert bid.status_code == 200, bid.text
    assert float(bid.json()["amount"]) == 275.50
    assert bid.json()["contact_email"] == "donor@test.org"

    funding = client.get(f"/api/reports/{report['id']}/bids", headers=citizen_headers)
    assert funding.status_code == 200
    assert funding.json()["bid_count"] == 1
    assert float(funding.json()["total_amount"]) == 275.50
    assert funding.json()["bids"][0]["contact_phone"] == "+91-9000000000"


def test_tagged_municipality_notifies_current_and_future_employees(client, db_session):
    municipality = db_session.query(Municipality).first()
    citizen_headers = login(client, "citizen_test@test.org")
    officer_headers = login(client, "officer_test@test.org")

    report = create_report(client, citizen_headers, municipality.id)

    notifications = client.get("/api/municipal/notifications", headers=officer_headers)
    assert notifications.status_code == 200
    assert notifications.json()[0]["report_id"] == report["id"]

    invite = client.post(
        "/api/municipal/employees",
        json={
            "employee_id": "NMC-EMP-204",
            "email": "employee204@nmc.org",
            "full_name": "Municipal Employee 204",
        },
        headers=officer_headers,
    )
    assert invite.status_code == 200, invite.text
    assert invite.json()["status"] == "INVITED"

    registration = client.post("/api/auth/register-municipal-employee", json={
        "municipality_id": municipality.id,
        "employee_id": "NMC-EMP-204",
        "email": "employee204@nmc.org",
        "password": "employee-pass-204",
        "full_name": "Municipal Employee 204",
    })
    assert registration.status_code == 200, registration.text
    assert registration.json()["role"] == "MUNICIPAL"
    assert registration.json()["municipality_id"] == municipality.id

    employee_headers = login(client, "employee204@nmc.org", "employee-pass-204")
    tagged_reports = client.get("/api/municipal/tagged-reports", headers=employee_headers)
    assert tagged_reports.status_code == 200
    assert report["id"] in [item["id"] for item in tagged_reports.json()]

    employee_notifications = client.get("/api/municipal/notifications", headers=employee_headers)
    assert employee_notifications.status_code == 200
    assert report["id"] in [item["report_id"] for item in employee_notifications.json()]


def test_cleanup_submission_eliminates_report_from_active_list(client, db_session):
    citizen_headers = login(client, "citizen_test@test.org")
    report = create_report(client, citizen_headers)

    cleanup = client.post(
        "/api/cleanups",
        json={"report_id": report["id"]},
        headers=citizen_headers,
    )
    assert cleanup.status_code == 200

    submitted = client.post(
        f"/api/cleanups/{cleanup.json()['id']}/submit-evidence",
        data={"latitude": "21.1458", "longitude": "79.0882"},
        files={"file": ("cleaned.jpg", create_test_image((190, 210, 220)), "image/jpeg")},
        headers=citizen_headers,
    )
    assert submitted.status_code == 200, submitted.text

    active = client.get("/api/reports", headers=citizen_headers)
    assert report["id"] not in [item["id"] for item in active.json()]

    all_reports = client.get("/api/reports?include_eliminated=true", headers=citizen_headers)
    assert report["id"] in [item["id"] for item in all_reports.json()]


def test_privileged_role_cannot_be_self_assigned(client):
    response = client.post("/api/auth/register", json={
        "email": "fake-admin@test.org",
        "password": "not-an-admin",
        "full_name": "Fake Admin",
        "role": "ADMIN",
    })
    assert response.status_code == 403


def test_verified_municipality_can_create_its_first_account(client, db_session):
    region = db_session.query(AdministrativeRegion).first()
    municipality = Municipality(
        name="Second Test Municipality",
        official_email="office@second-municipality.org",
        administrative_region_id=region.id,
        verification_status="VERIFIED",
    )
    db_session.add(municipality)
    db_session.commit()
    db_session.refresh(municipality)

    response = client.post("/api/auth/register-municipality", json={
        "municipality_id": municipality.id,
        "email": "office@second-municipality.org",
        "password": "municipal-pass-123",
        "full_name": "Second Municipality Office",
    })
    assert response.status_code == 200, response.text
    assert response.json()["role"] == "MUNICIPAL"
    assert response.json()["municipality_id"] == municipality.id
