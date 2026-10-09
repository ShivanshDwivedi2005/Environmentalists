# Terra Ledger

Citizen pollution index and cleanup network for India. Photograph pollution, explore rankings from state to village, and join local cleanup drives.

## Stack

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Development

Needs Node.js 20+ and npm.

```sh
git clone https://github.com/ShivanshDwivedi2005/Environmentalists.git
cd Environmentalists
npm install
npm run dev
```

Other scripts:

```sh
npm run build
npm run test
npm run lint
```

## Project notes

- Geographic ranking levels and drill-down lists live in the shared data module so every view uses the same hierarchy.
- Home scenery is loaded from CDN URLs rather than committed video files.

---

# EcoTrack Platform 🌿

EcoTrack is an AI-powered land pollution reporting, cryptographic cleanup verification, and community accountability platform integrated into this repository.

See [ECOTRACK_README.md](ECOTRACK_README.md) for full architectural blueprints, API documentation, and test reports.

### EcoTrack Architecture
- **Backend**: FastAPI (Python 3.14) with SQLAlchemy 2.0, SHA-256 byte hashing, server-signed canonical HMAC manifests, spatial duplicate detection (<50m), and deterministic hierarchical cleanliness scoring. Located in [`backend/`](backend/).
- **Frontend**: React 19 + TypeScript + Tailwind CSS with Leaflet GIS mapping, in-app WebRTC camera viewfinder, and municipal jurisdiction dashboards. Located in [`frontend/`](frontend/).
- **Technical Documentation**: Detailed specifications located in [`documentation/`](documentation/).

### Running EcoTrack Backend
```sh
pip install -r backend/requirements.txt
python backend/seed_data.py
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

### Running EcoTrack Tests
```sh
python -m pytest
```
