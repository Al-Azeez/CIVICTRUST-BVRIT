const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      ref: 'Complaint',
    },
    beforePhoto: {
      type: String,
      required: true,
    },
    resolutionPhoto: {
      type: String,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'SUSPICIOUS'],
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    algorithmBreakdown: {
      structuralSimilarity: { type: Number, default: 0 },
      colorEntropyDelta: { type: Number, default: 0 },
      residualDebrisScore: { type: Number, default: 0 },
      edgeContinuityMatch: { type: Number, default: 0 },
    },
    verifiedBy: {
      type: String,
      default: 'Automated Resolution Verification Engine (Prototype v1.4)',
    },
    manualReviewTriggered: {
      type: Boolean,
      default: false,
    },
    reviewedByAdmin: {
      type: Boolean,
      default: false,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Verification', verificationSchema);
