# EcoTrack System Architecture

## 1. System Architecture Overview

EcoTrack is structured as a **Modular Monolith** with clear bounded contexts, allowing high cohesion and straightforward transactional integrity without distributed network overhead.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Client Presentation Tier                              │
│       React 19 + TypeScript + Vite + Tailwind CSS + Leaflet GIS OpenStreet  │
│                                                                             │
│  ┌───────────────────┐  ┌───────────────────────┐  ┌─────────────────────┐  │
│  │ WebRTC In-App     │  │ Interactive Leaflet   │  │ Multi-Role Dash-    │  │
│  │ Camera & GPS      │  │ Pin & Cluster Map     │  │ boards (4 Roles)    │  │
│  └───────────────────┘  └───────────────────────┘  └─────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / REST / Multipart Form Data
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    API Gateway & Application Tier (FastAPI)                  │
│                                                                             │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐  │
│  │ JWT Authentication & │ │ Report Lifecycle &   │ │ Crypto Evidence      │  │
│  │ Jurisdiction Guard   │ │ Duplicate Engine     │ │ Integrity Service    │  │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘  │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐  │
│  │ AI Vision Feature &  │ │ Hierarchical Clean-  │ │ Append-Only Reward   │  │
│  │ Delta Evaluator      │ │ liness Scoring Engine│ │ Ledger (Idempotent)  │  │
│  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ SQLAlchemy 2.0 ORM
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            Persistence Tier                                 │
│                                                                             │
│    SQLite (Dev / Zero-Setup)  ⇄  PostgreSQL + PostGIS (Production)          │
│    Encrypted Local Media Store (`backend/uploads/`)                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Subsystems

### 2.1 Client Tier
- **GIS Mapping Subsystem**: Leaflet map powered by OpenStreetMap tiles, rendering color-coded markers by severity and verification state.
- **Evidence Capture Subsystem**: In-app WebRTC canvas camera capturing authentic original JPEG frames directly from the hardware video stream, coupled with `navigator.geolocation`.
- **Persona Context Provider**: Manages JWT authentication and dynamic role-switched views (Citizen, Municipal Officer, Organization Rep, Admin).

### 2.2 Application / Domain Services Tier
- **`CryptoService`**: Computes SHA-256 byte digests and canonical JSON manifests signed via HMAC-SHA256 with constant-time equality comparisons (`hmac.compare_digest`).
- **`AIService`**: Evaluates image entropy, edge density, and color distributions to estimate waste classification, severity, and before-and-after cleanliness improvement deltas. Pluggable adapter pattern supports cloud multimodal models (Google Gemini Vision).
- **`ScoringService`**: Executes the deterministic cleanliness scoring formula, recalculating open penalties, age decay, and cleanup bonuses, rolling up across administrative tiers.
- **`RewardsService`**: Implements double-entry points accounting with strict database-level unique constraints on compound idempotency keys.
- **`AuditService`**: Logs all state-mutating actions to an append-only audit table.

### 2.3 Persistence Tier
- **SQLAlchemy 2.0 ORM**: Manages relational mapping with clean transactions.
- **Dual-Engine Spatial Abstraction**:
  - Development: Python-implemented spherical Haversine distance functions for SQLite.
  - Production: Native PostGIS spatial queries (`ST_DWithin`, `ST_Distance`).

---

## 3. End-to-End Data Flows

### 3.1 Pollution Reporting Flow
```
1. Citizen triggers Camera snapshot -> Image Blob + GPS coordinates captured.
2. Client sends multipart POST to /api/reports.
3. Server generates SHA-256 hash of raw bytes.
4. Server constructs canonical manifest and computes HMAC-SHA256 signature.
5. AI Service analyzes clutter and classifies waste categories.
6. Spatial engine checks for duplicate active reports within 50m.
7. Report and Evidence records inserted into DB.
8. Scoring Engine recalculates Ward cleanliness score.
```

### 3.2 Cleanup Verification & Reward Flow
```
1. Organizer accepts report and performs cleanup.
2. Organizer captures after-photo -> POST to /api/cleanups/{id}/submit-evidence.
3. AI Service compares before and after photos -> computes Cleanliness Delta.
4. Municipal Officer reviews Before & After side-by-side in Jurisdiction Hub.
5. Officer approves -> POST /api/cleanups/{id}/verify.
6. Report marked CLEANED_AND_VERIFIED.
7. Rewards Engine inserts idempotent ledger entries (+100 pts organizer, +25 pts reporter).
8. Scoring Engine updates Ward & District scores with cleanup bonus.
```

---

## 4. Key Architectural Decisions & Rationale

| Decision | Chosen Architecture | Trade-Off & Rationale |
| :--- | :--- | :--- |
| **Monolith vs Microservices** | Modular Monolith | Eliminates distributed transaction latency and network failure modes while maintaining clean domain boundaries. |
| **Evidence Authentication** | Server-Signed Manifest + Byte Hashing | Browser EXIF can be spoofed; server-issued signed manifests create an immutable chain of custody immediately upon upload. |
| **Map Rendering** | Leaflet + OpenStreetMap | Zero-cost, privacy-friendly, zero external API key requirements. |
| **AI Strategy** | Pluggable Heuristic Vision + Gemini Adapter | Ensures 100% offline functionality and zero-dependency automated testing while supporting state-of-the-art vision models. |

