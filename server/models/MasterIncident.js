const mongoose = require('mongoose');

const masterIncidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Garbage Dump',
        'Uncleaned Sweeping',
        'Construction Debris',
        'Blocked Drains',
        'Potholes',
        'Non-functional Public Toilets',
      ],
    },
    description: {
      type: String,
      required: true,
    },
    ward: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: 'Civic Location',
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    firstReportedAt: {
      type: Date,
      default: Date.now,
    },
    lastReportedAt: {
      type: Date,
      default: Date.now,
    },
    reportCount: {
      type: Number,
      default: 1,
    },
    linkedComplaintIds: [{
      type: String,
    }],
    linkedComplaints: [
      {
        complaintId: String,
        citizenName: String,
        description: String,
        photo: String,
        submittedAt: Date,
        latitude: Number,
        longitude: Number,
      },
    ],
    status: {
      type: String,
      enum: [
        'OPEN',
        'IN_PROGRESS',
        'RESOLUTION_CLAIMED',
        'VERIFIED',
        'REVERIFICATION_REQUIRED',
        'UNVERIFIED',
        'RESOLVED',
        'RECURRING',
      ],
      default: 'OPEN',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringCount: {
      type: Number,
      default: 0,
    },
    recurringHistory: [
      {
        resolvedAt: Date,
        reopenedAt: Date,
        notes: String,
      },
    ],
    slaHours: {
      type: Number,
      required: true,
    },
    slaDeadline: {
      type: Date,
      required: true,
    },
    resolutionEvidence: {
      photo: { type: String, default: '' },
      latitude: { type: Number },
      longitude: { type: Number },
      timestamp: { type: Date },
      address: { type: String, default: '' },
      capturedBy: { type: String, default: '' },
    },
    verification: {
      imageSimilarity: { type: Number, default: 0 },
      locationMatch: { type: Boolean, default: true },
      locationDistanceMeters: { type: Number, default: 0 },
      timestampMatch: { type: Boolean, default: true },
      overallStatus: {
        type: String,
        enum: [
          'VERIFIED',
          'UNVERIFIED',
          'REQUIRES HUMAN REVIEW',
          'LOCATION MISMATCH',
          'TIMELINE MISMATCH',
          'IMAGE VERIFICATION FAILED',
          'PENDING',
        ],
        default: 'PENDING',
      },
      confidence: { type: Number, default: 0 },
      reviewRequired: { type: Boolean, default: false },
      reason: { type: String, default: '' },
    },
    citizenReverification: {
      status: { type: String, default: '' }, // 'RESOLVED_CONFIRMED' | 'DISPUTED_STILL_EXISTS'
      reason: { type: String, default: '' },
      rebuttalPhoto: { type: String, default: '' },
      timestamp: { type: Date },
    },
    resolvedAt: {
      type: Date,
    },
    timeline: [
      {
        action: String,
        status: String,
        timestamp: { type: Date, default: Date.now },
        actor: String,
        actorRole: String,
        notes: String,
        photo: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MasterIncident', masterIncidentSchema);
