# EcoTrack RESTful API Documentation

All API routes are served under the prefix `/api`.
Interactive OpenAPI documentation is available locally at `http://127.0.0.1:8000/docs`.

---

## 1. Authentication & User Identity (`/api/auth`)

### 1.1 Register User
- **Method**: `POST`
- **Path**: `/api/auth/register`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "Rohan Deshmukh",
  "role": "CITIZEN",
  "municipality_id": null,
  "organization_id": null
}
```
- **Response** (`200 OK`):
```json
{
  "id": "3b29...",
  "email": "user@example.com",
  "full_name": "Rohan Deshmukh",
  "role": "CITIZEN",
  "cached_points": 0,
  "account_status": "ACTIVE",
  "created_at": "2026-10-09T08:00:00Z"
}
```

### 1.2 User Login
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "citizen@ecotrack.org",
  "password": "password123"
}
```
- **Response** (`200 OK`):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "email": "citizen@ecotrack.org",
    "role": "CITIZEN",
    "cached_points": 50
  }
}
```

### 1.3 Get Current User Profile
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response** (`200 OK`): Returns `UserOut` profile.

---

## 2. Pollution Reporting (`/api/reports`)

### 2.1 List Pollution Reports
- **Method**: `GET`
- **Path**: `/api/reports`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Query Parameters**:
  - `status` (*optional*): e.g., `VERIFIED`, `ASSIGNED`, `CLEANED_AND_VERIFIED`
  - `severity` (*optional*): e.g., `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
  - `mine_only` (*optional, boolean*): `true` to view only current user's reports.
- **Jurisdiction Behavior**: When invoked by a `MUNICIPAL` user, returns only incidents located within their assigned municipality.

### 2.2 Submit Pollution Incident Report
- **Method**: `POST`
- **Path**: `/api/reports`
- **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
- **Form Fields**:
  - `file`: Raw image binary file (`image/jpeg` or `image/png`)
  - `latitude`: `21.1466`
  - `longitude`: `79.0825`
  - `location_accuracy`: `4.5`
  - `address`: `"Sitabuldi Main Market Square, Ward 12, Nagpur"`
  - `description`: `"Accumulated plastic bottles and roadside waste overflow."`
  - `waste_categories_raw`: `'["Plastic Waste", "Mixed Household Garbage"]'`
  - `capture_method`: `"IN_APP_CAMERA"` or `"FILE_UPLOAD"`
- **Response** (`200 OK`):
```json
{
  "id": "rep-uuid-1",
  "reporter_id": "usr-uuid-2",
  "administrative_region_id": "reg-uuid-3",
  "region_name": "Ward 12 - Sitabuldi Central",
  "latitude": 21.1466,
  "longitude": 79.0825,
  "address": "Sitabuldi Main Market Square...",
  "waste_categories": ["Plastic Waste", "Mixed Household Garbage"],
  "severity": "HIGH",
  "status": "VERIFIED",
  "ai_confidence": 0.88,
  "is_duplicate": false,
  "evidence": [
    {
      "id": "ev-uuid-4",
      "sha256_hash": "4a7d...31b2",
      "manifest_signature": "e81f...90a4",
      "file_url": "/uploads/rep_uuid_1.jpg",
      "verification_status": "VALID"
    }
  ]
}
```

### 2.3 Update Report Status
- **Method**: `PATCH`
- **Path**: `/api/reports/{id}/status`
- **Headers**: `Authorization: Bearer <TOKEN>` (Requires `MUNICIPAL` or `ADMIN`)
- **Request Body**:
```json
{
  "status": "ASSIGNED",
  "assigned_to": "NMC Sanitation Rapid Response Team"
}
```

---

## 3. Cryptographic Evidence Forensics (`/api/evidence`)

### 3.1 Live Forensic Verification
- **Method**: `POST`
- **Path**: `/api/evidence/{id}/verify`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Description**: Reads stored disk bytes, recalculates SHA-256 digest, verifies HMAC-SHA256 signature, and checks for tampering.
- **Response** (`200 OK`):
```json
{
  "evidence_id": "ev-uuid-4",
  "original_sha256": "4a7d...31b2",
  "computed_sha256": "4a7d...31b2",
  "hash_matches": true,
  "signature_valid": true,
  "tamper_detected": false,
  "manifest": {
    "version": "1.0",
    "report_id": "rep-uuid-1",
    "coordinates": { "latitude": 21.1466, "longitude": 79.0825, "accuracy_meters": 4.5 },
    "capture_method": "IN_APP_CAMERA"
  },
  "details": "Evidence verified authentic."
}
```

---

## 4. Cleanup Drives & Verification (`/api/cleanups`)

### 4.1 Initiate Cleanup Drive
- **Method**: `POST`
- **Path**: `/api/cleanups`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
```json
{
  "report_id": "rep-uuid-1"
}
```

### 4.2 Submit After-Cleaning Evidence
- **Method**: `POST`
- **Path**: `/api/cleanups/{id}/submit-evidence`
- **Headers**: `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
- **Form Fields**:
  - `file`: After photograph binary
  - `latitude`: `21.1466`
  - `longitude`: `79.0825`
  - `capture_method`: `"IN_APP_CAMERA"`
- **Response** (`200 OK`): Computes SHA-256, signs manifest, and runs AI Before/After clutter reduction returning `ai_cleanliness_delta` (e.g., `0.85`).

### 4.3 Official Verification
- **Method**: `POST`
- **Path**: `/api/cleanups/{id}/verify`
- **Headers**: `Authorization: Bearer <TOKEN>` (Requires `MUNICIPAL` or `ADMIN`)
- **Request Body**:
```json
{
  "status": "VERIFIED",
  "verification_notes": "Officer inspected site. Garbage fully cleared and sanitized.",
  "award_points": true
}
```
- **Side Effects**:
  - Updates report status to `CLEANED_AND_VERIFIED`.
  - Idempotently releases **+100 Points** to cleanup organizer.
  - Idempotently releases **+25 Points** to original reporter.
  - Recalculates area cleanliness scores.

---

## 5. Hierarchical Cleanliness Scores (`/api/scores`)

### 5.1 Get Region Summaries
- **Method**: `GET`
- **Path**: `/api/scores/summary`
- **Access**: Public
- **Response**: Array of all regions with their current `cleanliness_score` (0–100).

### 5.2 Regional Leaderboard
- **Method**: `GET`
- **Path**: `/api/scores/leaderboard`
- **Access**: Public
- **Response**: Ranked regions with verified cleanups count and civic status labels.

---

## 6. Rewards & Gamification (`/api/points`)

### 6.1 Get Personal Rewards Ledger
- **Method**: `GET`
- **Path**: `/api/points/me`
- **Headers**: `Authorization: Bearer <TOKEN>`
- **Response**: Total points, badges array, and append-only transaction ledger rows.

### 6.2 Top Citizens Leaderboard
- **Method**: `GET`
- **Path**: `/api/points/leaderboard`
- **Access**: Public
- **Response**: Top 10 citizens ranked by verified points.

---

## 7. Administrative Oversight (`/api/admin`)

### 7.1 View Forensic Audit Logs
- **Method**: `GET`
- **Path**: `/api/admin/audit-logs`
- **Headers**: `Authorization: Bearer <TOKEN>` (Requires `ADMIN` or `MUNICIPAL`)
- **Response**: List of immutable audit entries with actor, entity, action, and payload.

