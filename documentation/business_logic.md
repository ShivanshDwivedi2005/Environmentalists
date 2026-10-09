# EcoTrack Business Logic & Operational Rules

## 1. Executive Overview

EcoTrack implements a closed-loop civic accountability cycle for land pollution. Rather than treating reporting as a simple notification board, the platform enforces traceable evidence integrity, automated duplicate prevention, jurisdictional assignment, before-and-after verification, and mathematically reproducible cleanliness scores.

```
[CITIZEN REPORT] ──▶ [AI ASSESSMENT & CRYPTO SIGNING] ──▶ [JURISDICTIONAL DISPATCH]
                                                                     │
[POINTS & REPUTATION] ◀── [OFFICIAL VERIFICATION] ◀── [CLEANUP DRIVE & AFTER EVIDENCE]
```

---

## 2. Pollution Report Lifecycle State Machine

Every pollution incident transitions through a formal state machine governed by role-based permissions:

```
  ┌──────────────┐
  │   REPORTED   │ ◀── Citizen submits photo, GPS, description
  └──────┬───────┘
         │
         ├──▶ (If distance < 50m to active report) ──▶ [DUPLICATE]
         ├──▶ (If AI confidence < 0.65) ─────────────▶ [UNDER_REVIEW]
         ▼
  ┌──────────────┐
  │   VERIFIED   │ ◀── Evidence valid, AI confidence >= 0.65 or Human approved
  └──────┬───────┘
         │
         ▼ (Municipal Officer assigns rapid response or NGO accepts)
  ┌──────────────┐
  │   ASSIGNED   │
  └──────┬───────┘
         │
         ▼ (Cleanup initiative starts)
  ┌─────────────────────────┐
  │  CLEANING_IN_PROGRESS   │
  └────────────┬────────────┘
               │
               ▼ (After-cleaning photograph uploaded)
  ┌─────────────────────────┐
  │    CLEANUP_SUBMITTED    │
  └────────────┬────────────┘
               │
               ▼ (Officer or Admin approves Before/After comparison)
  ┌─────────────────────────┐
  │   CLEANED_AND_VERIFIED  │ ──▶ [Triggers +100pts to organizer, +25pts to reporter]
  └─────────────────────────┘
```

### Alternative Terminal & Non-linear States
- **`DUPLICATE`**: When a report is submitted within 50 meters of an active unresolved report within 14 days, it is linked via `duplicate_of_id`. Duplicates do not penalize regional scores multiple times and do not award separate points.
- **`REJECTED`**: Flagged if image depicts indoor waste, non-environmental litter, or fraud.
- **`DISPUTED`**: Triggered when after-cleanup evidence is deemed insufficient by the municipal authority or citizens.
- **`REOPENED`**: If re-dumping occurs at a previously verified site after resolution, an incident can be reopened while preserving historical cleanup records.

---

## 3. Evidence Integrity & Cryptographic Protocol

### 3.1 Raw Byte Hashing
Upon receiving an evidence photograph, the server computes an immutable SHA-256 digest:
$$\text{ImageHash} = \text{SHA-256}(\text{RawFileBytes})$$

### 3.2 Canonical Signed Manifest
A deterministic JSON manifest is assembled using strict lexicographical key ordering (`separators=(',', ':')`):
```json
{
  "capture_method": "IN_APP_CAMERA",
  "capture_timestamp_iso": "2026-10-09T08:00:00.000000+00:00",
  "coordinates": {
    "accuracy_meters": 4.5,
    "latitude": 21.1466,
    "longitude": 79.0825
  },
  "image_hash_sha256": "4a7d...31b2",
  "metadata": {},
  "report_id": "rep-uuid-123",
  "uploaded_by_id": "usr-uuid-456",
  "version": "1.0"
}
```

### 3.3 Server-Side Digital Signature
The manifest string is signed using HMAC-SHA256 with the server's private `SIGNING_KEY`:
$$\text{Signature} = \text{HMAC-SHA256}(\text{SIGNING\_KEY}, \text{CanonicalManifestString})$$

### 3.4 Forensic Verification Rules
When an inspector calls the verification endpoint (`/api/evidence/{id}/verify`), the engine executes three independent checks:
1. **Byte Integrity**: Recalculates `SHA-256(DiskFileBytes) == RecordedHash`.
2. **Signature Authenticity**: Recalculates `HMAC-SHA256(CanonicalManifest) == RecordedSignature`.
3. **Payload Consistency**: Confirms `Manifest.image_hash_sha256 == RecordedHash`.

If any check fails, `tamper_detected = True` is immediately flagged and recorded in the audit log.

---

## 4. Hierarchical Cleanliness Scoring Formulation

EcoTrack avoids naive averaging across administrative regions. It enforces an **anti-reporting bias formulation** where civic vigilance does not depress a region's score compared to an unmonitored area.

### 4.1 Base Unit Score (Ward or Village $w$)

$$\text{RawPenalty}(w) = \sum_{r \in \text{ActiveReports}(w)} \left( \text{Weight}(\text{severity}_r) \times \text{Confidence}_r \times \text{AgeDecay}(r) \right)$$

#### Severity Weights:
- **`CRITICAL`**: 20.0
- **`HIGH`**: 12.0
- **`MEDIUM`**: 6.0
- **`LOW`**: 3.0

#### Age Decay Factor:
Unresolved dumping sites become progressively heavier penalties as days pass:
$$\text{AgeDecay}(r) = 1.0 + \min\left(1.0, \frac{\text{DaysOpen}}{30} \times 0.5\right)$$

#### Cleanup Bonus:
Cleanups verified within the last 90 days restore the area's index:
$$\text{CleanupBonus}(w) = \min\left(25.0, \sum_{c \in \text{Cleanups}(w, \text{90d})} 10.0 \times \text{Delta}_c\right)$$

#### Final Ward Score:
$$\text{Score}(w) = \max\left(0.0, \min\left(100.0, 100.0 - \text{RawPenalty}(w) + \text{CleanupBonus}(w)\right)\right)$$

### 4.2 Multi-Tier Hierarchical Aggregation
Parent regions (District, State, Country) aggregate child regions using population and geographic area weights:

$$\text{Score}(P) = \frac{\sum_{c \in \text{Children}} \text{Score}(c) \times \left( \frac{\text{Population}(c)}{10000} + \frac{\text{AreaSqKm}(c)}{2} \right)}{\sum_{c} \left( \frac{\text{Population}(c)}{10000} + \frac{\text{AreaSqKm}(c)}{2} \right)}$$

---

## 5. Rewards Ledger & Anti-Fraud Rules

Points are managed through an **append-only double-entry ledger** (`point_transactions`).

### 5.1 Points Schedule
- **Verified Pollution Report**: **+25 Points**
- **Verified Cleanup Drive**: **+100 Points**
- **Volunteer Task Participation**: **+50 Points**
- **Fraudulent Claim Reversal**: **Compensatory negative entry (-100 Points)**

### 5.2 Idempotency Guarantee
Every transaction requires a unique compound key:
$$\text{IdempotencyKey} = \text{ReferenceType} : \text{ReferenceID} : \text{UserID}$$
A unique database constraint prevents duplicate awards. Re-submitting the same event returns `awarded=False, duplicate_prevented=True` with zero balance mutation.

### 5.3 Badge Milestones
- **Eco Scout**: Granted upon initial valid submission.
- **Pollution Detective**: $\ge 5$ verified reports.
- **Ground Cleaner**: $\ge 1$ verified cleanup drive.
- **Community Guardian**: $\ge 5$ verified cleanups.
- **Eco Champion**: $\ge 250$ cumulative points.

---

## 6. Role-Based Permissions & Scoping Matrix

| Action | Citizen | Municipal Authority | Organization (NGO) | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Capture & Submit Report | ✅ | ✅ | ✅ | ✅ |
| View Public Incident Map | ✅ | ✅ | ✅ | ✅ |
| View Reports in Jurisdiction | Public only | **Enforced Jurisdiction Only** | All assigned | All global |
| Assign Sanitation Crew | ❌ | **✅ (In Jurisdiction)** | ❌ | ✅ |
| Change Report Status | ❌ | **✅ (In Jurisdiction)** | ❌ | ✅ |
| Organize Cleanup Drive | ✅ | ✅ | ✅ | ✅ |
| Upload After Evidence | ✅ (Lead) | ✅ (Crew) | ✅ (NGO Lead) | ✅ |
| Officially Verify Cleanup | ❌ | **✅ (In Jurisdiction)** | ❌ | ✅ |
| Release Community Points | ❌ | **✅ (Automatic on Verify)** | ❌ | ✅ |
| Recalculate Regional Scores | ❌ | ✅ | ❌ | ✅ |
| View Forensic Audit Logs | ❌ | ✅ | ❌ | ✅ |

---

## 7. Status of Features: Implemented vs Planned

| Feature | Status | Notes |
| :--- | :--- | :--- |
| In-App WebRTC Camera Capture | **Implemented & Tested** | Direct canvas snapshot with fallback upload |
| SHA-256 & HMAC-SHA256 Manifests | **Implemented & Tested** | Full canonical signing and verify endpoint |
| Spatial Duplicate Detection (<50m) | **Implemented & Tested** | Haversine formula within 14-day window |
| AI Edge-Entropy Vision Classification | **Implemented & Tested** | Local heuristic CV + Gemini Vision adapter |
| Before-and-After Delta Evaluation | **Implemented & Tested** | Measures structural clutter reduction |
| Hierarchical Cleanliness Scoring | **Implemented & Tested** | Wards -> District -> State -> Country rollups |
| Idempotent Points Ledger | **Implemented & Tested** | Unique constraint enforced |
| Municipal Jurisdiction Guard | **Implemented & Tested** | Scoped to assigned municipal boundaries |
| Crowdfunding Campaigns | *Planned (Phase 5)* | Architecture defined; payment escrow pending |
| Paid Cleanup Tasks Escrow | *Planned (Phase 5)* | Escrow release lifecycle defined |

