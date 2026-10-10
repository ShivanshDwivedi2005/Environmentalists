from app.models import Municipality
from app.routers import locations
from app.services.location_service import ResolvedLocation


def _login(client):
    response = client.post("/api/auth/login", json={
        "email": "citizen_test@test.org",
        "password": "testpass123",
    })
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_resolve_location_discovers_and_reuses_local_body(client, db_session, monkeypatch):
    async def fake_reverse_geocode(_latitude, _longitude):
        return ResolvedLocation(
            address="FC Road, Shivajinagar, Pune, Maharashtra, India",
            locality="Pune",
            district="Pune District",
            state="Maharashtra",
            postcode="411004",
            country_code="in",
            source_key="PUNE-TEST",
        )

    monkeypatch.setattr(locations, "reverse_geocode_india", fake_reverse_geocode)
    headers = _login(client)
    payload = {"latitude": 18.5204, "longitude": 73.8567, "accuracy": 8.5}

    first = client.post("/api/locations/resolve", json=payload, headers=headers)
    second = client.post("/api/locations/resolve", json=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    result = first.json()
    assert result["address"].startswith("FC Road")
    assert result["municipality"]["name"] == "Pune"
    assert result["municipality"]["verification_status"] == "DISCOVERED"
    assert result["source"] == "OpenStreetMap Nominatim"
    assert first.json()["municipality"]["id"] == second.json()["municipality"]["id"]
    assert db_session.query(Municipality).filter(Municipality.name == "Pune").count() == 1


def test_resolve_location_prefers_registered_municipality(client, monkeypatch):
    async def fake_reverse_geocode(_latitude, _longitude):
        return ResolvedLocation(
            address="Market Road, Test Municipality, India",
            locality="Test Municipality",
            district="Test District",
            state="Test State",
            postcode=None,
            country_code="in",
            source_key="REGISTERED-TEST",
        )

    monkeypatch.setattr(locations, "reverse_geocode_india", fake_reverse_geocode)
    response = client.post(
        "/api/locations/resolve",
        json={"latitude": 21.1458, "longitude": 79.0882, "accuracy": 4},
        headers=_login(client),
    )

    assert response.status_code == 200
    assert response.json()["municipality"]["verification_status"] == "VERIFIED"
