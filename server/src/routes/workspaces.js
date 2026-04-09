const express = require('express');
const Workspace = require('../models/Workspace');
const { auth, requireWorkspaceMember } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/workspaces
 * Create a new workspace.
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const workspace = await Workspace.create({
      name,
      slug,
      ownerId: req.userId,
      members: [{ userId: req.userId, role: 'admin' }],
    });

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workspaces
 * List all workspaces the user belongs to.
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { ownerId: req.userId },
        { 'members.userId': req.userId },
      ],
    }).sort({ createdAt: -1 });

    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workspaces/:id
 * Get workspace details.
 */
router.get('/:id', auth, requireWorkspaceMember(), async (req, res) => {
  res.json({ workspace: req.workspace });
});

/**
 * PATCH /api/workspaces/:id/settings
 * Update workspace settings.
 */
router.patch(
  '/:id/settings',
  auth,
  requireWorkspaceMember(['admin']),
  async (req, res, next) => {
    try {
      const { settings } = req.body;
      if (!settings) {
        return res.status(400).json({ error: 'settings object required' });
      }

      // Merge settings
      Object.keys(settings).forEach((key) => {
        if (req.workspace.settings[key] !== undefined) {
          req.workspace.settings[key] = settings[key];
        }
      });

      await req.workspace.save();
      res.json({ workspace: req.workspace });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/workspaces/:id/conventions
 * Add/update team conventions (retained into Hindsight).
 */
router.post(
  '/:id/conventions',
  auth,
  requireWorkspaceMember(['admin', 'reviewer']),
  async (req, res, next) => {
    try {
      const { conventions } = req.body;
      if (!conventions) {
        return res.status(400).json({ error: 'conventions text required' });
      }

      req.workspace.settings.conventionsDoc = conventions;
      await req.workspace.save();

      // Also ingest into Hindsight via AI engine
      const aiEngine = require('../services/aiEngine');
      await aiEngine.ingestKnowledge({
        workspace_id: req.workspace._id.toString(),
        bank_id: req.workspace.hindsightBankId,
        content_type: 'convention',
        content: {
          title: 'Team Coding Conventions',
          body: conventions,
        },
        metadata: {
          source: 'manual',
          author: req.user.email,
        },
      });

      res.json({ message: 'Conventions updated and ingested into memory', workspace: req.workspace });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
