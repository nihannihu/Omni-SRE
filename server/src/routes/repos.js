const express = require('express');
const Repository = require('../models/Repository');
const { auth, requireWorkspaceMember } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/workspaces/:id/repos
 * Connect a repository to a workspace.
 */
router.post(
  '/:id/repos',
  auth,
  requireWorkspaceMember(['admin']),
  async (req, res, next) => {
    try {
      const { provider, providerRepoId, fullName, defaultBranch, language } = req.body;

      if (!provider || !providerRepoId || !fullName) {
        return res.status(400).json({
          error: 'provider, providerRepoId, and fullName are required',
        });
      }

      const repo = await Repository.create({
        workspaceId: req.params.id,
        provider,
        providerRepoId,
        fullName,
        defaultBranch: defaultBranch || 'main',
        language: language || 'unknown',
      });

      res.status(201).json({ repository: repo });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/workspaces/:id/repos
 * List repositories for a workspace.
 */
router.get(
  '/:id/repos',
  auth,
  requireWorkspaceMember(),
  async (req, res, next) => {
    try {
      const repos = await Repository.find({ workspaceId: req.params.id })
        .sort({ createdAt: -1 });

      res.json({ repositories: repos });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
