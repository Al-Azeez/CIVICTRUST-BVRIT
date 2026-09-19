const mongoose = require('mongoose');

const timelineEventSchema = new mongoose.Schema({
  action: { type: String, required: true },
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  actor: { type: String, default: 'System' },
  actorRole: { type: String, enum: ['citizen', 'admin', 'system'], default: 'system' },
  notes: { type: String, default: '' },
  photo: { type: String, default: '' },
});

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
    },
    masterIncidentId: {
      type: String,
      default: '',
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    citizenName: {
      type: String,
      default: 'Abdul',
    },
    citizenEmail: {
      type: String,
      default: '',
    },
    citizenPhone: {
      type: String,
      default: '',
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
    beforePhoto: {
      type: String,
      required: true,
    },
    resolutionPhoto: {
      type: String,
      default: '',
    },
    reopenPhoto: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      required: false,
      default: null,
    },
    longitude: {
      type: Number,
      required: false,
      default: null,
    },
    ward: {
      type: String,
      required: false,
      default: 'Location Not Available',
    },
    address: {
      type: String,
      default: 'Location Not Available',
    },
    locationStatus: {
      type: String,
      enum: ['GPS_AVAILABLE', 'LOCATION_NOT_AVAILABLE', 'OSINT_ESTIMATED', 'OSINT_VERIFIED'],
      default: 'GPS_AVAILABLE',
    },
    isLocationEstimated: {
      type: Boolean,
      default: false,
    },
    osintData: {
      ocr: {
        rawText: { type: String, default: '' },
        detectedClues: [
          {
            text: { type: String, default: '' },
            type: { type: String, default: 'General' }, // 'Shop Name', 'Street Sign', 'Civic Code', 'Landmark'
            confidence: { type: Number, default: 0 },
            relevance: { type: String, default: '' },
          },
        ],
        processed: { type: Boolean, default: false },
      },
      landmarks: {
        detectedObjects: [
          {
            name: { type: String, default: '' },
            category: { type: String, default: '' },
            confidence: { type: Number, default: 0 },
            clue: { type: String, default: '' },
          },
        ],
        landmarkMatch: { type: String, default: '' },
        confidence: { type: Number, default: 0 },
      },
      sceneSimilarity: {
        visualFeatures: [{ type: String }],
        matchPercentage: { type: Number, default: 0 },
        referenceImage: { type: String, default: '' },
        referenceLocation: { type: String, default: '' },
        matches: [
          {
            name: { type: String, default: '' },
            similarity: { type: Number, default: 0 },
            location: { type: String, default: '' },
            image: { type: String, default: '' },
          },
        ],
      },
      metadata: {
        make: { type: String, default: '' },
        model: { type: String, default: '' },
        dateTime: { type: String, default: '' },
        dimensions: { type: String, default: '' },
        gpsStatus: { type: String, default: 'GPS Not Available' },
        rawExif: { type: mongoose.Schema.Types.Mixed, default: {} },
      },
      finalResult: {
        estimatedLocation: { type: String, default: '' },
        confidenceLevel: { type: String, default: 'Uncertain' }, // 'High' | 'Medium' | 'Low' | 'Uncertain'
        confidenceScore: { type: Number, default: 0 },
        evidenceClues: [{ type: String }],
        verificationStatus: {
          type: String,
          enum: ['Verified', 'Uncertain', 'Human Review Required', 'Pending'],
          default: 'Pending',
        },
        estimatedCoordinates: {
          latitude: { type: Number, default: null },
          longitude: { type: Number, default: null },
          radiusMeters: { type: Number, default: 150 },
        },
        verifiedAt: { type: Date },
        verifiedBy: { type: String, default: '' },
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    slaHours: {
      type: Number,
      required: true,
    },
    slaDeadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'SUBMITTED',
        'IN_PROGRESS',
        'RESOLUTION_CLAIMED',
        'VERIFIED',
        'UNVERIFIED',
        'SUSPICIOUS',
        'REVERIFIED',
        'REOPENED',
        'RESOLVED',
        'REVERIFICATION_REQUIRED',
      ],
      default: 'SUBMITTED',
    },
    verificationStatus: {
      type: String,
      enum: [
        'PENDING',
        'VERIFIED',
        'UNVERIFIED',
        'REQUIRES HUMAN REVIEW',
        'LOCATION MISMATCH',
        'TIMELINE MISMATCH',
        'IMAGE VERIFICATION FAILED',
        'SUSPICIOUS',
      ],
      default: 'PENDING',
    },
    verificationConfidence: {
      type: Number,
      default: 0,
    },
    verificationReason: {
      type: String,
      default: '',
    },
    verificationMethod: {
      type: String,
      default: 'Multi-Signal Verification (Image + GPS + Timeline)',
    },
    resolutionEvidence: {
      photo: { type: String, default: '' },
      latitude: { type: Number },
      longitude: { type: Number },
      timestamp: { type: Date },
      address: { type: String, default: '' },
      capturedBy: { type: String, default: '' },
    },
    verificationSignals: {
      imageSimilarity: { type: Number, default: 0 },
      locationMatch: { type: Boolean, default: true },
      locationDistanceMeters: { type: Number, default: 0 },
      timestampMatch: { type: Boolean, default: true },
      overallStatus: { type: String, default: 'PENDING' },
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
    reopenReason: {
      type: String,
      default: '',
    },
    reopenedAt: {
      type: Date,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
    },
    timeline: [timelineEventSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Complaint', complaintSchema);
