const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['github', 'gitlab', 'bitbucket'],
      required: true,
    },
    providerRepoId: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    defaultBranch: {
      type: String,
      default: 'main',
    },
    webhookSecret: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      default: 'unknown',
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Repository', repositorySchema);
