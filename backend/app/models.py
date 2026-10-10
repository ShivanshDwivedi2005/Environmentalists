import uuid
from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="CITIZEN")  # CITIZEN, MUNICIPAL, ORGANIZATION, ADMIN
    cached_points = Column(Integer, default=0, nullable=False)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), nullable=True)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    account_status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    reports = relationship("Report", back_populates="reporter", foreign_keys="Report.reporter_id")
    point_transactions = relationship("PointTransaction", back_populates="user")
    cleanups_organized = relationship("Cleanup", back_populates="organizer", foreign_keys="Cleanup.organizer_id")
    municipality = relationship("Municipality", back_populates="officers", foreign_keys=[municipality_id])
    organization = relationship("Organization", back_populates="members", foreign_keys=[organization_id])


class AdministrativeRegion(Base):
    __tablename__ = "administrative_regions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., IND-MH-NGP-W12
    name = Column(String(255), nullable=False)
    region_type = Column(String(50), nullable=False)  # COUNTRY, STATE, DISTRICT, TALUKA, WARD, GRID
    parent_id = Column(String(36), ForeignKey("administrative_regions.id"), nullable=True)
    center_lat = Column(Float, nullable=False)
    center_lng = Column(Float, nullable=False)
    cleanliness_score = Column(Float, default=100.0, nullable=False)
    population = Column(Integer, default=50000, nullable=False)
    area_sq_km = Column(Float, default=10.0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    parent = relationship("AdministrativeRegion", remote_side=[id], backref="children")
    municipalities = relationship("Municipality", back_populates="administrative_region")
    reports = relationship("Report", back_populates="administrative_region")
    score_snapshots = relationship("ScoreSnapshot", back_populates="region")


class Municipality(Base):
    __tablename__ = "municipalities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    official_email = Column(String(255), nullable=False)
    administrative_region_id = Column(String(36), ForeignKey("administrative_regions.id"), nullable=False)
    verification_status = Column(String(50), default="VERIFIED", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    administrative_region = relationship("AdministrativeRegion", back_populates="municipalities")
    officers = relationship("User", back_populates="municipality", foreign_keys="User.municipality_id")
    reports = relationship("Report", back_populates="municipality")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    registration_number = Column(String(100), nullable=False)
    verification_status = Column(String(50), default="VERIFIED", nullable=False)
    average_rating = Column(Float, default=5.0, nullable=False)
    total_cleanups = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    members = relationship("User", back_populates="organization", foreign_keys="User.organization_id")
    cleanups = relationship("Cleanup", back_populates="organization")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reporter_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    administrative_region_id = Column(String(36), ForeignKey("administrative_regions.id"), nullable=False)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=False)
    location_accuracy = Column(Float, default=5.0, nullable=False)
    description = Column(Text, nullable=False)
    waste_categories = Column(Text, default="[]", nullable=False)  # JSON encoded list: ["plastic", "debris"]
    severity = Column(String(50), default="MEDIUM", nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(50), default="REPORTED", nullable=False)
    ai_confidence = Column(Float, default=0.0, nullable=False)
    ai_metadata = Column(Text, default="{}", nullable=False)  # JSON encoded
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_of_id = Column(String(36), ForeignKey("reports.id"), nullable=True)
    assigned_to = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    reporter = relationship("User", back_populates="reports", foreign_keys=[reporter_id])
    administrative_region = relationship("AdministrativeRegion", back_populates="reports")
    municipality = relationship("Municipality", back_populates="reports")
    evidence_items = relationship("Evidence", back_populates="report", foreign_keys="Evidence.report_id")
    cleanups = relationship("Cleanup", back_populates="report")
    duplicates = relationship("Report", backref="original_report", remote_side=[id])

    @property
    def waste_categories_list(self):
        try:
            return json.loads(self.waste_categories)
        except Exception:
            return []

    @waste_categories_list.setter
    def waste_categories_list(self, val):
        self.waste_categories = json.dumps(val)


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    cleanup_id = Column(String(36), nullable=True)
    uploaded_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    evidence_type = Column(String(50), default="BEFORE_POLLUTION", nullable=False)  # BEFORE_POLLUTION, AFTER_CLEANUP
    file_url = Column(String(500), nullable=False)
    sha256_hash = Column(String(64), index=True, nullable=False)
    signed_manifest = Column(Text, nullable=False)  # JSON encoded canonical manifest
    manifest_signature = Column(String(255), nullable=False)  # HMAC-SHA256 signature
    capture_timestamp = Column(DateTime, default=utc_now, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_accuracy = Column(Float, default=5.0, nullable=False)
    capture_method = Column(String(50), default="IN_APP_CAMERA", nullable=False)  # IN_APP_CAMERA, FILE_UPLOAD
    verification_status = Column(String(50), default="VALID", nullable=False)  # VALID, SUSPICIOUS, TAMPERED
    signature_valid = Column(Boolean, default=True, nullable=False)
    hash_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    report = relationship("Report", back_populates="evidence_items", foreign_keys=[report_id])
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])


class Cleanup(Base):
    __tablename__ = "cleanups"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    organizer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), nullable=True)
    before_evidence_id = Column(String(36), ForeignKey("evidence.id"), nullable=False)
    after_evidence_id = Column(String(36), ForeignKey("evidence.id"), nullable=True)
    status = Column(String(50), default="SUBMITTED", nullable=False)  # SUBMITTED, VERIFIED, REJECTED
    ai_cleanliness_delta = Column(Float, default=0.0, nullable=False)  # 0.0 - 1.0 (improvement fraction)
    verification_notes = Column(Text, nullable=True)
    verified_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    report = relationship("Report", back_populates="cleanups")
    organizer = relationship("User", back_populates="cleanups_organized", foreign_keys=[organizer_id])
    organization = relationship("Organization", back_populates="cleanups")
    before_evidence = relationship("Evidence", foreign_keys=[before_evidence_id])
    after_evidence = relationship("Evidence", foreign_keys=[after_evidence_id])
    participants = relationship("CleanupParticipant", back_populates="cleanup")


class CleanupParticipant(Base):
    __tablename__ = "cleanup_participants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cleanup_id = Column(String(36), ForeignKey("cleanups.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="VOLUNTEER", nullable=False)
    participation_status = Column(String(50), default="CONFIRMED", nullable=False)
    points_allocated = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    cleanup = relationship("Cleanup", back_populates="participants")
    user = relationship("User")


class PointTransaction(Base):
    __tablename__ = "point_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    points_delta = Column(Integer, nullable=False)  # positive for reward, negative for deduction
    reason = Column(String(255), nullable=False)
    reference_type = Column(String(50), nullable=False)  # REPORT_VERIFIED, CLEANUP_VERIFIED, VOLUNTEER_TASK, REVERSAL
    reference_id = Column(String(36), nullable=False)
    idempotency_key = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="point_transactions")

    __table_args__ = (
        UniqueConstraint('reference_type', 'reference_id', 'user_id', name='uq_user_reference_award'),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    entity_name = Column(String(100), nullable=False)
    entity_id = Column(String(36), nullable=False)
    action = Column(String(100), nullable=False)
    payload = Column(Text, default="{}", nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)

    actor = relationship("User")


class ScoreSnapshot(Base):
    __tablename__ = "score_snapshots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    administrative_region_id = Column(String(36), ForeignKey("administrative_regions.id"), nullable=False)
    score = Column(Float, nullable=False)
    active_reports_count = Column(Integer, default=0, nullable=False)
    verified_cleanups_count = Column(Integer, default=0, nullable=False)
    penalty_score = Column(Float, default=0.0, nullable=False)
    bonus_score = Column(Float, default=0.0, nullable=False)
    calculated_at = Column(DateTime, default=utc_now, nullable=False)

    region = relationship("AdministrativeRegion", back_populates="score_snapshots")


class CleanupBid(Base):
    """A monetary pledge offered toward cleaning a reported garbage site."""
    __tablename__ = "cleanup_bids"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("reports.id"), index=True, nullable=False)
    bidder_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    amount_paise = Column(Integer, nullable=False)
    currency = Column(String(3), default="INR", nullable=False)
    message = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    report = relationship("Report")
    bidder = relationship("User")


class MunicipalEmployeeInvite(Base):
    """Municipality-controlled allow-list entry used to register an employee."""
    __tablename__ = "municipal_employee_invites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), index=True, nullable=False)
    employee_id = Column(String(100), nullable=False)
    email = Column(String(255), index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    status = Column(String(50), default="INVITED", nullable=False)
    invited_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    claimed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    claimed_at = Column(DateTime, nullable=True)

    municipality = relationship("Municipality")
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    claimed_by = relationship("User", foreign_keys=[claimed_by_user_id])

    __table_args__ = (
        UniqueConstraint("municipality_id", "employee_id", name="uq_municipality_employee_id"),
        UniqueConstraint("municipality_id", "email", name="uq_municipality_employee_email"),
    )


class MunicipalNotification(Base):
    """A municipality-level notification visible to all of its registered employees."""
    __tablename__ = "municipal_notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    municipality_id = Column(String(36), ForeignKey("municipalities.id"), index=True, nullable=False)
    report_id = Column(String(36), ForeignKey("reports.id"), index=True, nullable=False)
    notification_type = Column(String(50), default="REPORT_TAGGED", nullable=False)
    message = Column(Text, nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    municipality = relationship("Municipality")
    report = relationship("Report")
    acknowledged_by = relationship("User")

