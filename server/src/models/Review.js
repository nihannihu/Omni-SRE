const mongoose = require('mongoose');

const memoryCitationSchema = new mongoose.Schema(
  {
    factId: String,
    text: String,
    type: { type: String, enum: ['world', 'experience', 'observation'] },
    context: String,
    occurredAt: Date,
  },
  { _id: false }
);

const findingSchema = new mongoose.Schema(
  {
    id: String,
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'info'],
    },
    category: {
      type: String,
      enum: ['security', 'convention', 'performance', 'bug', 'style'],
    },
    file: String,
    line: Number,
    title: String,
    description: String,
    suggestedFix: String,
    memoryCitations: [memoryCitationSchema],
    confidence: Number,
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
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
      required: true,
    },
    prNumber: Number,
    prTitle: String,
    prAuthor: String,
    diffUrl: String,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    triggerType: {
      type: String,
      enum: ['webhook', 'manual'],
      default: 'manual',
    },
    result: {
      findings: [findingSchema],
      summary: String,
      memoryRecallCount: Number,
      llmModel: String,
      tokensUsed: {
        input: Number,
        output: Number,
      },
      maturity: {
        level: String,
        totalFacts: Number,
        observations: Number,
        confidenceBoost: Number,
        description: String,
      },
    },
    retainedToHindsight: {
      type: Boolean,
      default: false,
    },
    errorLog: {
      type: String,
      default: null,
    },
    completedAt: Date,
  },
  { timestamps: true }
);

// Compound index for efficient listing
reviewSchema.index({ workspaceId: 1, createdAt: -1 });
reviewSchema.index({ repositoryId: 1, prNumber: 1 });

module.exports = mongoose.model('Review', reviewSchema);
