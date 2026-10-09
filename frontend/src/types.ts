export type UserRole = 'CITIZEN' | 'MUNICIPAL' | 'ORGANIZATION' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  cached_points: number;
  municipality_id?: string | null;
  organization_id?: string | null;
  account_status: string;
  created_at: string;
}

export interface AdministrativeRegion {
  id: string;
  code: string;
  name: string;
  region_type: string;
  parent_id?: string | null;
  center_lat: number;
  center_lng: number;
  cleanliness_score: number;
  population: number;
  area_sq_km: number;
}

export interface Evidence {
  id: string;
  report_id: string;
  cleanup_id?: string | null;
  uploaded_by_id: string;
  evidence_type: 'BEFORE_POLLUTION' | 'AFTER_CLEANUP' | 'DISPUTE';
  file_url: string;
  sha256_hash: string;
  signed_manifest: string;
  manifest_signature: string;
  capture_timestamp: string;
  latitude: number;
  longitude: number;
  location_accuracy: number;
  capture_method: string;
  verification_status: string;
  signature_valid: boolean;
  hash_verified: boolean;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reporter_name?: string;
  administrative_region_id: string;
  region_name?: string;
  municipality_id?: string | null;
  municipality_name?: string | null;
  latitude: number;
  longitude: number;
  address: string;
  location_accuracy: number;
  description: string;
  waste_categories: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  ai_confidence: number;
  ai_metadata?: Record<string, any>;
  is_duplicate: boolean;
  duplicate_of_id?: string | null;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  evidence: Evidence[];
}

export interface Cleanup {
  id: string;
  report_id: string;
  organizer_id: string;
  organizer_name?: string;
  organization_id?: string | null;
  organization_name?: string | null;
  before_evidence_id: string;
  after_evidence_id?: string | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  ai_cleanliness_delta: number;
  verification_notes?: string | null;
  verified_by_id?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
  created_at: string;
  before_evidence?: Evidence;
  after_evidence?: Evidence;
}

export interface EvidenceVerificationResult {
  evidence_id: string;
  original_sha256: string;
  computed_sha256: string;
  hash_matches: boolean;
  signature_valid: boolean;
  tamper_detected: boolean;
  manifest: Record<string, any>;
  details: string;
}

export interface PointTransaction {
  id: string;
  points_delta: number;
  reason: string;
  reference_type: string;
  reference_id: string;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  total_points: number;
  reports_submitted: number;
  cleanups_completed: number;
  badges: string[];
  transactions: PointTransaction[];
}

export interface LeaderboardItem {
  rank: number;
  region_id: string;
  region_name: string;
  region_type: string;
  score: number;
  cleanups_count: number;
  status_label: string;
}

