# CivicTrust — Civic Complaint Verification System

> An independent civic-tech platform for verified civic grievance resolution, SLA tracking, Geo-Tagged resolution evidence verification, Master Incident deduplication, and citizen re-verification.

---

## 🚀 Quick Start (Running Locally)

### 1. Start Backend Server
```bash
cd server
npm install
node server.js
```
*Backend runs on `http://localhost:5439` with automatic MongoDB connection and high-performance in-memory fallback.*

### 2. Start Frontend Client
```bash
cd client
npm install
npm run dev
```
*Frontend runs on `http://localhost:3121` with full API proxying.*

---

## 🔑 Demo & Evaluator Accounts (1-Click Switcher Available in UI)

| Role | Name | Email | Password | Pre-loaded Context |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | **Abdul** | `citizen@civictrust.org` | `Citizen@123` | Active Citizen (Ward 4 - Green Park) |
| **Municipal Reviewer (Admin)** | **Azeez** | `admin@civictrust.org` | `Admin@123` | Municipal Supervisor (All Wards) |

*Note: You can click the "Demo: Abdul" or "Demo: Azeez" button in the top navigation bar or login page for instant 1-click evaluation!*

---

## 🌟 Core System Features

### 1. Geo-Tagged Resolution Evidence Layer
- Resolution photos are captured directly via the application camera flow with live device GPS coordinates and timestamp.
- Renders an evidence watermark overlay:
  - **Latitude & Longitude**
  - **Date & Time**
  - **Location / Address**

### 2. Multi-Signal Verification Engine
- **Image Similarity Analysis**: Compares before/after visual features and detects residual debris.
- **GPS Location Matching**: Compares complaint coordinates vs resolution capture coordinates (Consistent vs Location Mismatch).
- **Timestamp Verification**: Confirms resolution occurred chronologically after complaint submission.
- **Advisory Statuses**: `VERIFIED`, `UNVERIFIED`, `REQUIRES HUMAN REVIEW`, `LOCATION MISMATCH`, `TIMELINE MISMATCH`.

### 3. Citizen Re-Verification (2 Clear Options)
- Citizens inspect the complete resolution evidence package.
- **[ ✓ Issue Resolved ]**: Confirms closure.
- **[ ⚠ Issue Still Exists ]**: Allows citizen to submit fresh rebuttal evidence and reopens the complaint.

### 4. Master Incident Deduplication (4-Signal Matching)
- **Principle**: *"Remove duplicate incidents, NOT duplicate citizens' evidence."*
- Evaluates 4 signals:
  1. Time Similarity
  2. Location Proximity (Haversine distance < 250m)
  3. Category Match
  4. Image Similarity
- Groups related citizen complaints under a Master Incident (e.g., `INC-1024`).

### 5. Recurring Incident & Hotspot Analytics
- Distinguishes between duplicate reports and recurring civic issues at previously resolved locations.
- Identifies persistent civic problem hotspots and tracks repeat unverified closures.

---

## 📋 Evaluator Walkthrough Flow

1. **Citizen Abdul reports an issue**:
   - Navigate to `/citizen/report`
   - Select **Garbage Dumps** (12-hour SLA)
   - Capture photo and GPS coordinates
   - System evaluates 4 signals against existing Master Incidents and links or creates incident
2. **SLA Countdown starts**:
   - View ticking countdown bar on `/citizen/dashboard`
3. **Admin Azeez captures Geo-Tagged resolution evidence**:
   - Log in as Azeez (via top bar demo switcher)
   - On `/admin/complaints` or `/admin/dashboard`, click **Mark Resolution**
   - Use live camera capture with GPS stamp
4. **Multi-Signal Verification evaluates evidence**:
   - Analyzes Image similarity, GPS distance, and Timestamp chronology
   - If inconsistent, flags `UNVERIFIED / REQUIRES HUMAN REVIEW`
5. **Citizen Abdul Re-verifies**:
   - Abdul inspects the resolution evidence
   - Selects `[ ✓ Issue Resolved ]` or `[ ⚠ Issue Still Exists ]`
6. **Analytics & Master Incidents Dashboard**:
   - View Master Incident groups on `/admin/dashboard`
   - Inspect recurring clusters on `/admin/hotspots`
   - View SLA adherence on `/admin/analytics`

---

## 🛡️ Safety & Responsible Verification Notice

- Independent prototype developed for civic accountability.
- Automated verification signals are advisory and assist human decision-makers.
- Does not automatically penalize municipal personnel.
- All pre-seeded datasets are synthetic demo benchmarking data.
