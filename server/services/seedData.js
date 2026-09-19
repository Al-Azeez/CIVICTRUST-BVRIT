/**
 * Synthetic Demo Dataset Generator for CivicTrust
 * 
 * Pre-configured Demo Identities:
 * - Citizen: Abdul (citizen@civictrust.org)
 * - Admin/Reviewer: Azeez (admin@civictrust.org)
 * 
 * Includes:
 * 1. Master Incidents grouping duplicate citizen reports ("Remove duplicate incidents, NOT duplicate citizens' evidence")
 * 2. Geo-Tagged Resolution Evidence
 * 3. A Recurring Incident at a previously resolved hotspot
 * 4. Genuine and Suspicious verification scenarios
 */

const bcrypt = require('bcryptjs');

// High-quality SVG Data URIs representing realistic civic scenarios with Geo-Tag Watermark Overlays
const SAMPLE_IMAGES = {
  garbage_before: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%2378350f'/%3E%3Cpath d='M0,280 Q150,220 300,280 T600,260 L600,400 L0,400 Z' fill='%23451a03'/%3E%3Ccircle cx='180' cy='290' r='45' fill='%23b45309'/%3E%3Crect x='240' y='260' width='80' height='60' rx='10' fill='%2315803d'/%3E%3Cpolygon points='340,320 390,250 440,320' fill='%230369a1'/%3E%3Ccircle cx='430' cy='280' r='30' fill='%23dc2626'/%3E%3Crect x='100' y='310' width='50' height='40' fill='%23eab308'/%3E%3Ctext x='300' y='50' font-family='sans-serif' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'%3E⚠️ CIVICTRUST EVIDENCE: OVERFLOWING GARBAGE DUMP%3C/text%3E%3Ctext x='300' y='80' font-family='sans-serif' font-size='13' fill='%23fef08a' text-anchor='middle'%3E[Original Citizen Report Evidence - Before]%3C/text%3E%3C/svg%3E",
  
  garbage_after_clean_geotagged: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='320' fill='%230f172a'/%3E%3Crect x='0' y='180' width='600' height='140' fill='%23334155'/%3E%3Cline x1='0' y1='250' x2='600' y2='250' stroke='%23f8fafc' stroke-dasharray='30 20' stroke-width='5'/%3E%3Crect x='480' y='150' width='60' height='80' rx='8' fill='%2316a34a'/%3E%3Ctext x='510' y='195' font-family='sans-serif' font-size='22' font-weight='bold' fill='%23ffffff' text-anchor='middle'%3E♻️%3C/text%3E%3Ctext x='300' y='45' font-family='sans-serif' font-size='18' font-weight='bold' fill='%234ade80' text-anchor='middle'%3E✅ CLEARED RESOLUTION EVIDENCE%3C/text%3E%3C!-- GEO-TAGGED EVIDENCE FOOTER OVERLAY --%3E%3Crect x='0' y='320' width='600' height='80' fill='%23020617' opacity='0.92'/%3E%3Cline x1='0' y1='320' x2='600' y2='320' stroke='%2310b981' stroke-width='2'/%3E%3Ctext x='15' y='340' font-family='monospace' font-size='11' font-weight='bold' fill='%2310b981'%3EGEO-TAGGED RESOLUTION EVIDENCE%3C/text%3E%3Ctext x='15' y='358' font-family='monospace' font-size='10' fill='%23e2e8f0'%3ELat: 28.6259° N | Long: 77.2240° E%3C/text%3E%3Ctext x='15' y='374' font-family='monospace' font-size='10' fill='%2394a3b8'%3EDate: 18-Sep-2026 | Time: 11:42 AM | Location: Ward 4, Green Park Main Gate%3C/text%3E%3Ctext x='15' y='390' font-family='monospace' font-size='10' fill='%2338bdf8'%3ECaptured by: Azeez (Municipal Officer)%3C/text%3E%3C/svg%3E",
  
  garbage_after_suspicious_geotagged: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='320' fill='%23581c87'/%3E%3Crect x='0' y='180' width='600' height='140' fill='%233b0764'/%3E%3Ccircle cx='200' cy='220' r='35' fill='%23b45309'/%3E%3Crect x='250' y='210' width='70' height='50' fill='%2315803d'/%3E%3Ccircle cx='380' cy='240' r='30' fill='%23dc2626'/%3E%3Ctext x='300' y='45' font-family='sans-serif' font-size='18' font-weight='bold' fill='%23f87171' text-anchor='middle'%3E⚠️ CLAIMED RESOLUTION EVIDENCE%3C/text%3E%3C!-- GEO-TAGGED EVIDENCE FOOTER OVERLAY --%3E%3Crect x='0' y='320' width='600' height='80' fill='%23020617' opacity='0.92'/%3E%3Cline x1='0' y1='320' x2='600' y2='320' stroke='%23f43f5e' stroke-width='2'/%3E%3Ctext x='15' y='340' font-family='monospace' font-size='11' font-weight='bold' fill='%23f43f5e'%3EGEO-TAGGED RESOLUTION EVIDENCE%3C/text%3E%3Ctext x='15' y='358' font-family='monospace' font-size='10' fill='%23e2e8f0'%3ELat: 28.6259° N | Long: 77.2240° E%3C/text%3E%3Ctext x='15' y='374' font-family='monospace' font-size='10' fill='%2394a3b8'%3EDate: 18-Sep-2026 | Time: 10:15 AM | Location: Ward 4, Green Park Center%3C/text%3E%3Ctext x='15' y='390' font-family='monospace' font-size='10' fill='%23fbbf24'%3EResidual Debris Detected: 78% | Review Required%3C/text%3E%3C/svg%3E",

  pothole_before: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23334155'/%3E%3Cellipse cx='300' cy='250' rx='130' ry='70' fill='%230f172a'/%3E%3Cellipse cx='290' cy='255' rx='90' ry='40' fill='%23020617' stroke='%23475569' stroke-width='4'/%3E%3Ctext x='300' y='50' font-family='sans-serif' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'%3E⚠️ ROAD POTHOLE EVIDENCE%3C/text%3E%3Ctext x='300' y='80' font-family='sans-serif' font-size='13' fill='%23fef08a' text-anchor='middle'%3E[Hazardous Pothole - 48h SLA Target]%3C/text%3E%3C/svg%3E",

  pothole_after_geotagged: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='320' fill='%23334155'/%3E%3Cellipse cx='300' cy='230' rx='140' ry='60' fill='%231e293b' stroke='%23059669' stroke-width='4'/%3E%3Cline x1='0' y1='230' x2='600' y2='230' stroke='%23f8fafc' stroke-dasharray='25 15' stroke-width='4'/%3E%3Ctext x='300' y='45' font-family='sans-serif' font-size='18' font-weight='bold' fill='%2334d399' text-anchor='middle'%3E✅ POTHOLE REPAIRED & TARRED%3C/text%3E%3C!-- GEO-TAGGED EVIDENCE FOOTER OVERLAY --%3E%3Crect x='0' y='320' width='600' height='80' fill='%23020617' opacity='0.92'/%3E%3Cline x1='0' y1='320' x2='600' y2='320' stroke='%2310b981' stroke-width='2'/%3E%3Ctext x='15' y='340' font-family='monospace' font-size='11' font-weight='bold' fill='%2310b981'%3EGEO-TAGGED RESOLUTION EVIDENCE%3C/text%3E%3Ctext x='15' y='358' font-family='monospace' font-size='10' fill='%23e2e8f0'%3ELat: 28.5989° N | Long: 77.2310° E%3C/text%3E%3Ctext x='15' y='374' font-family='monospace' font-size='10' fill='%2394a3b8'%3EDate: 18-Sep-2026 | Time: 02:15 PM | Location: Ward 2, Civil Lines Circle%3C/text%3E%3Ctext x='15' y='390' font-family='monospace' font-size='10' fill='%2338bdf8'%3EVerified Level Ground: 93% Similarity%3C/text%3E%3C/svg%3E",

  debris_before: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%2344403c'/%3E%3Cpolygon points='150,330 250,220 380,330' fill='%2378716c'/%3E%3Cpolygon points='320,340 420,240 520,340' fill='%23a8a29e'/%3E%3Ctext x='300' y='50' font-family='sans-serif' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'%3E⚠️ CONSTRUCTION DEBRIS EVIDENCE%3C/text%3E%3Ctext x='300' y='80' font-family='sans-serif' font-size='13' fill='%23fef08a' text-anchor='middle'%3E[Public Footpath Blockage - 72h SLA Target]%3C/text%3E%3C/svg%3E",

  reopen_citizen_photo: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%237f1d1d'/%3E%3Ccircle cx='200' cy='260' r='40' fill='%23b45309'/%3E%3Crect x='270' y='240' width='80' height='60' rx='5' fill='%2315803d'/%3E%3Ccircle cx='400' cy='270' r='30' fill='%23eab308'/%3E%3Ctext x='300' y='50' font-family='sans-serif' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'%3E🔄 CITIZEN RE-VERIFICATION EVIDENCE%3C/text%3E%3Ctext x='300' y='80' font-family='sans-serif' font-size='13' fill='%23fef08a' text-anchor='middle'%3E[Fresh Rebuttal Ground Photo - Abdul]%3C/text%3E%3C/svg%3E",

  // OSINT Scenario 1: Strong Clues (Signboard + Municipal Green Bin)
  osint_green_park_sign: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%230f172a'/%3E%3Crect x='0' y='220' width='600' height='180' fill='%231e293b'/%3E%3C!-- Shop Signboard --%3E%3Crect x='40' y='40' width='520' height='70' rx='6' fill='%230284c7' stroke='%2338bdf8' stroke-width='2'/%3E%3Ctext x='300' y='72' font-family='sans-serif' font-size='18' font-weight='900' fill='%23ffffff' text-anchor='middle'%3EGUPTA ELECTRICALS &amp; SANITARY%3C/text%3E%3Ctext x='300' y='96' font-family='sans-serif' font-size='12' font-weight='bold' fill='%23fef08a' text-anchor='middle'%3EGREEN PARK MAIN MARKET • WARD 4 • NEAR COMMUNITY CENTER GATE 3 • PIN 110016%3C/text%3E%3C!-- Overflowing waste on sidewalk --%3E%3Ccircle cx='180' cy='290' r='45' fill='%23b45309'/%3E%3Crect x='240' y='250' width='80' height='70' rx='8' fill='%2315803d'/%3E%3Ctext x='280' y='290' font-family='sans-serif' font-size='20' font-weight='bold' fill='%23ffffff' text-anchor='middle'%3E♻️%3C/text%3E%3Ccircle cx='430' cy='280' r='30' fill='%23dc2626'/%3E%3Crect x='100' y='310' width='60' height='40' fill='%23eab308'/%3E%3C!-- Road Divider & Hexagonal Curb --%3E%3Crect x='0' y='360' width='600' height='40' fill='%23020617'/%3E%3Ctext x='300' y='385' font-family='monospace' font-size='11' font-weight='bold' fill='%2338bdf8' text-anchor='middle'%3E[CITIZEN REPORT • LOCATION NOT AVAILABLE • OSINT SCAN REQUIRED]%3C/text%3E%3C/svg%3E",

  // OSINT Scenario 2: Conflicting Signals (Civil Lines sign vs Industrial shed)
  osint_conflicting_signs: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%231c1917'/%3E%3C!-- Background Industrial Shed --%3E%3Cpolygon points='100,180 300,120 500,180' fill='%2357534e'/%3E%3Crect x='100' y='180' width='400' height='140' fill='%2344403c' stroke='%2378716c' stroke-width='2'/%3E%3Ctext x='300' y='220' font-family='sans-serif' font-size='14' font-weight='bold' fill='%23f97316' text-anchor='middle'%3E⚡ SHARMA MOTORS HEAVY INDUSTRIAL WORKSHOP%3C/text%3E%3C!-- Foreground Conflicting Sign --%3E%3Crect x='50' y='40' width='500' height='55' rx='4' fill='%2315803d' stroke='%234ade80' stroke-width='2'/%3E%3Ctext x='300' y='66' font-family='sans-serif' font-size='16' font-weight='bold' fill='%23ffffff' text-anchor='middle'%3E🏛️ MUNICIPALITY: CIVIL LINES NORTH SECTOR 2%3C/text%3E%3Ctext x='300' y='86' font-family='sans-serif' font-size='11' fill='%23fef08a' text-anchor='middle'%3E[SPEED LIMIT 30 • RESIDENTIAL HERITAGE ZONE]%3C/text%3E%3C!-- Sidewalk debris --%3E%3Cpolygon points='180,340 260,250 360,340' fill='%23a8a29e'/%3E%3Cpolygon points='320,350 400,270 480,350' fill='%2378716c'/%3E%3Crect x='0' y='360' width='600' height='40' fill='%230c0a09'/%3E%3Ctext x='300' y='385' font-family='monospace' font-size='11' font-weight='bold' fill='%23f43f5e' text-anchor='middle'%3E[CONFLICTING SIGNALS DETECTED • HUMAN AUDIT REQUIRED]%3C/text%3E%3C/svg%3E",

  // OSINT Scenario 3: Uncertain / Blurry Road Crater
  osint_blurry_pothole: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%231e293b'/%3E%3Cfilter id='blur'%3E%3CfeGaussianBlur stdDeviation='6'/%3E%3C/filter%3E%3Crect width='600' height='200' fill='%23334155' filter='url(%23blur)'/%3E%3Cellipse cx='300' cy='280' rx='140' ry='70' fill='%230f172a'/%3E%3Cellipse cx='290' cy='285' rx='100' ry='40' fill='%23020617' stroke='%2338bdf8' stroke-width='2'/%3E%3Ctext x='300' y='80' font-family='sans-serif' font-size='18' font-weight='bold' fill='%2394a3b8' text-anchor='middle'%3E[GENERIC ROADWAY CRATER - NO SURROUNDINGS]%3C/text%3E%3Ctext x='300' y='110' font-family='sans-serif' font-size='12' fill='%2364748b' text-anchor='middle'%3EZero legible signs • Generic asphalt • Background out of focus%3C/text%3E%3Crect x='0' y='360' width='600' height='40' fill='%23020617'/%3E%3Ctext x='300' y='385' font-family='monospace' font-size='11' font-weight='bold' fill='%23cbd5e1' text-anchor='middle'%3E[OSINT STATUS: UNCERTAIN • INSUFFICIENT EVIDENCE]%3C/text%3E%3C/svg%3E",
};

const WARDS = [
  'Ward 1 - Central Market',
  'Ward 2 - Civil Lines',
  'Ward 3 - Industrial Zone',
  'Ward 4 - Green Park',
  'Ward 5 - Station Road',
  'Ward 6 - Heritage Quarter',
  'Ward 7 - Tech Enclave',
  'Ward 8 - Riverfront',
];

const BASE_LAT = 28.6139;
const BASE_LNG = 77.2090;

const createSyntheticData = async () => {
  const hashedPasswordAdmin = await bcrypt.hash('Admin@123', 10);
  const hashedPasswordCitizen = await bcrypt.hash('Citizen@123', 10);

  // 1. Pre-seeded Users with names Abdul and Azeez
  const users = [
    {
      _id: '661000000000000000000001',
      name: 'Azeez',
      email: 'admin@civictrust.org',
      password: hashedPasswordAdmin,
      role: 'admin',
      ward: 'Ward 1 - Central Market',
      phone: '+91 98111 22233',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    {
      _id: '661000000000000000000002',
      name: 'Abdul',
      email: 'citizen@civictrust.org',
      password: hashedPasswordCitizen,
      role: 'citizen',
      ward: 'Ward 4 - Green Park',
      phone: '+91 98765 43210',
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000),
    },
    {
      _id: '661000000000000000000003',
      name: 'Farhan',
      email: 'farhan@example.com',
      password: hashedPasswordCitizen,
      role: 'citizen',
      ward: 'Ward 4 - Green Park',
      phone: '+91 98222 33344',
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    },
  ];

  const now = Date.now();

  // 2. Master Incidents (Grouping multiple citizen reports & supporting recurring incident detection)
  const masterIncidents = [
    // MASTER INCIDENT 1: Garbage Dump near Community Center (Grouped 3 duplicate reports from Abdul, Farhan, Citizen 3)
    {
      _id: '663000000000000000000001',
      incidentId: 'INC-1024',
      category: 'Garbage Dump',
      description: 'Major overflowing garbage dump near Community Center Gate 3 blocking pedestrian pathway.',
      ward: 'Ward 4 - Green Park',
      address: 'Near Gate 3, Community Center, Green Park Main',
      latitude: BASE_LAT + 0.012,
      longitude: BASE_LNG + 0.015,
      firstReportedAt: new Date(now - 10 * 3600 * 1000),
      lastReportedAt: new Date(now - 2 * 3600 * 1000),
      reportCount: 3,
      linkedComplaintIds: ['CT-2026-0841', 'CT-2026-0842', 'CT-2026-0843'],
      linkedComplaints: [
        {
          complaintId: 'CT-2026-0841',
          citizenName: 'Abdul',
          description: 'Massive overflowing garbage dump blocking pedestrian walkway near Community Center gate.',
          photo: SAMPLE_IMAGES.garbage_before,
          submittedAt: new Date(now - 10 * 3600 * 1000),
          latitude: BASE_LAT + 0.012,
          longitude: BASE_LNG + 0.015,
        },
        {
          complaintId: 'CT-2026-0842',
          citizenName: 'Farhan',
          description: 'Garbage spill spreading across road corner near Gate 3.',
          photo: SAMPLE_IMAGES.garbage_before,
          submittedAt: new Date(now - 5 * 3600 * 1000),
          latitude: BASE_LAT + 0.0121,
          longitude: BASE_LNG + 0.0151,
        },
        {
          complaintId: 'CT-2026-0843',
          citizenName: 'Local Resident',
          description: 'Same waste accumulation uncleared for 2 days.',
          photo: SAMPLE_IMAGES.garbage_before,
          submittedAt: new Date(now - 2 * 3600 * 1000),
          latitude: BASE_LAT + 0.0119,
          longitude: BASE_LNG + 0.0149,
        },
      ],
      status: 'UNVERIFIED',
      isRecurring: false,
      recurringCount: 0,
      slaHours: 12,
      slaDeadline: new Date(now + 2 * 3600 * 1000),
      resolutionEvidence: {
        photo: SAMPLE_IMAGES.garbage_after_suspicious_geotagged,
        latitude: BASE_LAT + 0.012,
        longitude: BASE_LNG + 0.015,
        timestamp: new Date(now - 1 * 3600 * 1000),
        address: 'Gate 3, Community Center, Green Park',
        capturedBy: 'Azeez (Municipal Officer)',
      },
      verification: {
        imageSimilarity: 34,
        locationMatch: true,
        locationDistanceMeters: 12,
        timestampMatch: true,
        overallStatus: 'REQUIRES HUMAN REVIEW',
        confidence: 78,
        reviewRequired: true,
        reason: 'Evidence could not be independently verified. Residual debris patterns remain visible in geo-tagged resolution photo.',
      },
      citizenReverification: {
        status: '',
        reason: '',
      },
      timeline: [
        {
          action: 'Master Incident Created',
          status: 'OPEN',
          timestamp: new Date(now - 10 * 3600 * 1000),
          actor: 'System',
          actorRole: 'system',
          notes: 'Master Incident INC-1024 initiated from initial report by Abdul. 12h SLA clock active.',
        },
        {
          action: 'Duplicate Report Linked (#2)',
          status: 'OPEN',
          timestamp: new Date(now - 5 * 3600 * 1000),
          actor: 'Farhan',
          actorRole: 'citizen',
          notes: 'Matched 4 signals (Location 15m, Category Match, Time Delta 5h, Image Similarity 88%). Linked to INC-1024.',
        },
        {
          action: 'Geo-Tagged Resolution Evidence Uploaded',
          status: 'RESOLUTION_CLAIMED',
          timestamp: new Date(now - 1 * 3600 * 1000),
          actor: 'Azeez',
          actorRole: 'admin',
          notes: 'Geo-Tagged photo captured at Lat: 28.6259° N, Long: 77.2240° E.',
          photo: SAMPLE_IMAGES.garbage_after_suspicious_geotagged,
        },
        {
          action: 'Multi-Signal Verification Executed',
          status: 'UNVERIFIED',
          timestamp: new Date(now - 0.9 * 3600 * 1000),
          actor: 'Verification Engine',
          actorRole: 'system',
          notes: '⚠ Overall Result: REQUIRES HUMAN REVIEW (78% Confidence). Location Match: ✓ (12m), Timestamp: ✓, Image: ⚠ Residual debris detected.',
        },
      ],
    },

    // MASTER INCIDENT 2: Recurring Hotspot (Garbage at Metro Pillar 42 - Resolved 5 days ago, recurring today)
    {
      _id: '663000000000000000000002',
      incidentId: 'INC-1019',
      category: 'Garbage Dump',
      description: 'Solid waste pile spilling onto main road corner opposite metro pillar 42.',
      ward: 'Ward 1 - Central Market',
      address: 'Opposite Metro Pillar 42, Central Market Road',
      latitude: BASE_LAT + 0.018,
      longitude: BASE_LNG - 0.012,
      firstReportedAt: new Date(now - 6 * 24 * 3600 * 1000),
      lastReportedAt: new Date(now - 3 * 3600 * 1000),
      reportCount: 4,
      linkedComplaintIds: ['CT-2026-0792'],
      linkedComplaints: [
        {
          complaintId: 'CT-2026-0792',
          citizenName: 'Abdul',
          description: 'Waste reappeared at metro pillar 42 corner.',
          photo: SAMPLE_IMAGES.garbage_before,
          submittedAt: new Date(now - 3 * 3600 * 1000),
          latitude: BASE_LAT + 0.018,
          longitude: BASE_LNG - 0.012,
        },
      ],
      status: 'RECURRING',
      isRecurring: true,
      recurringCount: 2,
      recurringHistory: [
        {
          resolvedAt: new Date(now - 5 * 24 * 3600 * 1000),
          reopenedAt: new Date(now - 3 * 3600 * 1000),
          notes: 'Cleared on Monday, fresh waste dumped on Friday. Flagged as Recurring Hotspot.',
        },
      ],
      slaHours: 12,
      slaDeadline: new Date(now + 9 * 3600 * 1000),
      resolutionEvidence: {
        photo: '',
      },
      verification: {
        overallStatus: 'PENDING',
      },
      citizenReverification: {},
      timeline: [
        {
          action: 'Earlier Incident Resolved',
          status: 'RESOLVED',
          timestamp: new Date(now - 5 * 24 * 3600 * 1000),
          actor: 'Azeez',
          actorRole: 'admin',
          notes: 'First cycle verified and closed.',
        },
        {
          action: 'Recurring Incident Detected',
          status: 'RECURRING',
          timestamp: new Date(now - 3 * 3600 * 1000),
          actor: 'Abdul',
          actorRole: 'citizen',
          notes: 'New report at same location classified as Recurring Hotspot rather than duplicate.',
          photo: SAMPLE_IMAGES.garbage_before,
        },
      ],
    },

    // MASTER INCIDENT 3: Pothole - Verified Resolved (Civil Lines)
    {
      _id: '663000000000000000000003',
      incidentId: 'INC-1008',
      category: 'Potholes',
      description: 'Dangerous pothole on middle lane causing vehicle skidding.',
      ward: 'Ward 2 - Civil Lines',
      address: 'Civil Lines Road, Near Secretariat Circle',
      latitude: BASE_LAT - 0.015,
      longitude: BASE_LNG + 0.022,
      firstReportedAt: new Date(now - 36 * 3600 * 1000),
      lastReportedAt: new Date(now - 36 * 3600 * 1000),
      reportCount: 1,
      linkedComplaintIds: ['CT-2026-0655'],
      linkedComplaints: [
        {
          complaintId: 'CT-2026-0655',
          citizenName: 'Farhan',
          description: 'Dangerous pothole on middle lane.',
          photo: SAMPLE_IMAGES.pothole_before,
          submittedAt: new Date(now - 36 * 3600 * 1000),
          latitude: BASE_LAT - 0.015,
          longitude: BASE_LNG + 0.022,
        },
      ],
      status: 'RESOLVED',
      isRecurring: false,
      slaHours: 48,
      slaDeadline: new Date(now + 12 * 3600 * 1000),
      resolutionEvidence: {
        photo: SAMPLE_IMAGES.pothole_after_geotagged,
        latitude: BASE_LAT - 0.015,
        longitude: BASE_LNG + 0.022,
        timestamp: new Date(now - 6 * 3600 * 1000),
        address: 'Secretariat Circle, Civil Lines',
        capturedBy: 'Azeez (Municipal Officer)',
      },
      verification: {
        imageSimilarity: 93,
        locationMatch: true,
        locationDistanceMeters: 8,
        timestampMatch: true,
        overallStatus: 'VERIFIED',
        confidence: 93,
        reviewRequired: false,
        reason: 'Evidence appears consistent. Road surface asphalted and level ground confirmed at verified coordinates.',
      },
      resolvedAt: new Date(now - 6 * 3600 * 1000),
      citizenReverification: {
        status: 'RESOLVED_CONFIRMED',
        reason: 'Citizen confirmed road is smooth and tarred.',
      },
      timeline: [
        {
          action: 'Incident Created',
          status: 'OPEN',
          timestamp: new Date(now - 36 * 3600 * 1000),
          actor: 'Farhan',
          actorRole: 'citizen',
          notes: '48h SLA initiated.',
          photo: SAMPLE_IMAGES.pothole_before,
        },
        {
          action: 'Geo-Tagged Evidence Captured & Verified',
          status: 'VERIFIED',
          timestamp: new Date(now - 6 * 3600 * 1000),
          actor: 'Azeez',
          actorRole: 'admin',
          notes: '✓ Evidence appears consistent (93% confidence, 8m GPS match).',
          photo: SAMPLE_IMAGES.pothole_after_geotagged,
        },
      ],
    },
  ];

  // 3. Individual Complaints (Linked to Master Incidents)
  const complaints = [
    // 1. Complaint by Abdul (Part of INC-1024)
    {
      _id: '662000000000000000000001',
      complaintId: 'CT-2026-0841',
      masterIncidentId: 'INC-1024',
      citizenId: users[1]._id,
      citizenName: 'Abdul',
      citizenEmail: 'citizen@civictrust.org',
      citizenPhone: '+91 98765 43210',
      category: 'Garbage Dump',
      description: 'Massive overflowing garbage dump blocking pedestrian walkway near Community Center gate. Foul smell spreading across the block.',
      beforePhoto: SAMPLE_IMAGES.garbage_before,
      resolutionPhoto: SAMPLE_IMAGES.garbage_after_suspicious_geotagged,
      latitude: BASE_LAT + 0.012,
      longitude: BASE_LNG + 0.015,
      ward: 'Ward 4 - Green Park',
      address: 'Near Gate 3, Community Center, Green Park Main',
      submittedAt: new Date(now - 10 * 3600 * 1000),
      slaHours: 12,
      slaDeadline: new Date(now + 2 * 3600 * 1000),
      status: 'UNVERIFIED',
      verificationStatus: 'UNVERIFIED',
      verificationConfidence: 78,
      verificationReason: 'Evidence could not be independently verified. Residual debris patterns remain detected in target coordinates. Human review required.',
      verificationMethod: 'Multi-Signal Verification (Image + GPS + Timeline)',
      resolutionEvidence: {
        photo: SAMPLE_IMAGES.garbage_after_suspicious_geotagged,
        latitude: BASE_LAT + 0.012,
        longitude: BASE_LNG + 0.015,
        timestamp: new Date(now - 1 * 3600 * 1000),
        address: 'Gate 3, Community Center, Green Park',
        capturedBy: 'Azeez (Municipal Officer)',
      },
      verificationSignals: {
        imageSimilarity: 34,
        locationMatch: true,
        locationDistanceMeters: 12,
        timestampMatch: true,
        overallStatus: 'REQUIRES HUMAN REVIEW',
        confidence: 78,
        reviewRequired: true,
        reason: 'Evidence could not be independently verified. Visual patterns indicate residual waste at site.',
      },
      citizenReverification: {
        status: '',
        reason: '',
      },
      reopenReason: '',
      reopenedAt: null,
      resolutionNotes: 'Contractor uploaded geo-tagged photo claiming clearance.',
      resolvedAt: new Date(now - 1 * 3600 * 1000),
      timeline: [
        {
          action: 'Complaint Filed by Abdul',
          status: 'SUBMITTED',
          timestamp: new Date(now - 10 * 3600 * 1000),
          actor: 'Abdul',
          actorRole: 'citizen',
          notes: 'Photo and GPS captured. 12-hour SLA clock initiated. Linked to Master Incident INC-1024.',
          photo: SAMPLE_IMAGES.garbage_before,
        },
        {
          action: 'Geo-Tagged Resolution Photo Captured',
          status: 'RESOLUTION_CLAIMED',
          timestamp: new Date(now - 1 * 3600 * 1000),
          actor: 'Azeez',
          actorRole: 'admin',
          notes: 'Captured via camera flow with embedded GPS overlay: Lat 28.6259° N, Long 77.2240° E.',
          photo: SAMPLE_IMAGES.garbage_after_suspicious_geotagged,
        },
        {
          action: 'Multi-Signal Verification Executed',
          status: 'UNVERIFIED',
          timestamp: new Date(now - 0.9 * 3600 * 1000),
          actor: 'Verification Engine',
          actorRole: 'system',
          notes: 'Overall: REQUIRES HUMAN REVIEW. Location: ✓ (12m), Timestamp: ✓, Image: ⚠ Residual debris detected.',
        },
      ],
    },

    // 2. Complaint by Farhan (Duplicate merged into INC-1024)
    {
      _id: '662000000000000000000002',
      complaintId: 'CT-2026-0842',
      masterIncidentId: 'INC-1024',
      citizenId: users[2]._id,
      citizenName: 'Farhan',
      citizenEmail: 'farhan@example.com',
      citizenPhone: '+91 98222 33344',
      category: 'Garbage Dump',
      description: 'Garbage spill spreading across road corner near Gate 3.',
      beforePhoto: SAMPLE_IMAGES.garbage_before,
      resolutionPhoto: SAMPLE_IMAGES.garbage_after_suspicious_geotagged,
      latitude: BASE_LAT + 0.0121,
      longitude: BASE_LNG + 0.0151,
      ward: 'Ward 4 - Green Park',
      address: 'Gate 3 road corner, Green Park Main',
      submittedAt: new Date(now - 5 * 3600 * 1000),
      slaHours: 12,
      slaDeadline: new Date(now + 2 * 3600 * 1000),
      status: 'UNVERIFIED',
      verificationStatus: 'UNVERIFIED',
      verificationConfidence: 78,
      verificationReason: 'Linked to Master Incident INC-1024. Evidence could not be independently verified.',
      verificationMethod: 'Multi-Signal Verification (Image + GPS + Timeline)',
      timeline: [
        {
          action: 'Complaint Filed by Farhan',
          status: 'SUBMITTED',
          timestamp: new Date(now - 5 * 3600 * 1000),
          actor: 'Farhan',
          actorRole: 'citizen',
          notes: '4-Signal Duplicate Match: Attached to Master Incident INC-1024 (Report #2).',
          photo: SAMPLE_IMAGES.garbage_before,
        },
      ],
    },

    // 3. Recurring Incident Complaint by Abdul (INC-1019)
    {
      _id: '662000000000000000000003',
      complaintId: 'CT-2026-0792',
      masterIncidentId: 'INC-1019',
      citizenId: users[1]._id,
      citizenName: 'Abdul',
      citizenEmail: 'citizen@civictrust.org',
      citizenPhone: '+91 98765 43210',
      category: 'Garbage Dump',
      description: 'Waste reappeared at metro pillar 42 corner after earlier cleaning.',
      beforePhoto: SAMPLE_IMAGES.garbage_before,
      resolutionPhoto: '',
      latitude: BASE_LAT + 0.018,
      longitude: BASE_LNG - 0.012,
      ward: 'Ward 1 - Central Market',
      address: 'Opposite Metro Pillar 42, Central Market Road',
      submittedAt: new Date(now - 3 * 3600 * 1000),
      slaHours: 12,
      slaDeadline: new Date(now + 9 * 3600 * 1000),
      status: 'SUBMITTED',
      verificationStatus: 'PENDING',
      verificationConfidence: 0,
      verificationReason: '',
      verificationMethod: 'Multi-Signal Verification (Image + GPS + Timeline)',
      reopenReason: '',
      reopenedAt: null,
      timeline: [
        {
          action: 'Complaint Filed by Abdul',
          status: 'SUBMITTED',
          timestamp: new Date(now - 3 * 3600 * 1000),
          actor: 'Abdul',
          actorRole: 'citizen',
          notes: 'Detected as Recurring Incident at Metro Pillar 42 hotspot. 12-hour SLA started.',
          photo: SAMPLE_IMAGES.garbage_before,
        },
      ],
    },

    // 4. Pothole by Farhan (INC-1008 - Verified Resolved)
    {
      _id: '662000000000000000000004',
      complaintId: 'CT-2026-0655',
      masterIncidentId: 'INC-1008',
      citizenId: users[2]._id,
      citizenName: 'Farhan',
      citizenEmail: 'farhan@example.com',
      citizenPhone: '+91 98222 33344',
      category: 'Potholes',
      description: 'Dangerous pothole on middle lane causing vehicle skidding during evening traffic.',
      beforePhoto: SAMPLE_IMAGES.pothole_before,
      resolutionPhoto: SAMPLE_IMAGES.pothole_after_geotagged,
      latitude: BASE_LAT - 0.015,
      longitude: BASE_LNG + 0.022,
      ward: 'Ward 2 - Civil Lines',
      address: 'Civil Lines Road, Near Secretariat Circle',
      submittedAt: new Date(now - 36 * 3600 * 1000),
      slaHours: 48,
      slaDeadline: new Date(now + 12 * 3600 * 1000),
      status: 'RESOLVED',
      verificationStatus: 'VERIFIED',
      verificationConfidence: 93,
      verificationReason: 'Evidence appears consistent. Level asphalt verified at matching coordinates (8m distance).',
      verificationMethod: 'Multi-Signal Verification (Image + GPS + Timeline)',
      resolutionEvidence: {
        photo: SAMPLE_IMAGES.pothole_after_geotagged,
        latitude: BASE_LAT - 0.015,
        longitude: BASE_LNG + 0.022,
        timestamp: new Date(now - 6 * 3600 * 1000),
        address: 'Secretariat Circle, Civil Lines',
        capturedBy: 'Azeez (Municipal Officer)',
      },
      verificationSignals: {
        imageSimilarity: 93,
        locationMatch: true,
        locationDistanceMeters: 8,
        timestampMatch: true,
        overallStatus: 'VERIFIED',
        confidence: 93,
        reviewRequired: false,
        reason: 'Evidence appears consistent. Visual clearance confirmed at verified geo-coordinates.',
      },
      citizenReverification: {
        status: 'RESOLVED_CONFIRMED',
        reason: 'Abdul & Farhan verified road is smooth and tarred.',
      },
      resolvedAt: new Date(now - 6 * 3600 * 1000),
      timeline: [
        {
          action: 'Complaint Filed by Farhan',
          status: 'SUBMITTED',
          timestamp: new Date(now - 36 * 3600 * 1000),
          actor: 'Farhan',
          actorRole: 'citizen',
          notes: '48h SLA clock started.',
          photo: SAMPLE_IMAGES.pothole_before,
        },
        {
          action: 'Geo-Tagged Evidence Captured & Verified',
          status: 'RESOLVED',
          timestamp: new Date(now - 6 * 3600 * 1000),
          actor: 'Azeez',
          actorRole: 'admin',
          notes: '✓ Evidence appears consistent (93% confidence, 8m GPS match). Closed with citizen confirmation.',
          photo: SAMPLE_IMAGES.pothole_after_geotagged,
        },
      ],
    },

    // 5. Construction Debris - Active 72h SLA
    {
      _id: '662000000000000000000005',
      complaintId: 'CT-2026-0910',
      citizenId: users[1]._id,
      citizenName: 'Abdul',
      citizenEmail: 'citizen@civictrust.org',
      citizenPhone: '+91 98765 43210',
      category: 'Construction Debris',
      description: 'Bricks, concrete blocks and sand dumped on public pathway from nearby residential remodel.',
      beforePhoto: SAMPLE_IMAGES.debris_before,
      resolutionPhoto: '',
      latitude: BASE_LAT + 0.025,
      longitude: BASE_LNG - 0.005,
      ward: 'Ward 3 - Industrial Zone',
      address: 'Plot 48B, Phase 2 Service Road',
      submittedAt: new Date(now - 18 * 3600 * 1000),
      slaHours: 72,
      slaDeadline: new Date(now + 54 * 3600 * 1000),
      status: 'IN_PROGRESS',
      verificationStatus: 'PENDING',
      verificationConfidence: 0,
      verificationReason: '',
      verificationMethod: 'Multi-Signal Verification (Image + GPS + Timeline)',
      timeline: [
        {
          action: 'Complaint Filed by Abdul',
          status: 'SUBMITTED',
          timestamp: new Date(now - 18 * 3600 * 1000),
          actor: 'Abdul',
          actorRole: 'citizen',
          notes: '72h Construction Debris SLA active.',
          photo: SAMPLE_IMAGES.debris_before,
        },
      ],
    },

    // 6. OSINT Demo 1: High Confidence Verified (Green Park Market Signboard + Municipal Bin)
    {
      _id: '662000000000000000000006',
      complaintId: 'CT-2026-0901',
      citizenId: users[1]._id,
      citizenName: 'Abdul',
      citizenEmail: 'citizen@civictrust.org',
      citizenPhone: '+91 98765 43210',
      category: 'Garbage Dump',
      description: 'Major overflowing solid waste on sidewalk. Citizen reported with image only (no GPS sensors enabled). Shop signboard "Gupta Electricals & Sanitary, Ward 4" visible in background.',
      beforePhoto: SAMPLE_IMAGES.osint_green_park_sign,
      resolutionPhoto: '',
      latitude: null,
      longitude: null,
      ward: 'Location Not Available',
      address: 'Location Not Available',
      locationStatus: 'LOCATION_NOT_AVAILABLE',
      isLocationEstimated: false,
      submittedAt: new Date(now - 4 * 3600 * 1000),
      slaHours: 12,
      slaDeadline: new Date(now + 8 * 3600 * 1000),
      status: 'SUBMITTED',
      verificationStatus: 'REQUIRES HUMAN REVIEW',
      verificationConfidence: 0,
      verificationReason: 'Citizen submitted without GPS coordinates. Pending OSINT multi-signal location estimation.',
      verificationMethod: 'Pending OSINT Verification (OCR + Landmarks + Scene Similarity + EXIF)',
      timeline: [
        {
          action: 'Complaint Submitted without GPS',
          status: 'SUBMITTED',
          timestamp: new Date(now - 4 * 3600 * 1000),
          actor: 'Abdul',
          actorRole: 'citizen',
          notes: 'Citizen uploaded evidence photo without GPS location. Identity protected. Queued for Admin OSINT verification.',
          photo: SAMPLE_IMAGES.osint_green_park_sign,
        },
      ],
    },

    // 7. OSINT Demo 2: Conflicting Signals (Civil Lines sign vs Industrial shed)
    {
      _id: '662000000000000000000007',
      complaintId: 'CT-2026-0902',
      citizenId: users[2]._id,
      citizenName: 'Farhan',
      citizenEmail: 'farhan@example.com',
      citizenPhone: '+91 98222 33344',
      category: 'Construction Debris',
      description: 'Construction rubble blocking walkway. Citizen reported without location. Signboard claims "Civil Lines North Sector 2", but building behind shows "Sharma Motors Heavy Industrial Workshop".',
      beforePhoto: SAMPLE_IMAGES.osint_conflicting_signs,
      resolutionPhoto: '',
      latitude: null,
      longitude: null,
      ward: 'Location Not Available',
      address: 'Location Not Available',
      locationStatus: 'LOCATION_NOT_AVAILABLE',
      isLocationEstimated: false,
      submittedAt: new Date(now - 6 * 3600 * 1000),
      slaHours: 72,
      slaDeadline: new Date(now + 66 * 3600 * 1000),
      status: 'SUBMITTED',
      verificationStatus: 'REQUIRES HUMAN REVIEW',
      verificationConfidence: 0,
      verificationReason: 'Citizen submitted without GPS coordinates. Requires OSINT location estimation.',
      verificationMethod: 'Pending OSINT Verification (OCR + Landmarks + Scene Similarity + EXIF)',
      timeline: [
        {
          action: 'Complaint Submitted without GPS',
          status: 'SUBMITTED',
          timestamp: new Date(now - 6 * 3600 * 1000),
          actor: 'Farhan',
          actorRole: 'citizen',
          notes: 'Report filed with photo only. No device GPS provided. Queued for Admin OSINT location audit.',
          photo: SAMPLE_IMAGES.osint_conflicting_signs,
        },
      ],
    },

    // 8. OSINT Demo 3: Uncertain / Blurry Road Crater
    {
      _id: '662000000000000000000008',
      complaintId: 'CT-2026-0903',
      citizenId: users[1]._id,
      citizenName: 'Abdul',
      citizenEmail: 'citizen@civictrust.org',
      citizenPhone: '+91 98765 43210',
      category: 'Potholes',
      description: 'Dangerous road fissure crater. Image captured closely on pavement with no visible street signs or surrounding buildings. GPS disabled by citizen.',
      beforePhoto: SAMPLE_IMAGES.osint_blurry_pothole,
      resolutionPhoto: '',
      latitude: null,
      longitude: null,
      ward: 'Location Not Available',
      address: 'Location Not Available',
      locationStatus: 'LOCATION_NOT_AVAILABLE',
      isLocationEstimated: false,
      submittedAt: new Date(now - 8 * 3600 * 1000),
      slaHours: 48,
      slaDeadline: new Date(now + 40 * 3600 * 1000),
      status: 'SUBMITTED',
      verificationStatus: 'REQUIRES HUMAN REVIEW',
      verificationConfidence: 0,
      verificationReason: 'Citizen submitted without GPS coordinates. Requires OSINT location estimation.',
      verificationMethod: 'Pending OSINT Verification (OCR + Landmarks + Scene Similarity + EXIF)',
      timeline: [
        {
          action: 'Complaint Submitted without GPS',
          status: 'SUBMITTED',
          timestamp: new Date(now - 8 * 3600 * 1000),
          actor: 'Abdul',
          actorRole: 'citizen',
          notes: 'Report filed with close-up photo only. Zero GPS coordinates attached. Queued for Admin OSINT verification.',
          photo: SAMPLE_IMAGES.osint_blurry_pothole,
        },
      ],
    },
  ];

  return { users, masterIncidents, complaints, sampleImages: SAMPLE_IMAGES, wards: WARDS };
};

module.exports = {
  SAMPLE_IMAGES,
  WARDS,
  createSyntheticData,
};
