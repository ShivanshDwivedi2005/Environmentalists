# EcoTrack System Requirements & Specifications

## 1. Project Goal & Scope

EcoTrack is a full-stack, data-driven environmental accountability platform designed to monitor, report, verify, and resolve land pollution incidents across hierarchical administrative regions.

---

## 2. User Roles & Capabilities

### 2.1 Citizen
- Register and log in securely via JWT.
- Capture authentic pollution photos using the in-app WebRTC camera or file upload.
- Automatically capture GPS coordinates, accuracy radius, and client timestamps.
- View real-time interactive GIS map of pollution incidents.
- Track status of submitted reports.
- Initiate community cleanup drives and upload after-cleaning evidence.
- Earn verified civic points and badges recorded in an immutable ledger.

### 2.2 Municipal Authority
- Access reports strictly within assigned municipal jurisdiction (e.g., Nagpur Municipal Corporation).
- Assign sanitation rapid response teams or contracted crews to active incidents.
- Update report statuses (`ASSIGNED`, `CLEANING_IN_PROGRESS`, `REJECTED`).
- Review submitted cleanups using side-by-side Before/After evidence and AI cleanliness delta.
- Officially verify cleanups to trigger automated reward points release.
- Monitor ward-level and district-level cleanliness scores.

### 2.3 Environmental Cleanup Organizations (NGOs)
- Register verified organization profiles.
- Discover high-severity pollution reports and organize volunteer cleanups.
- Submit before-and-after evidence.
- Receive performance ratings and cleanups count statistics.

### 2.4 Platform Administrator
- Global oversight across all administrative regions.
- View system-wide forensic audit logs.
- Recompute regional cleanliness scores on demand.
- Manage user privileges and resolve disputes.

---

## 3. Functional Requirements (FR)

### FR-1: Authentication & Role-Based Authorization
- **FR-1.1**: Secure user registration and login using salted PBKDF2 password hashing.
- **FR-1.2**: Role-based access control across `CITIZEN`, `MUNICIPAL`, `ORGANIZATION`, and `ADMIN`.
- **FR-1.3**: Municipal user operations must be scoped strictly to their assigned municipality.

### FR-2: Incident Reporting & Geolocation
- **FR-2.1**: In-app camera integration capturing uncompressed image frames via HTML5 WebRTC.
- **FR-2.2**: Automated GPS coordinate acquisition (`latitude`, `longitude`, `accuracy`).
- **FR-2.3**: Multi-select waste categorization (`Plastic Waste`, `Construction Debris`, `Organic Waste`, `Mixed Garbage`).
- **FR-2.4**: Spatial duplicate detection identifying open reports within a 50-meter radius submitted within the last 14 days.

### FR-3: Cryptographic Evidence Integrity
- **FR-3.1**: Compute SHA-256 digest of original raw image bytes.
- **FR-3.2**: Assemble a canonical JSON manifest containing image hash, report ID, GPS coordinates, accuracy, capture timestamp, and user ID.
- **FR-3.3**: Sign the canonical manifest using server-side HMAC-SHA256.
- **FR-3.4**: Expose a forensic verification endpoint (`/api/evidence/{id}/verify`) that re-verifies stored bytes against the signed manifest.

### FR-4: AI-Assisted Waste Assessment
- **FR-4.1**: Analyze image texture, color variance, entropy, and edge clutter to estimate waste types and severity.
- **FR-4.2**: Generate confidence score and flag low-confidence reports (<0.65) for manual triage.
- **FR-4.3**: Compare Before and After cleanup images to calculate an AI cleanliness improvement delta.

### FR-5: Cleanup Workflow & Official Verification
- **FR-5.1**: Link cleanup initiatives to original verified pollution reports.
- **FR-5.2**: Capture after-cleanup photograph with SHA-256 digest and signed manifest.
- **FR-5.3**: Municipal officer verification approving or rejecting cleanup.
- **FR-5.4**: Official approval transitions report to `CLEANED_AND_VERIFIED`.

### FR-6: Hierarchical Cleanliness Scoring Engine
- **FR-6.1**: Maintain geographic tree: `Country -> State -> District -> Wards`.
- **FR-6.2**: Calculate base ward cleanliness score using severity weights, open report count, age decay, and cleanup bonuses.
- **FR-6.3**: Aggregate higher-tier scores using population and geographic area weights.

### FR-7: Gamification & Points Ledger
- **FR-7.1**: Append-only double-entry ledger (`point_transactions`).
- **FR-7.2**: Award +25 points for verified report, +100 points for verified cleanup.
- **FR-7.3**: Enforce idempotency using compound key `reference_type:reference_id:user_id`.

### FR-8: Audit Logging
- **FR-8.1**: Record immutable audit logs for all security, status change, and verification events.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance & Response Time
- API read requests must respond within 150ms.
- Image hashing and manifest signing must execute in $< 50$ms.
- Client-side GIS map rendering must support up to 1,000 markers without UI degradation.

### NFR-2: Security & Privacy
- Zero leakage of signing keys or backend secrets to frontend clients.
- JWT tokens signed with HS256 and configured expiration.
- Input validation on all form fields and uploaded file MIME types.

### NFR-3: Reliability & Data Integrity
- Database operations involving status updates and points awards must run within atomic ACID transactions.
- Zero duplicate point awards permitted under network retries.

### NFR-4: Portability
- Runs out-of-the-box locally using SQLite with custom spatial calculation.
- Production migration ready for PostgreSQL + PostGIS via environment variable `DATABASE_URL`.

---

## 5. Acceptance Criteria Checklist

- [x] Citizen can register, log in, and capture an authentic pollution report.
- [x] In-app camera and GPS accuracy radius operate directly in browser.
- [x] Every report receives a SHA-256 hash and server-signed canonical HMAC manifest.
- [x] Reports within 50m of an existing active incident are flagged as duplicates.
- [x] Municipal authority can view only reports within their jurisdiction.
- [x] Cleanup can be created, after-evidence submitted, and AI delta evaluated.
- [x] Official verification updates report to `CLEANED_AND_VERIFIED`.
- [x] Points are awarded idempotently (+100 for cleanup, +25 for report).
- [x] Regional cleanliness scores recompute hierarchically across Wards and Districts.
- [x] Pytest suite passes 100% of test cases.

