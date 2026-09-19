# CivicTrust — System Architecture & Verification Workflow

Civic complaint verification platform featuring Geo-Tagged Resolution Evidence, Multi-Signal Verification (Image, GPS, Timestamp), Master Incident Deduplication, and Citizen Re-verification.

---

## 1. System Overview & Evidence Workflow

CivicTrust is an independent civic-tech accountability platform designed to eliminate false or premature closures of civic grievances (garbage dumps, uncleaned sweeping, construction debris, blocked drains, potholes, and broken public toilets).

```
Citizen Submits Issue (Photo + Live GPS + Category + Description)
            │
            ▼
    4-Signal Master Incident Matching Engine
    (Time Proximity + Haversine GPS Distance < 250m + Category + Image Sim)
       ├── [Match Found & Open] ────► Attach to Existing Master Incident (e.g. INC-1024)
       ├── [Match Found & Past Resolved] ──► Create NEW Incident marked RECURRING HOTSPOT
       └── [No Match] ──────────────► Create NEW Master Incident
            │
            ▼
    SLA Clock Initiated (12h, 24h, 48h, 72h)
            │
            ▼
    Municipal Team Claims Resolution
    (Mandatory Live Camera Capture + GPS Timestamp Stamp)
            │
            ▼
    Multi-Signal Resolution Verification Layer
       ├── 1. Image Similarity & Residual Debris Analysis
       ├── 2. GPS Location Proximity Matching (Complaint GPS vs Evidence GPS)
       └── 3. Timestamp Chronological Sequence Check
            │
            ▼
    Verification Status Determined:
    [VERIFIED | UNVERIFIED | LOCATION MISMATCH | TIMELINE MISMATCH | REQUIRES HUMAN REVIEW]
            │
            ▼
    Citizen Re-Verification Protocol (2 Clear Options)
       ├── [ ✓ Issue Resolved ] ──► Confirms Closure & Archival
       └── [ ⚠ Issue Still Exists ] ──► Reopens Issue (REVERIFICATION_REQUIRED) with Fresh Evidence
```

---

## 2. SLA Timing Standards

The following SLA standards are enforced:

| Civic Category | SLA Standard | Status Indicators |
| :--- | :--- | :--- |
| **Garbage Dumps** | **12 Hours** | Within SLA / SLA At Risk / SLA Breached |
| **Uncleaned Sweeping** | **24 Hours** | Within SLA / SLA At Risk / SLA Breached |
| **Construction Debris** | **72 Hours** | Within SLA / SLA At Risk / SLA Breached |
| **Blocked Drains** | **24 Hours** | Within SLA / SLA At Risk / SLA Breached |
| **Potholes** | **48 Hours** | Within SLA / SLA At Risk / SLA Breached |
| **Non-functional Public Toilets** | **24 Hours** | Within SLA / SLA At Risk / SLA Breached |

---

## 3. Technology Stack & Ports

- **Frontend**: React (v19) + Vite (Port: `3121`), Tailwind CSS, Lucide React, Recharts, Leaflet + React-Leaflet
- **Backend**: Node.js + Express.js (Port: `5439`), JWT Authentication, Multer, REST APIs
- **Database**: MongoDB with Mongoose, with high-fidelity in-memory persistence fallback.

---

## 4. Responsible Verification & Accountability Principles

1. **Advisory Signals**: Automated verification combines multiple signals to flag inconsistencies for human supervisor review.
2. **Accountability Layer**: Serves as a transparent audit layer without autonomous penalties or government impersonation.
3. **Evidence Integrity**: Original citizen evidence is never overwritten by resolution evidence; full history is preserved.
4. **Master Incident Principle**: *"Remove duplicate incidents, NOT duplicate citizens' evidence."*
