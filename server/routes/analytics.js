const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const MasterIncident = require('../models/MasterIncident');
const { getSlaStatus } = require('../services/slaService');
const { getIsMemoryMode, getMemoryStore } = require('../config/db');
const { WARDS } = require('../services/seedData');

const getAllComplaintsData = async () => {
  if (getIsMemoryMode()) {
    const store = getMemoryStore();
    return store.complaints || [];
  }
  return await Complaint.find({});
};

const getAllMasterIncidentsData = async () => {
  if (getIsMemoryMode()) {
    const store = getMemoryStore();
    return store.masterIncidents || [];
  }
  return await MasterIncident.find({});
};

// @route   GET /api/analytics/kpis
router.get('/kpis', async (req, res) => {
  try {
    const list = await getAllComplaintsData();
    const masterList = await getAllMasterIncidentsData();

    let totalComplaints = list.length;
    let pending = 0;
    let resolved = 0;
    let slaMet = 0;
    let slaBreached = 0;
    let suspiciousClosures = 0;
    let reopenedComplaints = 0;
    let reverificationRequests = 0;

    list.forEach((c) => {
      const sla = getSlaStatus(c.submittedAt, c.slaDeadline, c.status, c.resolvedAt);
      
      if (c.status === 'SUBMITTED' || c.status === 'IN_PROGRESS') {
        pending++;
      }
      if (c.status === 'RESOLVED' || c.status === 'VERIFIED') {
        resolved++;
      }
      if (c.status === 'SUSPICIOUS' || c.status === 'UNVERIFIED' || c.verificationStatus === 'UNVERIFIED') {
        suspiciousClosures++;
      }
      if (c.status === 'REOPENED' || c.status === 'REVERIFICATION_REQUIRED') {
        reopenedComplaints++;
        reverificationRequests++;
      }

      if (sla.slaState === 'SLA_BREACHED') {
        slaBreached++;
      } else if (c.status === 'RESOLVED' || c.status === 'VERIFIED') {
        slaMet++;
      }
    });

    const openIncidents = masterList.filter((m) => m.status !== 'RESOLVED' && m.status !== 'VERIFIED').length;
    const resolvedIncidents = masterList.filter((m) => m.status === 'RESOLVED' || m.status === 'VERIFIED').length;
    const recurringHotspots = masterList.filter((m) => m.isRecurring || m.status === 'RECURRING').length;

    res.json({
      kpis: {
        totalComplaints,
        masterIncidentsCount: masterList.length || 3,
        openIncidents,
        resolvedIncidents,
        pending,
        resolved,
        slaMet,
        slaBreached,
        suspiciousClosures,
        reopenedComplaints,
        reverificationRequests,
        recurringHotspots,
        slaAdherenceRate: totalComplaints > 0 ? Math.round((slaMet / (slaMet + slaBreached || 1)) * 100) : 100,
        reopenRate: totalComplaints > 0 ? Math.round((reopenedComplaints / totalComplaints) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Analytics KPI error:', error);
    res.status(500).json({ message: 'Error computing KPI metrics' });
  }
});

// @route   GET /api/analytics/charts
router.get('/charts', async (req, res) => {
  try {
    const list = await getAllComplaintsData();
    const masterList = await getAllMasterIncidentsData();

    // 1. By Category
    const categoryMap = {};
    let withinSlaCount = 0;
    let atRiskCount = 0;
    let breachedCount = 0;
    let verifiedCount = 0;
    let suspiciousCount = 0;
    let reopenedCount = 0;
    let pendingVerificationCount = 0;

    list.forEach((c) => {
      categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;

      const sla = getSlaStatus(c.submittedAt, c.slaDeadline, c.status, c.resolvedAt);
      if (sla.slaState === 'SLA_BREACHED') breachedCount++;
      else if (sla.slaState === 'SLA_AT_RISK') atRiskCount++;
      else withinSlaCount++;

      if (c.verificationStatus === 'VERIFIED' || c.status === 'VERIFIED') verifiedCount++;
      else if (c.verificationStatus === 'UNVERIFIED' || c.status === 'UNVERIFIED' || c.status === 'SUSPICIOUS') suspiciousCount++;
      else if (c.status === 'REOPENED' || c.status === 'REVERIFICATION_REQUIRED') reopenedCount++;
      else pendingVerificationCount++;
    });

    const categoryData = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      count: categoryMap[cat],
    }));

    const slaData = [
      { name: 'Within SLA', value: withinSlaCount, fill: '#10b981' },
      { name: 'SLA At Risk', value: atRiskCount, fill: '#f59e0b' },
      { name: 'SLA Breached', value: breachedCount, fill: '#ef4444' },
    ];

    const verificationData = [
      { name: 'Consistent Evidence', value: verifiedCount, fill: '#059669' },
      { name: 'Unverified / Review Req.', value: suspiciousCount, fill: '#dc2626' },
      { name: 'Reverification Dispute', value: reopenedCount, fill: '#f97316' },
      { name: 'Pending Review', value: pendingVerificationCount, fill: '#64748b' },
    ];

    const timelineData = [
      { day: 'Day -6', submitted: 4, resolved: 3, suspicious: 1 },
      { day: 'Day -5', submitted: 6, resolved: 5, suspicious: 2 },
      { day: 'Day -4', submitted: 8, resolved: 6, suspicious: 1 },
      { day: 'Day -3', submitted: 7, resolved: 7, suspicious: 2 },
      { day: 'Day -2', submitted: 11, resolved: 8, suspicious: 3 },
      { day: 'Yesterday', submitted: 9, resolved: 7, suspicious: 2 },
      { day: 'Today', submitted: list.length, resolved: verifiedCount, suspicious: suspiciousCount },
    ];

    res.json({
      categoryData,
      slaData,
      verificationData,
      timelineData,
    });
  } catch (error) {
    console.error('Analytics charts error:', error);
    res.status(500).json({ message: 'Error computing chart metrics' });
  }
});

// @route   GET /api/analytics/wards
router.get('/wards', async (req, res) => {
  try {
    const list = await getAllComplaintsData();
    const masterList = await getAllMasterIncidentsData();

    const wardStats = WARDS.map((wardName) => {
      const wardComplaints = list.filter((c) => c.ward === wardName);
      const wardMasters = masterList.filter((m) => m.ward === wardName);
      let total = wardComplaints.length;
      let breaches = 0;
      let suspicious = 0;
      let reopened = 0;
      let verified = 0;
      let recurring = 0;

      wardComplaints.forEach((c) => {
        const sla = getSlaStatus(c.submittedAt, c.slaDeadline, c.status, c.resolvedAt);
        if (sla.slaState === 'SLA_BREACHED') breaches++;
        if (c.verificationStatus === 'UNVERIFIED' || c.status === 'UNVERIFIED' || c.status === 'SUSPICIOUS') suspicious++;
        if (c.status === 'REOPENED' || c.status === 'REVERIFICATION_REQUIRED') reopened++;
        if (c.verificationStatus === 'VERIFIED') verified++;
      });

      wardMasters.forEach((m) => {
        if (m.isRecurring || m.status === 'RECURRING') recurring++;
      });

      const adherenceRate = total > 0 ? Math.max(0, Math.round(((total - breaches) / total) * 100)) : 100;

      return {
        ward: wardName,
        totalComplaints: total,
        masterIncidentsCount: wardMasters.length,
        recurringIncidents: recurring,
        slaBreaches: breaches,
        suspiciousClosures: suspicious,
        reopenedComplaints: reopened,
        verifiedCount: verified,
        slaAdherenceRate: adherenceRate,
        hotspotScore: suspicious * 3 + reopened * 4 + breaches * 2 + recurring * 5 + total,
      };
    });

    wardStats.sort((a, b) => b.hotspotScore - a.hotspotScore);

    res.json({
      wards: wardStats,
      disclaimer: 'Prototype/Sample Data — Not an official municipal ranking.',
    });
  } catch (error) {
    console.error('Ward analytics error:', error);
    res.status(500).json({ message: 'Error computing ward analytics' });
  }
});

// @route   GET /api/analytics/hotspots
router.get('/hotspots', async (req, res) => {
  try {
    const list = await getAllComplaintsData();
    const masterList = await getAllMasterIncidentsData();

    // Map Master Incidents as cluster points
    const points = masterList.map((m) => {
      const sla = getSlaStatus(m.firstReportedAt, m.slaDeadline, m.status, m.resolvedAt);
      const isSuspicious = m.status === 'UNVERIFIED' || m.verification?.overallStatus === 'REQUIRES HUMAN REVIEW' || m.verification?.overallStatus === 'LOCATION MISMATCH';
      const isRecurring = m.isRecurring || m.status === 'RECURRING';
      const isReopened = m.status === 'REVERIFICATION_REQUIRED';

      let riskLevel = 'LOW';
      let radius = Math.min(45, 18 + (m.reportCount || 1) * 6);
      let color = '#3b82f6';

      if (isRecurring) {
        riskLevel = 'RECURRING_HOTSPOT';
        radius = 36;
        color = '#a855f7'; // Purple for recurring hotspot
      } else if (isSuspicious || isReopened) {
        riskLevel = 'HIGH_SUSPICIOUS';
        radius = 32;
        color = '#ef4444'; // Red
      } else if (sla.slaState === 'SLA_BREACHED') {
        riskLevel = 'SLA_BREACHED';
        radius = 26;
        color = '#f97316'; // Orange
      } else if (m.status === 'VERIFIED' || m.status === 'RESOLVED') {
        riskLevel = 'RESOLVED';
        radius = 18;
        color = '#10b981'; // Green
      }

      return {
        id: m.incidentId || m._id,
        _id: m._id,
        complaintId: m.incidentId,
        incidentId: m.incidentId,
        lat: m.latitude,
        lng: m.longitude,
        category: m.category,
        ward: m.ward,
        address: m.address,
        status: m.status,
        reportCount: m.reportCount || 1,
        isRecurring: m.isRecurring,
        verificationStatus: m.verification?.overallStatus || m.status,
        verificationConfidence: m.verification?.confidence || 0,
        slaState: sla.slaState,
        riskLevel,
        radius,
        color,
        description: m.description,
      };
    });

    res.json({
      points,
      totalPoints: points.length,
      disclaimer: 'Potential Hotspot — Based on Prototype/Sample Data. Not an official government ranking.',
    });
  } catch (error) {
    console.error('Hotspot analytics error:', error);
    res.status(500).json({ message: 'Error retrieving hotspot data' });
  }
});

module.exports = router;
