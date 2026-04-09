const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      default: null,
    },
    incidentId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['P1', 'P2', 'P3', 'P4'],
      required: true,
    },
    rootCause: {
      type: String,
      required: true,
    },
    fixPrNumber: {
      type: Number,
      default: null,
    },
    affectedFiles: [String],
    lessonsLearned: {
      type: String,
      default: '',
    },
    resolvedAt: Date,
    retainedToHindsight: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

incidentSchema.index({ incidentId: 1, workspaceId: 1 }, { unique: true });

module.exports = mongoose.model('Incident', incidentSchema);
