import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.models import User, AdministrativeRegion, Municipality
from app.security import hash_password

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Seed minimal test regions and users
        reg = AdministrativeRegion(
            code="IND-TEST-W01",
            name="Test Ward 01",
            region_type="WARD",
            center_lat=21.1458,
            center_lng=79.0882
        )
        db.add(reg)
        db.commit()
        db.refresh(reg)

        muni = Municipality(
            name="Test Municipality",
            official_email="muni@test.gov",
            administrative_region_id=reg.id
        )
        db.add(muni)
        db.commit()
        db.refresh(muni)

        pwd = hash_password("testpass123")
        citizen = User(
            email="citizen_test@test.org",
            hashed_password=pwd,
            full_name="Citizen Tester",
            role="CITIZEN",
            cached_points=0
        )
        officer = User(
            email="officer_test@test.org",
            hashed_password=pwd,
            full_name="Officer Tester",
            role="MUNICIPAL",
            municipality_id=muni.id,
            cached_points=0
        )
        db.add_all([citizen, officer])
        db.commit()

        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

