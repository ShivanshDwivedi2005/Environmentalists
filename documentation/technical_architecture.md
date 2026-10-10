# EcoTrack Technical Architecture & Infrastructure

## 1. Technology Stack Specification

| Subsystem | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python) | 0.115+ | High-performance asynchronous API, auto-generated OpenAPI documentation |
| **Language Runtime** | Python | 3.14+ | Modern async syntax, native typing, strong standard crypto libraries |
| **ORM & Data Layer** | SQLAlchemy | 2.0+ | Relational mapping, connection pooling, transactional consistency |
| **Validation & Schema** | Pydantic | 2.9+ | Request/response data validation, strict type casting |
| **Authentication** | python-jose / PBKDF2 | - | JWT tokens (HS256) and salted PBKDF2-HMAC-SHA256 password security |
| **Image & CV Analysis** | Pillow / NumPy | 10.4+ | Edge density, entropy, and texture feature extraction |
| **Testing Engine** | Pytest | 8.3+ | Automated unit, integration, and security regression testing |
| **Frontend Framework** | React | 19.2+ | Component UI with strict TypeScript typing |
| **Bundler & Toolchain** | Vite | 8.3+ | Fast HMR, optimized production tree-shaking |
| **Styling & Icons** | Tailwind CSS / Lucide | 4.0+ | Mobile-first utility design and clean SVG iconography |
| **GIS Mapping** | Leaflet | 1.9+ | Interactive OpenStreetMap tile rendering and custom marker pins |

---

## 2. Directory Structure & Codebase Organization

```
PollutionHackathon/
├── backend/
│   ├── app/
│   │   ├── config.py             # Centralized settings and environment variables
│   │   ├── database.py           # SQLAlchemy session generator and connection pooling
│   │   ├── models.py             # Relational domain entities and constraints
│   │   ├── schemas.py            # Pydantic input and output validation contracts
│   │   ├── security.py           # Authentication, PBKDF2 hashing, and RBAC guards
│   │   ├── main.py               # FastAPI application setup, CORS, static routes
│   │   ├── services/
│   │   │   ├── crypto_service.py # Byte-level SHA-256 and HMAC canonical manifest signing
│   │   │   ├── ai_service.py     # Heuristic CV & Gemini Vision feature extraction
│   │   │   ├── scoring_service.py# Multi-tier hierarchical cleanliness calculation
│   │   │   ├── rewards_service.py# Idempotent rewards ledger engine
│   │   │   └── audit_service.py  # Immutable compliance audit logging
│   │   └── routers/
│   │       ├── auth.py           # /api/auth: Login, registration, profile
│   │       ├── reports.py        # /api/reports: Submission, spatial duplicate checks
│   │       ├── evidence.py       # /api/evidence: Cryptographic forensic verification
│   │       ├── cleanups.py       # /api/cleanups: Cleanup drives and verification
│   │       ├── scores.py         # /api/scores: Cleanliness scorecards & leaderboards
│   │       ├── points.py         # /api/points: User rewards ledger & badges
│   │       └── admin.py          # /api/admin: Forensic audit logs & overview
│   ├── seed_data.py              # Database seeding script for local demo
│   ├── requirements.txt          # Python application dependencies
│   ├── uploads/                  # Secure evidence media storage
│   └── tests/                    # Pytest test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx        # Top navigation with persona switcher
│   │   │   ├── PollutionMap.tsx  # Leaflet interactive GIS map
│   │   │   ├── ReportForm.tsx    # WebRTC in-app camera & GPS reporting form
│   │   │   ├── CleanupModal.tsx  # Before-and-after evidence submission modal
│   │   │   ├── EvidenceVerifierModal.tsx # Cryptographic forensics inspector
│   │   │   ├── MunicipalDashboard.tsx    # Municipal jurisdiction queue & verification
│   │   │   ├── CleanlinessScoreboard.tsx # Hierarchical scoreboard & leaderboard
│   │   │   └── UserPointsLedger.tsx      # Community rewards ledger & badges
│   │   ├── api.ts                # Strongly typed HTTP client
│   │   ├── types.ts              # TypeScript domain schemas
│   │   ├── App.tsx               # Main application container
│   │   └── index.css             # Tailwind CSS & Leaflet styles
│   ├── package.json              # Frontend npm dependencies
│   └── vite.config.ts            # Vite proxy & Tailwind plugin
├── documentation/                # Dedicated technical documentation directory
└── pytest.ini                    # Root pytest configuration
```

---

## 3. Security Architecture

### 3.1 Password Security
User passwords are never stored in plaintext. They are salted using 16 bytes of cryptographically secure random bytes (`os.urandom(16)`) and hashed via PBKDF2 with SHA-256 over 100,000 iterations:
```python
salt = os.urandom(16)
key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
stored_hash = f"{salt.hex()}:{key.hex()}"
```

### 3.2 Token Authentication & RBAC
Tokens are standard JSON Web Tokens (JWT) signed with HS256 containing user ID (`sub`), role (`role`), and expiration (`exp`). Every state-mutating endpoint executes dependency checks:
```python
def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != "ADMIN":
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return role_checker
```

### 3.3 Municipal Jurisdiction Guard
Municipal officers are restricted from viewing or updating records outside their authorized jurisdiction:
```python
if current_user.role == "MUNICIPAL" and current_user.municipality_id:
    muni = db.query(Municipality).filter(Municipality.id == current_user.municipality_id).first()
    if muni and report.municipality_id != muni.id:
        raise HTTPException(status_code=403, detail="Forbidden: Outside authorized jurisdiction.")
```

### 3.4 Cryptographic File Signing & Tamper Defense
Uploaded photographs are stored with randomized UUID filenames, and their SHA-256 digest is signed using a server-side HMAC secret. Verification utilizes constant-time comparison (`hmac.compare_digest`) to prevent timing side-channel attacks.

---

## 4. Production Deployment Strategy

```
                          Internet Traffic
                                 │
                                 ▼
                     [Nginx Reverse Proxy / TLS]
                     (Port 80/443 -> SSL Termination)
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
       [FastAPI Application]           [Static Web Assets]
     (Uvicorn ASGI Workers :8000)      (Built Vite Dist HTML/JS/CSS)
                 │
                 ▼
      [PostgreSQL 16 + PostGIS]
   (Persistent Storage & Spatial Queries)
```

1. **Containerization**: Backend and Frontend can be containerized via Docker.
2. **Database Migration**: Switching to PostgreSQL requires only setting `DATABASE_URL=postgresql://user:pass@db:5432/ecotrack`.
3. **Media Storage**: Original evidence files can be backed by private AWS S3 / Google Cloud Storage buckets with access-controlled presigned URLs.

