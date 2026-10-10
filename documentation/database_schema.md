# EcoTrack Database Schema & Entity Relationships

## 1. Schema Overview & Relational Design

The EcoTrack relational data model is designed to support multi-scale administrative hierarchies, immutable evidence chains, role-based governance, and double-entry reward accounting.

```
                      ┌────────────────────────┐
                      │ AdministrativeRegions  │◀────────┐ (parent_id)
                      └───────────┬────────────┘         │
                                  │ 1                    │
                                  │                      │
                   ┌──────────────┼──────────────┐       │
                   │ *            │ *            │ *     │
                   ▼              ▼              ▼       │
            ┌──────────────┐ ┌─────────┐ ┌───────────────┴┐
            │Municipalities│ │ Reports │ │ScoreSnapshots  │
            └──────┬───────┘ └────┬────┘ └────────────────┘
                   │ 1            │ 1
                   │              │
                   ▼ *            ▼ *
               ┌───────┐     ┌──────────┐
               │ Users │     │ Evidence │
               └───┬───┘     └────┬─────┘
                   │ 1            │ 1
                   │              │
         ┌─────────┼──────────────┼─────────┐
         │ *       │ *            │ *       │ *
         ▼         ▼              ▼         ▼
  ┌────────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐
  │PointTrans- │ │AuditLogs│ │Cleanups │ │CleanupPartici-│
  │actions     │ └─────────┘ └─────────┘ │pants          │
  └────────────┘                         └───────────────┘
```

---

## 2. Table Specifications

### 2.1 `users`
Represents registered platform actors (Citizens, Municipal Officers, Organization Leads, Administrators).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `email` | `VARCHAR(255)` | **UNIQUE, INDEX, NOT NULL** | User login email |
| `hashed_password` | `VARCHAR(255)` | **NOT NULL** | Salted PBKDF2 hash |
| `full_name` | `VARCHAR(255)` | **NOT NULL** | Display name |
| `role` | `VARCHAR(50)` | **NOT NULL, DEFAULT 'CITIZEN'** | Role: `CITIZEN`, `MUNICIPAL`, `ORGANIZATION`, `ADMIN` |
| `cached_points` | `INTEGER` | **NOT NULL, DEFAULT 0** | Materialized balance from `point_transactions` |
| `municipality_id` | `VARCHAR(36)` | **FOREIGN KEY -> municipalities.id, NULLABLE** | Jurisdiction assignment for municipal officers |
| `organization_id` | `VARCHAR(36)` | **FOREIGN KEY -> organizations.id, NULLABLE** | Affiliation for NGO representatives |
| `account_status` | `VARCHAR(50)` | **NOT NULL, DEFAULT 'ACTIVE'** | Account state: `ACTIVE`, `SUSPENDED` |
| `created_at` | `DATETIME` | **NOT NULL** | Account creation timestamp |
| `updated_at` | `DATETIME` | **NOT NULL** | Last update timestamp |

---

### 2.2 `administrative_regions`
Defines hierarchical geographic tiers for cleanliness scoring aggregation.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `code` | `VARCHAR(50)` | **UNIQUE, INDEX, NOT NULL** | Standardized code: `IND`, `IND-MH`, `IND-MH-NGP`, `IND-MH-NGP-W12` |
| `name` | `VARCHAR(255)` | **NOT NULL** | Administrative unit name |
| `region_type` | `VARCHAR(50)` | **NOT NULL** | `COUNTRY`, `STATE`, `DISTRICT`, `TALUKA`, `WARD`, `GRID` |
| `parent_id` | `VARCHAR(36)` | **FOREIGN KEY -> administrative_regions.id, NULLABLE** | Parent administrative tier |
| `center_lat` | `FLOAT` | **NOT NULL** | Geographic centroid latitude |
| `center_lng` | `FLOAT` | **NOT NULL** | Geographic centroid longitude |
| `cleanliness_score`| `FLOAT` | **NOT NULL, DEFAULT 100.0** | Current cleanliness index (0–100) |
| `population` | `INTEGER` | **NOT NULL, DEFAULT 50000** | Population used for weighted score rollup |
| `area_sq_km` | `FLOAT` | **NOT NULL, DEFAULT 10.0** | Geographic area in square kilometers |
| `created_at` | `DATETIME` | **NOT NULL** | Creation timestamp |
| `updated_at` | `DATETIME` | **NOT NULL** | Last update timestamp |

---

### 2.3 `municipalities`
Represents official local governing authorities holding geographic jurisdiction.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `name` | `VARCHAR(255)` | **NOT NULL** | Official authority name |
| `official_email` | `VARCHAR(255)` | **NOT NULL** | Government domain email |
| `administrative_region_id` | `VARCHAR(36)` | **FOREIGN KEY -> administrative_regions.id, NOT NULL** | Governed territory |
| `verification_status` | `VARCHAR(50)` | **NOT NULL, DEFAULT 'VERIFIED'** | `VERIFIED`, `PENDING` |
| `created_at` | `DATETIME` | **NOT NULL** | Creation timestamp |

---

### 2.4 `reports`
Tracks reported land pollution incidents throughout their lifecycle.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `reporter_id` | `VARCHAR(36)` | **FOREIGN KEY -> users.id, NOT NULL** | Submitting citizen |
| `administrative_region_id` | `VARCHAR(36)` | **FOREIGN KEY -> administrative_regions.id, NOT NULL** | Assigned Ward/Village |
| `municipality_id` | `VARCHAR(36)` | **FOREIGN KEY -> municipalities.id, NULLABLE** | Governing municipality |
| `latitude` | `FLOAT` | **NOT NULL** | Captured GPS latitude |
| `longitude` | `FLOAT` | **NOT NULL** | Captured GPS longitude |
| `address` | `VARCHAR(500)` | **NOT NULL** | Street address or landmark |
| `location_accuracy`| `FLOAT` | **NOT NULL, DEFAULT 5.0** | Device GPS accuracy radius (meters) |
| `description` | `TEXT` | **NOT NULL** | Incident description |
| `waste_categories`| `TEXT` | **NOT NULL, DEFAULT '[]'** | JSON array of detected categories |
| `severity` | `VARCHAR(50)` | **NOT NULL, DEFAULT 'MEDIUM'** | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `status` | `VARCHAR(50)` | **NOT NULL, DEFAULT 'REPORTED'** | State machine status |
| `ai_confidence` | `FLOAT` | **NOT NULL, DEFAULT 0.0** | AI classification confidence score |
| `ai_metadata` | `TEXT` | **NOT NULL, DEFAULT '{}'** | Serialized CV feature analysis |
| `is_duplicate` | `BOOLEAN` | **NOT NULL, DEFAULT FALSE** | Spatial duplicate flag (<50m) |
| `duplicate_of_id` | `VARCHAR(36)` | **FOREIGN KEY -> reports.id, NULLABLE** | Target report if duplicate |
| `assigned_to` | `VARCHAR(255)` | **NULLABLE** | Assigned sanitation unit |
| `created_at` | `DATETIME` | **NOT NULL** | Submission timestamp |
| `updated_at` | `DATETIME` | **NOT NULL** | Modification timestamp |
| `resolved_at` | `DATETIME` | **NULLABLE** | Cleanup verification timestamp |

---

### 2.5 `evidence`
Stores immutable evidence photographs, cryptographic hashes, and server-signed manifests.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `report_id` | `VARCHAR(36)` | **FOREIGN KEY -> reports.id, NOT NULL** | Associated pollution report |
| `cleanup_id` | `VARCHAR(36)` | **NULLABLE** | Associated cleanup drive |
| `uploaded_by_id` | `VARCHAR(36)` | **FOREIGN KEY -> users.id, NOT NULL** | Submitting user |
| `evidence_type` | `VARCHAR(50)` | **NOT NULL** | `BEFORE_POLLUTION`, `AFTER_CLEANUP` |
| `file_url` | `VARCHAR(500)` | **NOT NULL** | Relative storage path |
| `sha256_hash` | `VARCHAR(64)` | **INDEX, NOT NULL** | Cryptographic SHA-256 byte digest |
| `signed_manifest` | `TEXT` | **NOT NULL** | Canonical JSON manifest payload |
| `manifest_signature`| `VARCHAR(255)` | **NOT NULL** | Server-signed HMAC-SHA256 signature |
| `capture_timestamp`| `DATETIME` | **NOT NULL** | Recorded capture time |
| `latitude` | `FLOAT` | **NOT NULL** | Verified GPS latitude |
| `longitude` | `FLOAT` | **NOT NULL** | Verified GPS longitude |
| `location_accuracy`| `FLOAT` | **NOT NULL** | Accuracy in meters |
| `capture_method` | `VARCHAR(50)` | **NOT NULL** | `IN_APP_CAMERA`, `FILE_UPLOAD` |
| `verification_status`| `VARCHAR(50)`| **NOT NULL, DEFAULT 'VALID'** | `VALID`, `TAMPERED`, `SUSPICIOUS` |
| `signature_valid` | `BOOLEAN` | **NOT NULL, DEFAULT TRUE** | Cryptographic signature validity |
| `hash_verified` | `BOOLEAN` | **NOT NULL, DEFAULT TRUE** | Byte hash verification status |
| `created_at` | `DATETIME` | **NOT NULL** | Registration timestamp |

---

### 2.6 `cleanups`
Connects pollution reports to before-and-after evidence pairs and verification outcomes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `report_id` | `VARCHAR(36)` | **FOREIGN KEY -> reports.id, NOT NULL** | Cleaned report |
| `organizer_id` | `VARCHAR(36)` | **FOREIGN KEY -> users.id, NOT NULL** | Cleanup lead user |
| `organization_id` | `VARCHAR(36)` | **FOREIGN KEY -> organizations.id, NULLABLE** | Organizing NGO |
| `municipality_id` | `VARCHAR(36)` | **FOREIGN KEY -> municipalities.id, NULLABLE** | Overseeing municipality |
| `before_evidence_id`| `VARCHAR(36)`| **FOREIGN KEY -> evidence.id, NOT NULL** | Before evidence reference |
| `after_evidence_id`| `VARCHAR(36)` | **FOREIGN KEY -> evidence.id, NULLABLE** | After cleanup evidence reference |
| `status` | `VARCHAR(50)` | **NOT NULL, DEFAULT 'SUBMITTED'** | `IN_PROGRESS`, `SUBMITTED`, `VERIFIED`, `REJECTED` |
| `ai_cleanliness_delta`| `FLOAT` | **NOT NULL, DEFAULT 0.0** | AI-computed clutter reduction (0.0–1.0) |
| `verification_notes`| `TEXT` | **NULLABLE** | Officer inspection notes |
| `verified_by_id` | `VARCHAR(36)` | **FOREIGN KEY -> users.id, NULLABLE** | Verifying official |
| `completed_at` | `DATETIME` | **NULLABLE** | Cleanup drive completion time |
| `verified_at` | `DATETIME` | **NULLABLE** | Official verification time |
| `created_at` | `DATETIME` | **NOT NULL** | Creation timestamp |
| `updated_at` | `DATETIME` | **NOT NULL** | Update timestamp |

---

### 2.7 `point_transactions`
Tamper-proof, append-only double-entry ledger for points accounting.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `user_id` | `VARCHAR(36)` | **FOREIGN KEY -> users.id, INDEX, NOT NULL** | Recipient or debited user |
| `points_delta` | `INTEGER` | **NOT NULL** | Positive (reward) or negative (reversal) |
| `reason` | `VARCHAR(255)` | **NOT NULL** | Audit justification |
| `reference_type` | `VARCHAR(50)` | **NOT NULL** | `REPORT_VERIFIED`, `CLEANUP_VERIFIED`, `REVERSAL` |
| `reference_id` | `VARCHAR(36)` | **NOT NULL** | ID of report or cleanup |
| `idempotency_key` | `VARCHAR(255)` | **UNIQUE, INDEX, NOT NULL** | Anti-double-spending compound key |
| `created_at` | `DATETIME` | **NOT NULL** | Immutable transaction timestamp |

**Table Constraints**:
- `UniqueConstraint('reference_type', 'reference_id', 'user_id', name='uq_user_reference_award')`

---

### 2.8 `audit_logs`
Forensic compliance and audit log tracking all state-mutating actions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `actor_id` | `VARCHAR(36)` | **FOREIGN KEY -> users.id, NULLABLE** | Performing user (null for system events) |
| `entity_name` | `VARCHAR(100)`| **NOT NULL** | Target model: `Report`, `Evidence`, `Cleanup`, `User` |
| `entity_id` | `VARCHAR(36)` | **NOT NULL** | Target record primary key |
| `action` | `VARCHAR(100)`| **NOT NULL** | `REPORT_CREATED`, `STATUS_UPDATED`, `EVIDENCE_VERIFIED` |
| `payload` | `TEXT` | **NOT NULL, DEFAULT '{}'** | Serialized change context |
| `timestamp` | `DATETIME` | **NOT NULL** | Action timestamp |

---

### 2.9 `score_snapshots`
Historical record of regional cleanliness score calculations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(36)` | **PRIMARY KEY** | UUID primary key |
| `administrative_region_id` | `VARCHAR(36)` | **FOREIGN KEY -> administrative_regions.id, NOT NULL** | Region |
| `score` | `FLOAT` | **NOT NULL** | Calculated cleanliness index |
| `active_reports_count` | `INTEGER` | **NOT NULL** | Open incidents at time of calculation |
| `verified_cleanups_count`| `INTEGER` | **NOT NULL** | Verified cleanups in 90-day window |
| `penalty_score` | `FLOAT` | **NOT NULL** | Total raw penalty applied |
| `bonus_score` | `FLOAT` | **NOT NULL** | Total bonus credited |
| `calculated_at` | `DATETIME` | **NOT NULL** | Calculation timestamp |

---

## 3. Migration Strategy (Alembic)

For production migration from SQLite to PostgreSQL + PostGIS:
1. Initialize Alembic: `alembic init alembic`
2. Update `alembic/env.py` to bind with `app.models.Base.metadata`.
3. Set `DATABASE_URL` in environment.
4. Generate autocommit migration: `alembic revision --autogenerate -m "Initial EcoTrack Schema"`.
5. Apply migration: `alembic upgrade head`.

