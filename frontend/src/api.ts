import type {
  User, Report, Cleanup, EvidenceVerificationResult,
  AdministrativeRegion, LeaderboardItem, UserStats
} from './types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('ecotrack_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('ecotrack_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('ecotrack_token');
}

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function loginUser(email: string, password: string):Promise<{ access_token: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

export async function getReports(params?: {
  status?: string;
  severity?: string;
  mine_only?: boolean;
}): Promise<Report[]> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.severity) query.append('severity', params.severity);
  if (params?.mine_only) query.append('mine_only', 'true');

  const res = await fetch(`${API_BASE}/reports?${query.toString()}`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function createReport(formData: FormData): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Report creation failed' }));
    throw new Error(err.detail || 'Report creation failed');
  }
  return res.json();
}

export async function updateReportStatus(reportId: string, status: string, assignedTo?: string): Promise<Report> {
  const res = await fetch(`${API_BASE}/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ status, assigned_to: assignedTo })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Status update failed' }));
    throw new Error(err.detail || 'Status update failed');
  }
  return res.json();
}

export async function verifyEvidence(evidenceId: string): Promise<EvidenceVerificationResult> {
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/verify`, {
    method: 'POST',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Cryptographic verification failed');
  return res.json();
}

export async function getCleanups(reportId?: string): Promise<Cleanup[]> {
  const query = reportId ? `?report_id=${encodeURIComponent(reportId)}` : '';
  const res = await fetch(`${API_BASE}/cleanups${query}`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch cleanups');
  return res.json();
}

export async function createCleanup(reportId: string): Promise<Cleanup> {
  const res = await fetch(`${API_BASE}/cleanups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ report_id: reportId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Cleanup initiation failed' }));
    throw new Error(err.detail || 'Cleanup initiation failed');
  }
  return res.json();
}

export async function submitCleanupEvidence(cleanupId: string, formData: FormData): Promise<Cleanup> {
  const res = await fetch(`${API_BASE}/cleanups/${cleanupId}/submit-evidence`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to submit cleanup evidence' }));
    throw new Error(err.detail || 'Failed to submit cleanup evidence');
  }
  return res.json();
}

export async function verifyCleanup(cleanupId: string, status: string, notes?: string): Promise<Cleanup> {
  const res = await fetch(`${API_BASE}/cleanups/${cleanupId}/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders()
    },
    body: JSON.stringify({ status, verification_notes: notes, award_points: true })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Cleanup verification failed' }));
    throw new Error(err.detail || 'Cleanup verification failed');
  }
  return res.json();
}

export async function getRegionsSummary(): Promise<AdministrativeRegion[]> {
  const res = await fetch(`${API_BASE}/scores/summary`);
  if (!res.ok) throw new Error('Failed to fetch region summaries');
  return res.json();
}

export async function getLeaderboard(): Promise<LeaderboardItem[]> {
  const res = await fetch(`${API_BASE}/scores/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export async function getMyPoints(): Promise<UserStats> {
  const res = await fetch(`${API_BASE}/points/me`, {
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error('Failed to fetch points');
  return res.json();
}

export async function getCitizensLeaderboard(): Promise<Array<{ rank: number; full_name: string; points: number; badge: string }>> {
  const res = await fetch(`${API_BASE}/points/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch citizen leaderboard');
  return res.json();
}
