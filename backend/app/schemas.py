from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "CITIZEN"

class UserCreate(UserBase):
    password: str
    municipality_id: Optional[str] = None
    organization_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: str
    cached_points: int
    municipality_id: Optional[str] = None
    organization_id: Optional[str] = None
    account_status: str
    created_at: datetime

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Region Schemas
class RegionOut(BaseModel):
    id: str
    code: str
    name: str
    region_type: str
    parent_id: Optional[str] = None
    center_lat: float
    center_lng: float
    cleanliness_score: float
    population: int
    area_sq_km: float

    model_config = {"from_attributes": True}

# Evidence Schemas
class EvidenceOut(BaseModel):
    id: str
    report_id: str
    cleanup_id: Optional[str] = None
    uploaded_by_id: str
    evidence_type: str
    file_url: str
    sha256_hash: str
    signed_manifest: str
    manifest_signature: str
    capture_timestamp: datetime
    latitude: float
    longitude: float
    location_accuracy: float
    capture_method: str
    verification_status: str
    signature_valid: bool
    hash_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class EvidenceVerificationResult(BaseModel):
    evidence_id: str
    original_sha256: str
    computed_sha256: str
    hash_matches: bool
    signature_valid: bool
    tamper_detected: bool
    manifest: Dict[str, Any]
    details: str

# Report Schemas
class ReportCreate(BaseModel):
    latitude: float
    longitude: float
    address: str
    location_accuracy: float = 5.0
    description: str
    waste_categories: List[str] = []
    severity: str = "MEDIUM"
    capture_method: str = "IN_APP_CAMERA"

class ReportOut(BaseModel):
    id: str
    reporter_id: str
    reporter_name: Optional[str] = None
    administrative_region_id: str
    region_name: Optional[str] = None
    municipality_id: Optional[str] = None
    municipality_name: Optional[str] = None
    latitude: float
    longitude: float
    address: str
    location_accuracy: float
    description: str
    waste_categories: List[str] = []
    severity: str
    status: str
    ai_confidence: float
    ai_metadata: Optional[Dict[str, Any]] = None
    is_duplicate: bool
    duplicate_of_id: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    evidence: List[EvidenceOut] = []

    model_config = {"from_attributes": True}

class ReportStatusUpdate(BaseModel):
    status: str
    assigned_to: Optional[str] = None
    notes: Optional[str] = None

# Cleanup Schemas
class CleanupCreate(BaseModel):
    report_id: str
    organization_id: Optional[str] = None
    scheduled_date: Optional[datetime] = None

class CleanupVerifyRequest(BaseModel):
    status: str  # VERIFIED or REJECTED
    verification_notes: Optional[str] = None
    award_points: bool = True

class CleanupOut(BaseModel):
    id: str
    report_id: str
    organizer_id: str
    organizer_name: Optional[str] = None
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    before_evidence_id: str
    after_evidence_id: Optional[str] = None
    status: str
    ai_cleanliness_delta: float
    verification_notes: Optional[str] = None
    verified_by_id: Optional[str] = None
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    created_at: datetime
    before_evidence: Optional[EvidenceOut] = None
    after_evidence: Optional[EvidenceOut] = None

    model_config = {"from_attributes": True}

# Score & Leaderboard Schemas
class ScoreSummaryOut(BaseModel):
    region_id: str
    region_name: str
    region_code: str
    region_type: str
    score: float
    active_reports_count: int
    verified_cleanups_count: int
    penalty_points: float
    cleanup_bonus: float
    child_regions: List[Dict[str, Any]] = []

class LeaderboardItem(BaseModel):
    rank: int
    region_id: str
    region_name: str
    region_type: str
    score: float
    cleanups_count: int
    status_label: str

# Points & Transactions
class PointTransactionOut(BaseModel):
    id: str
    points_delta: int
    reason: str
    reference_type: str
    reference_id: str
    created_at: datetime

    model_config = {"from_attributes": True}

class UserStatsOut(BaseModel):
    user_id: str
    total_points: int
    reports_submitted: int
    cleanups_completed: int
    badges: List[str] = []
    transactions: List[PointTransactionOut] = []
