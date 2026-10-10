# EcoTrack Implementation Plan & Roadmap

## 1. Phased Development Roadmap

EcoTrack is structured across six systematic implementation phases:

```
[Phase 1: Architecture & Data Modeling]  ──▶  COMPLETED ✅
[Phase 2: Core Platform, RBAC & API]     ──▶  COMPLETED ✅
[Phase 3: Evidence & Cleanup Workflows]  ──▶  COMPLETED ✅
[Phase 4: AI Assessment & Scoring]       ──▶  COMPLETED ✅
[Phase 5: Gamification & Dashboards]     ──▶  COMPLETED ✅
[Phase 6: Production Hardening & Escrow] ──▶  PLANNED / IN PROGRESS 🔄
```

---

## 2. Milestone & Task Breakdown

### Phase 1: Requirements, Data Modeling & Foundation
- [x] Analyze problem statement and document anti-reporting bias formulation.
- [x] Design normalized relational schema (10 entities).
- [x] Establish backend project structure with FastAPI and SQLAlchemy 2.0.
- [x] Configure SQLite dev database with spatial Haversine distance functions.
- [x] Implement database seeding script (`backend/seed_data.py`) with hierarchical regions (India -> Maharashtra -> Nagpur -> Wards) and demo users.

### Phase 2: Core Platform, Security & API Gateway
- [x] Implement salted PBKDF2 password hashing and JWT token generator.
- [x] Build role-based access control middleware for `CITIZEN`, `MUNICIPAL`, `ORGANIZATION`, and `ADMIN`.
- [x] Implement municipal jurisdiction isolation (officers restricted to assigned municipality).
- [x] Create report submission endpoint with file upload and metadata validation.
- [x] Implement spatial duplicate detection engine (<50 meters radius).

### Phase 3: Evidence Cryptography & Cleanup Workflows
- [x] Build `CryptoService` calculating raw byte SHA-256 digests.
- [x] Implement canonical JSON manifest serializer and HMAC-SHA256 signature generator.
- [x] Create forensic verification endpoint (`/api/evidence/{id}/verify`) with bit-level tamper detection.
- [x] Implement cleanup creation linked to existing report.
- [x] Build after-cleanup evidence submission with Before/After image association.
- [x] Build municipal officer verification queue with status transitions to `CLEANED_AND_VERIFIED`.

### Phase 4: AI Vision & Hierarchical Scoring Engine
- [x] Implement local computer vision feature extraction (edge density, color variance, entropy).
- [x] Build AI waste categorization (Plastics, Construction Debris, Organic, Mixed Garbage).
- [x] Implement AI before-and-after cleanliness delta comparison (clutter reduction).
- [x] Formulate and code deterministic hierarchical cleanliness scoring algorithm.
- [x] Implement multi-tier rollup (Ward -> District -> State -> Country) weighted by population and area.
- [x] Implement regional leaderboard endpoint with civic benchmark labels.

### Phase 5: Gamification & Modern Web Interface
- [x] Implement append-only double-entry points ledger (`point_transactions`).
- [x] Enforce database-level idempotency to prevent reward farming.
- [x] Scaffold Vite + React 19 + TypeScript + Tailwind CSS frontend.
- [x] Build interactive Leaflet GIS map with custom severity pins and popups.
- [x] Implement in-app WebRTC camera viewfinder with high-accuracy GPS capture.
- [x] Build 1-click persona switcher across all 4 demo user roles.
- [x] Build municipal jurisdiction dashboard with Before/After review.
- [x] Build regional cleanliness scoreboard and citizen points ledger.
- [x] Write automated Pytest suite (6 integration tests, 100% passing).

### Phase 6: Production Hardening, Escrow & Crowdfunding (Planned)
- [ ] Implement Razorpay / Stripe server-side webhook signature verification.
- [ ] Add Crowdfunding campaigns module (`crowdfunding_campaigns` and `donations`).
- [ ] Implement paid cleanup tasks escrow release lifecycle (`PROPOSED -> FUNDED -> SETTLED`).
- [ ] Docker containerization (`docker-compose.yml` for FastAPI, PostgreSQL/PostGIS, Nginx).
- [ ] Rate limiting and file size/type sanitization middleware.

---

## 3. Dependency & Risk Management

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Tampered / Fake Cleanups** | High | Requiring cryptographic manifests, GPS accuracy checks, and AI Before/After clutter delta validation. |
| **Duplicate Reward Farming** | Critical | Enforcing unique composite database constraint `(reference_type, reference_id, user_id)`. |
| **Municipal Data Leakage** | High | RBAC middleware strictly matching user's `municipality_id` with incident coordinates. |
| **AI False Positives** | Medium | Treating AI outputs as preliminary estimates with explicit confidence scores; flagging $<0.65$ for manual review. |

