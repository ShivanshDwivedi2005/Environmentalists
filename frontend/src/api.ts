import type {
  AdministrativeRegion,
  Cleanup,
  CleanupBid,
  CleanupFundingSummary,
  EvidenceVerificationResult,
  LeaderboardItem,
  LocationResolution,
  MunicipalEmployeeInvite,
  MunicipalNotification,
  Municipality,
  Report,
  User,
  UserStats,
} from './types';

const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE = (configuredBase || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function errorDetail(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object' || !('detail' in payload)) return fallback;
  const detail = (payload as { detail: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : String(item)))
      .join(', ');
  }
  return fallback;
}

async function apiRequest<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(authenticated ? authHeaders() : {}),
      ...init.headers,
    },
  });

  if (response.status === 401 && authenticated) removeAuthToken();
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(errorDetail(payload, `Request failed (${response.status})`), response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function assetUrl(path?: string | null): string {
  if (!path || /^https?:\/\//.test(path) || !configuredBase) return path || '';
  return new URL(path, new URL(configuredBase).origin).toString();
}

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const data = await apiRequest<{ access_token: string; user: User }>(
    '/auth/login',
    jsonRequest('POST', { email, password }),
  );
  setAuthToken(data.access_token);
  return data;
}

export function registerUser(input: {
  email: string;
  password: string;
  full_name: string;
  role?: 'CITIZEN' | 'ORGANIZATION';
}): Promise<User> {
  return apiRequest('/auth/register', jsonRequest('POST', { ...input, role: input.role || 'CITIZEN' }));
}

export function registerMunicipalEmployee(input: {
  municipality_id: string;
  employee_id: string;
  email: string;
  password: string;
  full_name: string;
}): Promise<User> {
  return apiRequest('/auth/register-municipal-employee', jsonRequest('POST', input));
}

export function getMe(): Promise<User> {
  return apiRequest('/auth/me', {}, true);
}

export function getReports(params?: {
  status?: string;
  severity?: string;
  region_id?: string;
  mine_only?: boolean;
  include_eliminated?: boolean;
}): Promise<Report[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.severity) query.set('severity', params.severity);
  if (params?.region_id) query.set('region_id', params.region_id);
  if (params?.mine_only) query.set('mine_only', 'true');
  if (params?.include_eliminated) query.set('include_eliminated', 'true');
  const suffix = query.size ? `?${query}` : '';
  return apiRequest(`/reports${suffix}`, {}, true);
}

export function createReport(formData: FormData): Promise<Report> {
  return apiRequest('/reports', { method: 'POST', body: formData }, true);
}

export function updateReportStatus(reportId: string, status: string, assignedTo?: string): Promise<Report> {
  return apiRequest(`/reports/${reportId}/status`, jsonRequest('PATCH', { status, assigned_to: assignedTo }), true);
}

export function verifyEvidence(evidenceId: string): Promise<EvidenceVerificationResult> {
  return apiRequest(`/evidence/${evidenceId}/verify`, { method: 'POST' }, true);
}

export function getCleanups(reportId?: string): Promise<Cleanup[]> {
  return apiRequest(`/cleanups${reportId ? `?report_id=${encodeURIComponent(reportId)}` : ''}`, {}, true);
}

export function createCleanup(reportId: string): Promise<Cleanup> {
  return apiRequest('/cleanups', jsonRequest('POST', { report_id: reportId }), true);
}

export function submitCleanupEvidence(cleanupId: string, formData: FormData): Promise<Cleanup> {
  return apiRequest(`/cleanups/${cleanupId}/submit-evidence`, { method: 'POST', body: formData }, true);
}

export function verifyCleanup(cleanupId: string, status: 'VERIFIED' | 'REJECTED', notes?: string): Promise<Cleanup> {
  return apiRequest(
    `/cleanups/${cleanupId}/verify`,
    jsonRequest('POST', { status, verification_notes: notes, award_points: true }),
    true,
  );
}

export function getCleanupFunding(reportId: string): Promise<CleanupFundingSummary> {
  return apiRequest(`/reports/${reportId}/bids`, {}, true);
}

export function placeCleanupBid(reportId: string, input: {
  amount: number;
  message?: string;
  contact_email?: string;
  contact_phone?: string;
}): Promise<CleanupBid> {
  return apiRequest(`/reports/${reportId}/bids`, jsonRequest('POST', input), true);
}

export function getMunicipalities(regionId?: string): Promise<Municipality[]> {
  return apiRequest(`/municipalities${regionId ? `?region_id=${encodeURIComponent(regionId)}` : ''}`);
}

export function resolveDeviceLocation(input: {
  latitude: number;
  longitude: number;
  accuracy?: number;
}): Promise<LocationResolution> {
  return apiRequest('/locations/resolve', jsonRequest('POST', input), true);
}

export function getMunicipalTaggedReports(): Promise<Report[]> {
  return apiRequest('/municipal/tagged-reports', {}, true);
}

export function getMunicipalNotifications(unreadOnly = false): Promise<MunicipalNotification[]> {
  return apiRequest(`/municipal/notifications${unreadOnly ? '?unread_only=true' : ''}`, {}, true);
}

export function acknowledgeMunicipalNotification(notificationId: string): Promise<MunicipalNotification> {
  return apiRequest(`/municipal/notifications/${notificationId}/read`, { method: 'PATCH' }, true);
}

export function getMunicipalEmployees(): Promise<MunicipalEmployeeInvite[]> {
  return apiRequest('/municipal/employees', {}, true);
}

export function inviteMunicipalEmployee(input: {
  employee_id: string;
  email: string;
  full_name?: string;
}): Promise<MunicipalEmployeeInvite> {
  return apiRequest('/municipal/employees', jsonRequest('POST', input), true);
}

export function getRegionsSummary(): Promise<AdministrativeRegion[]> {
  return apiRequest('/scores/summary');
}

export function getLeaderboard(): Promise<LeaderboardItem[]> {
  return apiRequest('/scores/leaderboard');
}

export function getMyPoints(): Promise<UserStats> {
  return apiRequest('/points/me', {}, true);
}

export function getCitizensLeaderboard(): Promise<Array<{
  rank: number;
  user_id: string;
  full_name: string;
  points: number;
  badge: string;
}>> {
  return apiRequest('/points/leaderboard');
}
