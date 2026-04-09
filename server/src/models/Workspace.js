const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'reviewer', 'viewer'],
      default: 'reviewer',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    hindsightBankId: {
      type: String,
      required: true,
      unique: true,
    },
    settings: {
      defaultLlmModel: {
        type: String,
        default: 'qwen/qwen3-32b',
      },
      severityThreshold: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low', 'info'],
        default: 'medium',
      },
      autoIngestPRs: {
        type: Boolean,
        default: true,
      },
      conventionsDoc: {
        type: String,
        default: '',
      },
    },
  },
  { timestamps: true }
);

// Auto-generate hindsightBankId from slug
workspaceSchema.pre('validate', function (next) {
  if (!this.hindsightBankId && this.slug) {
    this.hindsightBankId = `workspace-${this.slug}`;
  }
  next();
});

module.exports = mongoose.model('Workspace', workspaceSchema);
