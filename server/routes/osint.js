const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getIsMemoryMode, getMemoryStore } = require('../config/db');
const {
  runOsintAnalysis,
  analyzeCustomPhoto,
  SCENARIO_PROFILES,
  MUNICIPAL_REFERENCE_DATABASE,
} = require('../services/osintService');

/**
 * @route   GET /api/osint/reports
 * @desc    Get complaints requiring OSINT location estimation & reference data
 * @access  Private (Admin only)
 */
router.get('/reports', protect, adminOnly, async (req, res) => {
  try {
    let complaints = [];
    if (getIsMemoryMode()) {
      complaints = getMemoryStore().complaints || [];
    } else {
      complaints = await Complaint.find({}).sort({ submittedAt: -1 });
    }

    // Complaints that have no GPS or are marked Location Not Available or OSINT Estimated
    const reportsWithoutGps = complaints.filter(
      (c) =>
        c.locationStatus === 'LOCATION_NOT_AVAILABLE' ||
        c.locationStatus === 'OSINT_ESTIMATED' ||
        c.address === 'Location Not Available' ||
        !c.latitude ||
        !c.longitude ||
        c.isLocationEstimated
    );

    res.json({
      totalWithoutGps: reportsWithoutGps.length,
      reportsWithoutGps,
      allComplaints: complaints.slice(0, 30),
      referenceDatabase: MUNICIPAL_REFERENCE_DATABASE,
      demoScenarios: [
        {
          key: 'verified_green_park',
          title: 'Scenario 1: Strong Clues (Signboard + Landmark)',
          description: 'High confidence match with Ward 4 Trade Registry and Green Park Community Center.',
          expectedStatus: 'Verified',
          expectedConfidence: 89,
        },
        {
          key: 'conflicting_signals',
          title: 'Scenario 2: Conflicting Signals (Contradictory Signs)',
          description: 'Signboard claims Civil Lines (Ward 2) but architectural structure matches Industrial Zone (Ward 3).',
          expectedStatus: 'Human Review Required',
          expectedConfidence: 48,
        },
        {
          key: 'uncertain_insufficient',
          title: 'Scenario 3: Blurry / Insufficient Clues',
          description: 'Close-up roadway crater with no readable text or unique civic landmarks.',
          expectedStatus: 'Uncertain',
          expectedConfidence: 22,
        },
      ],
    });
  } catch (error) {
    console.error('Fetch OSINT reports error:', error);
    res.status(500).json({ message: 'Error retrieving OSINT reports' });
  }
});

/**
 * @route   POST /api/osint/analyze/:id
 * @desc    Execute 4-module OSINT scan on a complaint or simulated scenario
 * @access  Private (Admin only)
 */
router.post('/analyze/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { scenarioKey, photo, fileName } = req.body;

    let complaint = null;
    if (id !== 'custom' && id !== 'demo') {
      if (getIsMemoryMode()) {
        const store = getMemoryStore();
        complaint = (store.complaints || []).find(
          (c) => c._id.toString() === id || c.complaintId === id
        );
      } else {
        complaint = id.startsWith('CT-')
          ? await Complaint.findOne({ complaintId: id })
          : await Complaint.findById(id);
      }
    }

    // Determine analysis result
    let analysisResult;
    if (photo) {
      analysisResult = analyzeCustomPhoto(photo, fileName);
    } else if (scenarioKey && SCENARIO_PROFILES[scenarioKey]) {
      analysisResult = SCENARIO_PROFILES[scenarioKey];
    } else if (complaint) {
      analysisResult = runOsintAnalysis(complaint);
    } else {
      analysisResult = SCENARIO_PROFILES.verified_green_park;
    }

    // Persist analysis result if complaint exists
    if (complaint) {
      if (photo) complaint.beforePhoto = photo;
      complaint.osintData = analysisResult;
      if (!getIsMemoryMode()) {
        await complaint.save();
      }
    }

    res.json({
      message: 'OSINT 4-Module Analysis Completed Successfully',
      complaintId: complaint ? complaint.complaintId : id,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error('OSINT analysis error:', error);
    res.status(500).json({ message: 'Error executing OSINT analysis' });
  }
});

/**
 * @route   POST /api/osint/verify/:id
 * @desc    Accept or refine OSINT estimated location for a complaint
 * @access  Private (Admin only)
 */
router.post('/verify/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estimatedLocation,
      latitude,
      longitude,
      ward,
      verificationStatus,
      notes,
    } = req.body;

    let complaint = null;
    if (getIsMemoryMode()) {
      const store = getMemoryStore();
      complaint = (store.complaints || []).find(
        (c) => c._id.toString() === id || c.complaintId === id
      );
    } else {
      complaint = id.startsWith('CT-')
        ? await Complaint.findOne({ complaintId: id })
        : await Complaint.findById(id);
    }

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found for OSINT verification' });
    }

    const adminName = req.user?.name || 'Azeez (Supervisor)';
    const statusToSet = verificationStatus || 'Verified';

    // Update location and mark as OSINT Estimated Location
    if (latitude && longitude) {
      complaint.latitude = parseFloat(latitude);
      complaint.longitude = parseFloat(longitude);
      complaint.isLocationEstimated = true;
      complaint.locationStatus = 'OSINT_ESTIMATED';
    }

    if (estimatedLocation) {
      complaint.address = `${estimatedLocation} [OSINT Estimated Location]`;
    }

    if (ward) {
      complaint.ward = ward;
    }

    // Update OSINT finalResult status
    if (!complaint.osintData) {
      complaint.osintData = { finalResult: {} };
    }
    complaint.osintData.finalResult = {
      ...complaint.osintData.finalResult,
      estimatedLocation: estimatedLocation || complaint.address,
      verificationStatus: statusToSet,
      verifiedAt: new Date(),
      verifiedBy: adminName,
    };

    // Push timeline audit event
    const timelineEvent = {
      action: 'OSINT Location Estimation Verified',
      status: complaint.status,
      timestamp: new Date(),
      actor: adminName,
      actorRole: 'admin',
      notes: notes || `OSINT verified location set to "${complaint.address}". Confidence evaluated through OCR, landmarks, and scene similarity.`,
      photo: complaint.beforePhoto || '',
    };

    if (!complaint.timeline) {
      complaint.timeline = [];
    }
    complaint.timeline.push(timelineEvent);

    if (!getIsMemoryMode()) {
      await complaint.save();
    }

    res.json({
      message: `OSINT Verification Recorded: Status "${statusToSet}"`,
      complaint,
    });
  } catch (error) {
    console.error('OSINT verify error:', error);
    res.status(500).json({ message: 'Error recording OSINT verification' });
  }
});

module.exports = router;
