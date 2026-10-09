# EcoTrack 🌿

> **AI-Powered Land Pollution Reporting, Cryptographic Cleanup Verification, and Community Accountability Platform**

EcoTrack turns land pollution reporting into a complete, tamper-proof accountability cycle: **Report → Verify Evidence → Notify Responsible Authority → Organize Cleanup Drive → AI & Authority Verification → Award Immutable Points & Recompute Regional Cleanliness Scores**.

---

## 🚀 Live Demo & Prototype Access

The application is running live locally:
- **Web Application**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **FastAPI Interactive Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Backend API Root**: [http://127.0.0.1:8000/api](http://127.0.0.1:8000/api)

---

## 👥 Demo Personas (Pre-configured)

Use the 1-click **Persona Switcher** in the top navigation bar, or log in with password `password123`:

| Role | Name | Email | Jurisdiction / Scope |
| :--- | :--- | :--- | :--- |
| **Citizen** | Priya Sharma | `citizen@ecotrack.org` | Reports incidents, submits cleanups, earns points |
| **Municipal Authority** | Rajesh Patil | `officer@nmc.gov.in` | Scoped to Nagpur Municipal Corporation (NMC) jurisdiction |
| **Organization (NGO)** | Arun Kumar | `ngo@greenearth.org` | Green Earth Foundation cleanup drives |
| **Platform Admin** | EcoTrack Admin | `admin@ecotrack.org` | Global system oversight, audit logs, and score recalculation |

---

## ✨ Key Features in This Prototype

### 1. In-App Camera & Evidence Capture
- Real-time WebRTC camera viewfinder (`navigator.mediaDevices.getUserMedia`) taking authentic snapshots directly in browser.
- High-accuracy GPS geolocation with accuracy radius logging.
- AI-assisted preliminary feature extraction identifying waste categories (`Plastic Waste`, `Construction Debris`, `Organic / Wet Waste`, `Mixed Household Garbage`).

### 2. Cryptographic Evidence Integrity & Forensics
- **Byte Hashing**: Computes a SHA-256 digest of original raw photo bytes immediately upon receipt.
- **Signed Manifest**: Server signs a canonical manifest containing GPS coordinates, capture timestamp, and device method using HMAC-SHA256.
- **Forensic Inspector**: Any citizen or officer can click **"Verify SHA-256"** or visit the **Crypto Inspector** tab to run live bit-level tamper detection checks.

### 3. Spatial Duplicate Detection
- Spatial engine checks for existing active reports within 50 meters submitted within the last 14 days, preventing duplicate report flooding and score manipulation.

### 4. Municipal Jurisdiction Isolation & Verification Queue
- Municipal officers are restricted strictly to their administrative boundaries (`Nagpur Municipal Corporation`).
- Side-by-side Before & After cleanup photo inspector with AI visual cleanliness delta calculation (e.g. +85% improvement).
- 1-click official verification button that updates incident status and triggers reward release.

### 5. Hierarchical Cleanliness Scoring Engine
- Deterministic formula aggregating:
  $$\text{Country (India)} \to \text{State (Maharashtra)} \to \text{District (Nagpur)} \to \text{Wards (Sitabuldi, Dharampeth, Civil Lines)}$$
- Penalizes unresolved reports with an **Age Decay factor** ($1.0 + \min(1.0, \frac{\text{DaysOpen}}{30} \times 0.5)$) and awards bonuses for verified cleanups without reporting bias.
- Regional Leaderboard ranking districts and wards by cleanliness index.

### 6. Anti-Fraud Idempotent Rewards Ledger
- Double-entry append-only points ledger (`point_transactions`) preventing double-spending or duplicate reward farming.
- Verified reports award **+25 pts**; verified cleanups award **+100 pts**.
- User profile tracks total points, earned badges (`Eco Scout`, `Ground Cleaner`, `Eco Champion`), and personal transaction history.

---

## 🛠️ Project Structure

```
PollutionHackathon/
├── backend/
│   ├── app/
│   │   ├── config.py             # App settings, secrets, and storage paths
│   │   ├── database.py           # SQLAlchemy session and engine management
│   │   ├── models.py             # User, Region, Municipality, Report, Evidence, Cleanup, Points, AuditLog
│   │   ├── schemas.py            # Pydantic v2 validation contracts
│   │   ├── security.py           # PBKDF2 password hashing & JWT RBAC guards
│   │   ├── main.py               # FastAPI entrypoint and router registration
│   │   ├── services/
│   │   │   ├── crypto_service.py # SHA-256 hashing & HMAC-SHA256 signed manifests
│   │   │   ├── ai_service.py     # Heuristic CV & Gemini Vision feature analyzer
│   │   │   ├── scoring_service.py# Multi-tier cleanliness scoring calculation
│   │   │   ├── rewards_service.py# Idempotent rewards ledger engine
│   │   │   └── audit_service.py  # Immutable compliance audit logging
│   │   └── routers/              # auth, reports, evidence, cleanups, scores, points, admin
│   ├── tests/                    # Pytest test suite (100% passing)
│   ├── seed_data.py              # Database seeding script
│   └── uploads/                  # Secure evidence media storage
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Top navigation with role switcher
│   │   │   ├── PollutionMap.tsx  # Leaflet interactive GIS map
│   │   │   ├── ReportForm.tsx    # In-app WebRTC camera & GPS reporting form
│   │   │   ├── CleanupModal.tsx  # Before-and-after evidence submission modal
│   │   │   ├── EvidenceVerifierModal.tsx # Cryptographic forensics inspector
│   │   │   ├── MunicipalDashboard.tsx    # Municipal jurisdiction queue & verification
│   │   │   ├── CleanlinessScoreboard.tsx # Hierarchical scoreboard & leaderboard
│   │   │   └── UserPointsLedger.tsx      # Community rewards ledger & badges
│   │   ├── api.ts                # API client
│   │   ├── types.ts              # TypeScript domain schemas
│   │   ├── App.tsx               # Main application container
│   │   └── index.css             # Tailwind CSS & Leaflet styles
│   └── vite.config.ts            # Vite proxy & Tailwind plugin
└── pytest.ini                    # Pytest configuration
```

---

## 🧪 Running Automated Tests

Run the full backend test suite:

```powershell
python -m pytest
```

Expected output:
```
backend\tests\test_auth_and_reports.py .                                 [ 16%]
backend\tests\test_cleanup_and_scores.py .                               [ 33%]
backend\tests\test_crypto_evidence.py ...                                [ 83%]
backend\tests\test_rewards_idempotency.py .                              [100%]
======================== 6 passed in 0.50s ========================
```

---

## 💻 Manual Startup Commands

If restarting servers:

1. **Backend Server**:
   ```powershell
   cd backend
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Frontend Server**:
   ```powershell
   cd frontend
   npm.cmd run dev
   ```

