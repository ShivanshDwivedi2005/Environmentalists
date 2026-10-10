# EcoTrack Setup, Installation & Local Execution Guide

This document provides step-by-step instructions for running the EcoTrack platform and test suites locally.

---

## 1. Prerequisites

Before starting, ensure the following runtimes are installed on your workstation:
- **Python**: Version 3.10 or higher (tested with Python 3.14)
- **Node.js**: Version 18 or higher (tested with Node.js v25)
- **npm**: Version 9 or higher (tested with npm v11)

---

## 2. Environment Configuration

The backend reads settings from environment variables or a local `.env` file in `backend/.env`.

Default configuration:
```ini
PROJECT_NAME="EcoTrack"
VERSION="1.0.0"
API_V1_STR="/api"

# Cryptographic and JWT secrets (use separate, randomly generated values)
SECRET_KEY="<generate-a-long-random-value>"
SIGNING_KEY="<generate-a-different-long-random-value>"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Persistence: SQLite for zero-setup local dev; PostgreSQL for production
DATABASE_URL="sqlite:///./ecotrack.db"

# Optional Cloud Multimodal AI API
GEMINI_API_KEY=""
```

---

## 3. Dependency Installation

### 3.1 Backend Dependencies
From the project root directory:
```powershell
pip install -r backend/requirements.txt
```

### 3.2 Frontend Dependencies
From the `frontend/` directory:
```powershell
cd frontend
npm.cmd install
cd ..
```

---

## 4. Database Initialization & Seeding

The platform includes a deterministic seeding script that creates the administrative hierarchy (India -> Maharashtra -> Nagpur -> Wards), initial municipal authority, NGO, demo accounts across all 4 roles, and pre-computed scores.

Run the seed script from the project root:
```powershell
python backend/seed_data.py
```

Expected output:
```
Seeding EcoTrack Database...
Database successfully seeded with hierarchical regions, users, reports, evidence, and scores!
```

---

## 5. Running the Application Locally

Run the backend and frontend in two separate terminal windows:

### Terminal 1: Backend API Server
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: `http://127.0.0.1:8000`
- Interactive Swagger/OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Terminal 2: Frontend Web Platform
```powershell
cd frontend
npm.cmd run dev
```
- Web Application: `http://127.0.0.1:5173`

---

## 6. Pre-Configured Demo Accounts

Use the **Persona Switcher** dropdown in the top navbar or log in directly:

| Persona | Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Priya Sharma** | Citizen | `citizen@ecotrack.org` | `password123` | Can report pollution, upload cleanups, earn points |
| **Rajesh Patil** | Municipal Authority | `officer@nmc.gov.in` | `password123` | Scoped to Nagpur Municipal Corporation jurisdiction |
| **Arun Kumar** | Organization (NGO) | `ngo@greenearth.org` | `password123` | Green Earth Foundation cleanup lead |
| **Super Admin** | Platform Admin | `admin@ecotrack.org` | `password123` | Global system oversight and forensic audit logs |

---

## 7. Running the Automated Test Suite

EcoTrack includes an end-to-end Pytest suite verifying authentication, evidence cryptography, tamper detection, duplicate detection, cleanup verification, and reward idempotency.

From the project root:
```powershell
python -m pytest
```

Expected output:
```
collected 6 items
backend\tests\test_auth_and_reports.py .                                 [ 16%]
backend\tests\test_cleanup_and_scores.py .                               [ 33%]
backend\tests\test_crypto_evidence.py ...                                [ 83%]
backend\tests\test_rewards_idempotency.py .                              [100%]
======================== 6 passed in 0.50s ========================
```

