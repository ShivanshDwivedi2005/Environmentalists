from typing import List, Optional, Any, Dict, Literal
from datetime import datetime
from decimal import Decimal
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

class MunicipalityAccountCreate(BaseModel):
    municipality_id: str
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str

class MunicipalEmployeeRegister(BaseModel):
    municipality_id: str
    employee_id: str
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str

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
    status: Literal["VERIFIED", "REJECTED"]
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

# Cleanup funding
class CleanupBidCreate(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    message: Optional[str] = Field(default=None, max_length=1000)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(default=None, max_length=50)

class CleanupBidOut(BaseModel):
    id: str
    report_id: str
    bidder_id: str
    bidder_name: str
    amount: Decimal
    currency: str
    message: Optional[str] = None
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    status: str
    created_at: datetime

class CleanupFundingSummary(BaseModel):
    report_id: str
    total_amount: Decimal
    currency: str
    bid_count: int
    bids: List[CleanupBidOut]

# Municipality onboarding and notifications
class MunicipalityOut(BaseModel):
    id: str
    name: str
    official_email: Optional[str] = None
    administrative_region_id: str
    verification_status: str

    model_config = {"from_attributes": True}

class LocationResolveRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy: Optional[float] = Field(default=None, ge=0)

class LocationResolutionOut(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    address: str
    locality: str
    district: Optional[str] = None
    state: Optional[str] = None
    postcode: Optional[str] = None
    country_code: str
    administrative_region_id: str
    municipality: MunicipalityOut
    source: str
    attribution: str

class MunicipalEmployeeInviteCreate(BaseModel):
    employee_id: str = Field(min_length=1, max_length=100)
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=255)
    municipality_id: Optional[str] = None

class MunicipalEmployeeInviteOut(BaseModel):
    id: str
    municipality_id: str
    employee_id: str
    email: EmailStr
    full_name: Optional[str] = None
    status: str
    claimed_by_user_id: Optional[str] = None
    created_at: datetime
    claimed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

class MunicipalNotificationOut(BaseModel):
    id: str
    municipality_id: str
    report_id: str
    notification_type: str
    message: str
    acknowledged_at: Optional[datetime] = None
    acknowledged_by_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
