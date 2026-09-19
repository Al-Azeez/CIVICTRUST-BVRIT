const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const MasterIncident = require('../models/MasterIncident');
const Verification = require('../models/Verification');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { calculateSlaDeadline, getSlaStatus } = require('../services/slaService');
const { verifyResolutionPhoto } = require('../services/photoVerificationService');
const { matchComplaintToMasterIncident } = require('../services/incidentMatcher');
const { getIsMemoryMode, getMemoryStore } = require('../config/db');

// Helper to decorate complaint with live SLA metrics
const decorateComplaint = (c) => {
  const plain = c.toObject ? c.toObject() : { ...c };
  const slaInfo = getSlaStatus(plain.submittedAt, plain.slaDeadline, plain.status, plain.resolvedAt);
  return {
    ...plain,
    slaInfo,
  };
};

const decorateMasterIncident = (m) => {
  const plain = m.toObject ? m.toObject() : { ...m };
  const slaInfo = getSlaStatus(plain.firstReportedAt, plain.slaDeadline, plain.status, plain.resolvedAt);
  return {
    ...plain,
    slaInfo,
  };
};

// @route   GET /api/complaints/master-incidents
router.get('/master-incidents', async (req, res) => {
  try {
    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      const decorated = (store.masterIncidents || []).map(decorateMasterIncident);
      decorated.sort((a, b) => new Date(b.lastReportedAt || b.firstReportedAt) - new Date(a.lastReportedAt || a.firstReportedAt));
      return res.json({
        total: decorated.length,
        masterIncidents: decorated,
      });
    }

    const rawList = await MasterIncident.find({}).sort({ lastReportedAt: -1 });
    const decorated = rawList.map(decorateMasterIncident);
    res.json({
      total: decorated.length,
      masterIncidents: decorated,
    });
  } catch (error) {
    console.error('Fetch master incidents error:', error);
    res.status(500).json({ message: 'Error retrieving master incidents' });
  }
});

// @route   GET /api/complaints/master-incidents/:id
router.get('/master-incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      const inc = (store.masterIncidents || []).find(
        (m) => m._id.toString() === id || m.incidentId === id
      );
      if (!inc) {
        return res.status(404).json({ message: 'Master Incident not found' });
      }
      return res.json({ masterIncident: decorateMasterIncident(inc) });
    }

    const inc = id.startsWith('INC-')
      ? await MasterIncident.findOne({ incidentId: id })
      : await MasterIncident.findById(id);

    if (!inc) {
      return res.status(404).json({ message: 'Master Incident not found' });
    }

    res.json({ masterIncident: decorateMasterIncident(inc) });
  } catch (error) {
    console.error('Get master incident detail error:', error);
    res.status(500).json({ message: 'Error retrieving master incident details' });
  }
});

// @route   GET /api/complaints
router.get('/', async (req, res) => {
  try {
    const {
      category,
      ward,
      status,
      verificationStatus,
      citizenId,
      search,
      slaStatus,
      masterIncidentId,
      limit = 100,
    } = req.query;

    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      let list = [...store.complaints];

      if (category) list = list.filter((c) => c.category === category);
      if (ward) list = list.filter((c) => c.ward === ward);
      if (status) list = list.filter((c) => c.status === status);
      if (verificationStatus) list = list.filter((c) => c.verificationStatus === verificationStatus);
      if (citizenId) list = list.filter((c) => c.citizenId && c.citizenId.toString() === citizenId.toString());
      if (masterIncidentId) list = list.filter((c) => c.masterIncidentId === masterIncidentId);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(
          (c) =>
            c.complaintId.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.address.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            (c.masterIncidentId && c.masterIncidentId.toLowerCase().includes(q))
        );
      }

      let decorated = list.map(decorateComplaint);

      if (slaStatus) {
        decorated = decorated.filter((c) => c.slaInfo.slaState === slaStatus);
      }

      decorated.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      return res.json({
        total: decorated.length,
        complaints: decorated.slice(0, parseInt(limit)),
      });
    }

    // MongoDB Mode
    let query = {};
    if (category) query.category = category;
    if (ward) query.ward = ward;
    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (citizenId) query.citizenId = citizenId;
    if (masterIncidentId) query.masterIncidentId = masterIncidentId;
    if (search) {
      query.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { masterIncidentId: { $regex: search, $options: 'i' } },
      ];
    }

    const rawList = await Complaint.find(query).sort({ submittedAt: -1 }).limit(parseInt(limit));
    let decorated = rawList.map(decorateComplaint);

    if (slaStatus) {
      decorated = decorated.filter((c) => c.slaInfo.slaState === slaStatus);
    }

    res.json({
      total: decorated.length,
      complaints: decorated,
    });
  } catch (error) {
    console.error('Fetch complaints error:', error);
    res.status(500).json({ message: 'Error retrieving complaints' });
  }
});

// @route   GET /api/complaints/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      const complaint = store.complaints.find(
        (c) => c._id.toString() === id || c.complaintId === id
      );
      if (!complaint) {
        return res.status(404).json({ message: 'Civic complaint not found' });
      }
      return res.json({ complaint: decorateComplaint(complaint) });
    }

    let complaint;
    if (id.startsWith('CT-')) {
      complaint = await Complaint.findOne({ complaintId: id });
    } else {
      complaint = await Complaint.findById(id);
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Civic complaint not found' });
    }

    res.json({ complaint: decorateComplaint(complaint) });
  } catch (error) {
    console.error('Get complaint detail error:', error);
    res.status(500).json({ message: 'Error retrieving complaint details' });
  }
});

// @route   POST /api/complaints (Citizen reports an issue - evaluates 4-signal Master Incident matching)
router.post('/', protect, async (req, res) => {
  try {
    const {
      category,
      description,
      beforePhoto,
      latitude,
      longitude,
      ward,
      address,
    } = req.body;

    // Check required fields (photo, category, description). GPS is optional!
    if (!category || !description || !beforePhoto) {
      return res.status(400).json({
        message: 'Missing required fields: photo, category, and description are required.',
      });
    }

    const hasGps =
      latitude !== undefined &&
      latitude !== null &&
      latitude !== '' &&
      longitude !== undefined &&
      longitude !== null &&
      longitude !== '';

    const parsedLat = hasGps ? parseFloat(latitude) : null;
    const parsedLng = hasGps ? parseFloat(longitude) : null;
    const locationStatus = hasGps ? 'GPS_AVAILABLE' : 'LOCATION_NOT_AVAILABLE';
    const finalAddress = hasGps
      ? (address && address !== 'Acquiring exact incident location...' ? address : 'Civic Junction Area')
      : 'Location Not Available';
    const finalWard = hasGps
      ? (ward && !ward.startsWith('Detecting') ? ward : 'Ward 1 - Central Market')
      : (ward && !ward.startsWith('Detecting') && ward !== 'Location Not Available' ? ward : 'Location Not Available');

    const submittedAt = new Date();
    const { slaHours, slaDeadline } = calculateSlaDeadline(category, submittedAt);
    const complaintId = 'CT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const citizenName = req.user.name || 'Abdul';

    // 1. Evaluate 4-Signal Matching against Master Incidents (only if GPS is available)
    let masterIncidentsList = [];
    if (getIsMemoryMode()) {
      masterIncidentsList = getMemoryStore().masterIncidents || [];
    } else {
      masterIncidentsList = await MasterIncident.find({});
    }

    let matchResult = { isMatch: false, isRecurring: false, masterIncident: null };
    if (hasGps) {
      matchResult = matchComplaintToMasterIncident(
        {
          category,
          latitude: parsedLat,
          longitude: parsedLng,
          submittedAt,
          beforePhoto,
        },
        masterIncidentsList
      );
    }

    let assignedMasterIncidentId = '';
    let isRecurringIncident = false;
    let matchReport = null;

    if (matchResult.isMatch && matchResult.masterIncident) {
      if (matchResult.isRecurring) {
        // Recurring Hotspot: New Incident at historical location
        isRecurringIncident = true;
        const newIncidentId = 'INC-' + Math.floor(1000 + Math.random() * 9000);
        assignedMasterIncidentId = newIncidentId;

        const newMaster = {
          _id: 'mi_' + Date.now(),
          incidentId: newIncidentId,
          category,
          description,
          ward: finalWard,
          address: finalAddress,
          latitude: parsedLat,
          longitude: parsedLng,
          firstReportedAt: submittedAt,
          lastReportedAt: submittedAt,
          reportCount: 1,
          linkedComplaintIds: [complaintId],
          linkedComplaints: [
            {
              complaintId,
              citizenName,
              description,
              photo: beforePhoto,
              submittedAt,
              latitude: parsedLat,
              longitude: parsedLng,
            },
          ],
          status: 'RECURRING',
          isRecurring: true,
          recurringCount: (matchResult.masterIncident.recurringCount || 0) + 1,
          recurringHistory: [
            ...(matchResult.masterIncident.recurringHistory || []),
            {
              resolvedAt: matchResult.masterIncident.resolvedAt || new Date(submittedAt.getTime() - 48 * 3600000),
              reopenedAt: submittedAt,
              notes: 'Recurring grievance at historical resolved location.',
            },
          ],
          slaHours,
          slaDeadline,
          timeline: [
            {
              action: 'Recurring Master Incident Detected',
              status: 'RECURRING',
              timestamp: submittedAt,
              actor: citizenName,
              actorRole: 'citizen',
              notes: `New report matches previously resolved site (${matchResult.signals?.distanceMeters || 0}m). Classified as Recurring Hotspot.`,
            },
          ],
        };

        if (getIsMemoryMode()) {
          getMemoryStore().masterIncidents.unshift(newMaster);
        } else {
          await MasterIncident.create(newMaster);
        }

        matchReport = {
          type: 'RECURRING_HOTSPOT',
          message: 'Recurring incident detected at historical location.',
          incidentId: newIncidentId,
          signals: matchResult.signals,
        };
      } else {
        // Active Duplicate Report: Attach to existing Master Incident
        assignedMasterIncidentId = matchResult.masterIncident.incidentId;
        const existingMaster = matchResult.masterIncident;
        existingMaster.reportCount = (existingMaster.reportCount || 1) + 1;
        existingMaster.lastReportedAt = submittedAt;
        existingMaster.linkedComplaintIds.push(complaintId);
        existingMaster.linkedComplaints.push({
          complaintId,
          citizenName,
          description,
          photo: beforePhoto,
          submittedAt,
          latitude: parsedLat,
          longitude: parsedLng,
        });
        existingMaster.timeline.push({
          action: `Citizen Evidence Linked (#${existingMaster.reportCount})`,
          status: existingMaster.status,
          timestamp: submittedAt,
          actor: citizenName,
          actorRole: 'citizen',
          notes: `Matched 4 signals (Location ${matchResult.signals?.distanceMeters || 0}m, Category Match, Image Similarity ${matchResult.signals?.imageSimilarity || 0}%). Attached report.`,
          photo: beforePhoto,
        });

        if (!getIsMemoryMode()) {
          await existingMaster.save();
        }

        matchReport = {
          type: 'DUPLICATE_LINKED',
          message: `Linked to existing Master Incident ${assignedMasterIncidentId} based on 4-signal verification.`,
          incidentId: assignedMasterIncidentId,
          signals: matchResult.signals,
        };
      }
    } else {
      // New Independent Master Incident
      const newIncidentId = 'INC-' + Math.floor(1000 + Math.random() * 9000);
      assignedMasterIncidentId = newIncidentId;

      const newMaster = {
        _id: 'mi_' + Date.now(),
        incidentId: newIncidentId,
        category,
        description,
        ward: finalWard,
        address: finalAddress,
        latitude: parsedLat,
        longitude: parsedLng,
        firstReportedAt: submittedAt,
        lastReportedAt: submittedAt,
        reportCount: 1,
        linkedComplaintIds: [complaintId],
        linkedComplaints: [
          {
            complaintId,
            citizenName,
            description,
            photo: beforePhoto,
            submittedAt,
            latitude: parsedLat,
            longitude: parsedLng,
          },
        ],
        status: 'OPEN',
        isRecurring: false,
        slaHours,
        slaDeadline,
        timeline: [
          {
            action: 'Master Incident Created',
            status: 'OPEN',
            timestamp: submittedAt,
            actor: citizenName,
            actorRole: 'citizen',
            notes: hasGps
              ? `Master Incident ${newIncidentId} initiated. SLA target: ${slaHours}h.`
              : `Master Incident ${newIncidentId} initiated WITHOUT GPS coordinates. Location queued for OSINT estimation. SLA target: ${slaHours}h.`,
            photo: beforePhoto,
          },
        ],
      };

      if (getIsMemoryMode()) {
        getMemoryStore().masterIncidents.unshift(newMaster);
      } else {
        await MasterIncident.create(newMaster);
      }

      matchReport = {
        type: 'NEW_INCIDENT',
        message: hasGps
          ? `New Master Incident ${newIncidentId} created.`
          : `New Master Incident ${newIncidentId} created (Location Not Available — OSINT verification pending).`,
        incidentId: newIncidentId,
        signals: null,
      };
    }

    const initialTimeline = [
      {
        action: 'Complaint Submitted',
        status: 'SUBMITTED',
        timestamp: submittedAt,
        actor: citizenName,
        actorRole: 'citizen',
        notes: hasGps
          ? `Photo & GPS logged. SLA deadline: ${slaHours} hours. Linked to Master Incident ${assignedMasterIncidentId}.`
          : `Photo logged WITHOUT GPS (Location Not Available). Privacy preserved. Queued for Admin OSINT verification. SLA deadline: ${slaHours} hours. Linked to Master Incident ${assignedMasterIncidentId}.`,
        photo: beforePhoto,
      },
    ];

    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      const newComplaint = {
        _id: 'c_' + Date.now(),
        complaintId,
        masterIncidentId: assignedMasterIncidentId,
        citizenId: req.user._id,
        citizenName,
        citizenEmail: req.user.email,
        citizenPhone: req.user.phone || '+91 98765 43210',
        category,
        description,
        beforePhoto,
        resolutionPhoto: '',
        reopenPhoto: '',
        latitude: parsedLat,
        longitude: parsedLng,
        ward: finalWard,
        address: finalAddress,
        locationStatus,
        isLocationEstimated: false,
        submittedAt,
        slaHours,
        slaDeadline,
        status: 'SUBMITTED',
        verificationStatus: hasGps ? 'PENDING' : 'REQUIRES HUMAN REVIEW',
        verificationConfidence: 0,
        verificationReason: hasGps ? '' : 'Citizen submitted report without GPS. Requires OSINT location estimation.',
        verificationMethod: hasGps
          ? 'Multi-Signal Verification (Image + GPS + Timeline)'
          : 'Pending OSINT Verification (OCR + Landmarks + Scene Similarity + EXIF)',
        reopenReason: '',
        reopenedAt: null,
        resolutionNotes: '',
        resolvedAt: null,
        timeline: initialTimeline,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.complaints.unshift(newComplaint);
      return res.status(201).json({
        message: 'Civic complaint registered successfully. SLA clock started.',
        complaint: decorateComplaint(newComplaint),
        matchReport,
      });
    }

    // MongoDB Mode
    const complaint = await Complaint.create({
      complaintId,
      masterIncidentId: assignedMasterIncidentId,
      citizenId: req.user._id,
      citizenName,
      citizenEmail: req.user.email,
      citizenPhone: req.user.phone || '+91 98765 43210',
      category,
      description,
      beforePhoto,
      latitude: parsedLat,
      longitude: parsedLng,
      ward: finalWard,
      address: finalAddress,
      locationStatus,
      isLocationEstimated: false,
      submittedAt,
      slaHours,
      slaDeadline,
      status: 'SUBMITTED',
      verificationStatus: hasGps ? 'PENDING' : 'REQUIRES HUMAN REVIEW',
      verificationReason: hasGps ? '' : 'Citizen submitted report without GPS. Requires OSINT location estimation.',
      verificationMethod: hasGps
        ? 'Multi-Signal Verification (Image + GPS + Timeline)'
        : 'Pending OSINT Verification (OCR + Landmarks + Scene Similarity + EXIF)',
      timeline: initialTimeline,
    });

    res.status(201).json({
      message: 'Civic complaint registered successfully. SLA clock started.',
      complaint: decorateComplaint(complaint),
      matchReport,
    });
  } catch (error) {
    console.error('Submit complaint error:', error);
    res.status(500).json({ message: 'Error submitting complaint' });
  }
});

// @route   POST /api/complaints/:id/resolve (Admin claims resolution with Geo-Tagged photo & triggers multi-signal verification)
router.post('/:id/resolve', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      resolutionPhoto,
      resolutionLatitude,
      resolutionLongitude,
      resolutionTimestamp,
      resolutionAddress,
      resolutionNotes,
      simulationMode = 'AUTO', // 'AUTO' | 'FORCE_VERIFIED' | 'FORCE_SUSPICIOUS' | 'LOCATION_MISMATCH'
    } = req.body;

    if (!resolutionPhoto) {
      return res.status(400).json({ message: 'Geo-tagged resolution photo evidence is required.' });
    }

    let complaint;
    let store;

    if (getIsMemoryMode()) {
      store = getMemoryStore();
      complaint = store.complaints.find(
        (c) => c._id.toString() === id || c.complaintId === id
      );
    } else {
      complaint = id.startsWith('CT-')
        ? await Complaint.findOne({ complaintId: id })
        : await Complaint.findById(id);
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const now = new Date();
    const resLat = resolutionLatitude !== undefined ? parseFloat(resolutionLatitude) : complaint.latitude;
    const resLon = resolutionLongitude !== undefined ? parseFloat(resolutionLongitude) : complaint.longitude;
    const resTime = resolutionTimestamp ? new Date(resolutionTimestamp) : now;

    // Trigger Multi-Signal Verification Service
    const verificationResult = await verifyResolutionPhoto({
      category: complaint.category,
      beforePhoto: complaint.beforePhoto,
      resolutionPhoto,
      complaintLocation: { latitude: complaint.latitude, longitude: complaint.longitude },
      resolutionLocation: { latitude: resLat, longitude: resLon },
      complaintTimestamp: complaint.submittedAt,
      resolutionTimestamp: resTime,
      simulationMode,
      notes: resolutionNotes,
    });

    const isVerified = verificationResult.overallStatus === 'VERIFIED';
    const newStatus = isVerified ? 'VERIFIED' : 'UNVERIFIED';

    const geoEvidence = {
      photo: resolutionPhoto,
      latitude: resLat,
      longitude: resLon,
      timestamp: resTime,
      address: resolutionAddress || complaint.address,
      capturedBy: req.user.name || 'Azeez (Municipal Officer)',
    };

    complaint.resolutionPhoto = resolutionPhoto;
    complaint.resolutionNotes = resolutionNotes || 'Geo-tagged evidence captured on site.';
    complaint.resolvedAt = now;
    complaint.resolutionEvidence = geoEvidence;
    complaint.verificationStatus = isVerified ? 'VERIFIED' : 'UNVERIFIED';
    complaint.verificationConfidence = verificationResult.confidence;
    complaint.verificationReason = verificationResult.reason;
    complaint.verificationSignals = {
      imageSimilarity: verificationResult.signals.imageComparison.similarityPercent,
      locationMatch: verificationResult.signals.locationMatch.passed,
      locationDistanceMeters: verificationResult.signals.locationMatch.distanceMeters,
      timestampMatch: verificationResult.signals.timestampMatch.passed,
      overallStatus: verificationResult.overallStatus,
      confidence: verificationResult.confidence,
      reviewRequired: verificationResult.reviewRequired,
      reason: verificationResult.reason,
    };
    complaint.status = newStatus;

    // Timeline entries
    complaint.timeline.push({
      action: 'Geo-Tagged Resolution Photo Captured',
      status: 'RESOLUTION_CLAIMED',
      timestamp: new Date(now.getTime() - 2000),
      actor: req.user.name || 'Azeez',
      actorRole: 'admin',
      notes: `Geo-Tagged Evidence recorded at Lat ${resLat.toFixed(4)}°, Long ${resLon.toFixed(4)}°. Notes: ${resolutionNotes || 'Site cleared'}`,
      photo: resolutionPhoto,
    });

    complaint.timeline.push({
      action: `Multi-Signal Verification: ${verificationResult.overallStatus}`,
      status: newStatus,
      timestamp: now,
      actor: 'Multi-Signal Verification Engine',
      actorRole: 'system',
      notes: `Signals: Image ${verificationResult.signals.imageComparison.similarityPercent}%, Location Match: ${verificationResult.signals.locationMatch.passed ? '✓' : '⚠'} (${verificationResult.signals.locationMatch.distanceMeters}m), Timeline: ${verificationResult.signals.timestampMatch.passed ? '✓' : '⚠'}. ${verificationResult.reason}`,
    });

    // Also update linked Master Incident if present
    if (complaint.masterIncidentId) {
      if (getIsMemoryMode()) {
        const master = store.masterIncidents.find((m) => m.incidentId === complaint.masterIncidentId);
        if (master) {
          master.resolutionEvidence = geoEvidence;
          master.verification = complaint.verificationSignals;
          master.status = isVerified ? 'VERIFIED' : 'UNVERIFIED';
          master.resolvedAt = now;
          master.timeline.push({
            action: `Resolution Geo-Evidence Captured (${complaint.complaintId})`,
            status: isVerified ? 'VERIFIED' : 'UNVERIFIED',
            timestamp: now,
            actor: req.user.name || 'Azeez',
            actorRole: 'admin',
            notes: verificationResult.reason,
            photo: resolutionPhoto,
          });
        }
      } else {
        await MasterIncident.findOneAndUpdate(
          { incidentId: complaint.masterIncidentId },
          {
            resolutionEvidence: geoEvidence,
            verification: complaint.verificationSignals,
            status: isVerified ? 'VERIFIED' : 'UNVERIFIED',
            resolvedAt: now,
          }
        );
      }
    }

    if (getIsMemoryMode()) {
      complaint.updatedAt = new Date();
    } else {
      await complaint.save();
    }

    res.json({
      message: isVerified
        ? 'Resolution evidence verified: Multi-spectral clearance & location confirmed.'
        : 'Evidence could not be independently verified. Flagged for human review.',
      complaint: decorateComplaint(complaint),
      verification: verificationResult,
    });
  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({ message: 'Error processing resolution verification' });
  }
});

// @route   POST /api/complaints/:id/reverify (Citizen Re-verification: Choice of [Issue Resolved] or [Issue Still Exists])
router.post('/:id/reverify', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reopenReason, reopenPhoto } = req.body; // action: 'CONFIRM_RESOLVED' | 'DISPUTE_STILL_EXISTS'

    let complaint;
    let store;
    if (getIsMemoryMode()) {
      store = getMemoryStore();
      complaint = store.complaints.find(
        (c) => c._id.toString() === id || c.complaintId === id
      );
    } else {
      complaint = id.startsWith('CT-')
        ? await Complaint.findOne({ complaintId: id })
        : await Complaint.findById(id);
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const now = new Date();
    const citizenName = req.user.name || 'Abdul';

    if (action === 'CONFIRM_RESOLVED') {
      // Citizen confirms issue is cleanly resolved
      complaint.status = 'RESOLVED';
      complaint.verificationStatus = 'VERIFIED';
      complaint.citizenReverification = {
        status: 'RESOLVED_CONFIRMED',
        reason: reopenReason || 'Citizen confirmed issue resolved on site.',
        timestamp: now,
      };

      complaint.timeline.push({
        action: 'Citizen Confirmed Resolution',
        status: 'RESOLVED',
        timestamp: now,
        actor: citizenName,
        actorRole: 'citizen',
        notes: `Citizen ${citizenName} inspected site and confirmed issue resolved. Grievance closed with verified audit trail.`,
      });
    } else {
      // Citizen disputes: "Issue Still Exists"
      if (!reopenReason) {
        return res.status(400).json({ message: 'Please provide a clear reason describing why the issue still exists.' });
      }

      complaint.status = 'REVERIFICATION_REQUIRED';
      complaint.reopenReason = reopenReason;
      complaint.reopenedAt = now;
      if (reopenPhoto) complaint.reopenPhoto = reopenPhoto;

      complaint.citizenReverification = {
        status: 'DISPUTED_STILL_EXISTS',
        reason: reopenReason,
        rebuttalPhoto: reopenPhoto || '',
        timestamp: now,
      };

      complaint.timeline.push({
        action: 'Citizen Dispute: Issue Still Exists',
        status: 'REVERIFICATION_REQUIRED',
        timestamp: now,
        actor: citizenName,
        actorRole: 'citizen',
        notes: `Citizen rebuttal: "${reopenReason}". Escalated for municipal supervisor review & re-dispatch.`,
        photo: reopenPhoto || '',
      });

      // Update linked Master Incident
      if (complaint.masterIncidentId) {
        if (getIsMemoryMode()) {
          const master = store.masterIncidents.find((m) => m.incidentId === complaint.masterIncidentId);
          if (master) {
            master.status = 'REVERIFICATION_REQUIRED';
            master.citizenReverification = complaint.citizenReverification;
            master.timeline.push({
              action: `Citizen Re-verification Dispute (${complaint.complaintId})`,
              status: 'REVERIFICATION_REQUIRED',
              timestamp: now,
              actor: citizenName,
              actorRole: 'citizen',
              notes: `Citizen disputed resolution: "${reopenReason}".`,
              photo: reopenPhoto || '',
            });
          }
        }
      }
    }

    if (getIsMemoryMode()) {
      complaint.updatedAt = now;
    } else {
      await complaint.save();
    }

    res.json({
      message: action === 'CONFIRM_RESOLVED'
        ? 'Resolution confirmed. Complaint successfully verified and closed.'
        : 'Dispute recorded. Re-verification required — complaint escalated to municipal supervisor.',
      complaint: decorateComplaint(complaint),
    });
  } catch (error) {
    console.error('Re-verify complaint error:', error);
    res.status(500).json({ message: 'Error submitting citizen re-verification' });
  }
});

// @route   POST /api/complaints/:id/assign (Assign municipal worker / crew)
router.post('/:id/assign', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { workerName, workerPhone, workerTeam, assignmentNotes } = req.body;

    if (!workerName) {
      return res.status(400).json({ message: 'Worker or team name is required.' });
    }

    let complaint;
    let store;
    if (getIsMemoryMode()) {
      store = getMemoryStore();
      complaint = store.complaints.find(
        (c) => c._id.toString() === id || c.complaintId === id
      );
    } else {
      complaint = id.startsWith('CT-')
        ? await Complaint.findOne({ complaintId: id })
        : await Complaint.findById(id);
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const now = new Date();
    complaint.status = 'IN_PROGRESS';
    complaint.assignedWorker = {
      name: workerName,
      phone: workerPhone || '+91 98765 43210',
      team: workerTeam || 'Municipal Field Operations',
      assignedAt: now,
      assignedBy: req.user.name || 'Supervisor Azeez',
      notes: assignmentNotes || '',
    };

    complaint.timeline.push({
      action: `Municipal Worker Assigned: ${workerName}`,
      status: 'IN_PROGRESS',
      timestamp: now,
      actor: req.user.name || 'Supervisor Azeez',
      actorRole: 'admin',
      notes: `Field unit dispatched: ${workerName} (${workerTeam || 'Sanitation Rapid Response'}). ${assignmentNotes || ''}`,
    });

    if (getIsMemoryMode()) {
      complaint.updatedAt = now;
    } else {
      await complaint.save();
    }

    res.json({
      message: `Assigned successfully to ${workerName}. Status updated to In Progress.`,
      complaint: decorateComplaint(complaint),
    });
  } catch (error) {
    console.error('Assign worker error:', error);
    res.status(500).json({ message: 'Error assigning municipal worker' });
  }
});

// @route   POST /api/complaints/:id/admin-override (Supervisor Human Override)
router.post('/:id/admin-override', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetStatus, overrideNotes } = req.body; // targetStatus: 'VERIFIED' | 'IN_PROGRESS' | 'REOPENED'

    let complaint;
    let store;
    if (getIsMemoryMode()) {
      store = getMemoryStore();
      complaint = store.complaints.find(
        (c) => c._id.toString() === id || c.complaintId === id
      );
    } else {
      complaint = id.startsWith('CT-')
        ? await Complaint.findOne({ complaintId: id })
        : await Complaint.findById(id);
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const now = new Date();
    const supervisorName = req.user.name || 'Supervisor Azeez';

    if (targetStatus === 'VERIFIED') {
      complaint.status = 'VERIFIED';
      complaint.verificationStatus = 'VERIFIED';
      complaint.verificationReason = overrideNotes || 'Supervisor manual inspection confirmed site is cleanly resolved.';
      complaint.resolvedAt = now;

      complaint.timeline.push({
        action: 'Supervisor Human Verification Override: Confirmed Clean',
        status: 'VERIFIED',
        timestamp: now,
        actor: supervisorName,
        actorRole: 'admin',
        notes: overrideNotes || 'Supervisor inspected ground truth evidence and confirmed complete clearance.',
      });
    } else {
      complaint.status = 'IN_PROGRESS';
      complaint.verificationStatus = 'REQUIRES HUMAN REVIEW';
      complaint.verificationReason = overrideNotes || 'Supervisor rejected claim. Re-dispatching ground crew.';

      complaint.timeline.push({
        action: 'Supervisor Audit Override: Re-dispatch Ground Crew',
        status: 'IN_PROGRESS',
        timestamp: now,
        actor: supervisorName,
        actorRole: 'admin',
        notes: overrideNotes || 'Supervisor reviewed evidence and determined additional cleaning is required.',
      });
    }

    if (getIsMemoryMode()) {
      complaint.updatedAt = now;
    } else {
      await complaint.save();
    }

    res.json({
      message: `Supervisor audit recorded. Status updated to ${targetStatus}.`,
      complaint: decorateComplaint(complaint),
    });
  } catch (error) {
    console.error('Admin override error:', error);
    res.status(500).json({ message: 'Error processing supervisor override' });
  }
});

module.exports = router;
