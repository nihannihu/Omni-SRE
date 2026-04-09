const express = require('express');
const Incident = require('../models/Incident');
const Workspace = require('../models/Workspace');
const { auth, requireWorkspaceMember } = require('../middleware/auth');
const aiEngine = require('../services/aiEngine');

const router = express.Router();

/**
 * POST /api/incidents
 * Log a security incident and ingest into Hindsight.
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const {
      workspaceId, repositoryId, incidentId, title,
      severity, rootCause, fixPrNumber, affectedFiles, lessonsLearned, resolvedAt,
    } = req.body;

    if (!workspaceId || !incidentId || !title || !severity || !rootCause) {
      return res.status(400).json({
        error: 'workspaceId, incidentId, title, severity, and rootCause are required',
      });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const incident = await Incident.create({
      workspaceId,
      repositoryId: repositoryId || null,
      incidentId,
      title,
      severity,
      rootCause,
      fixPrNumber: fixPrNumber || null,
      affectedFiles: affectedFiles || [],
      lessonsLearned: lessonsLearned || '',
      resolvedAt: resolvedAt ? new Date(resolvedAt) : null,
    });

    // Ingest into Hindsight
    try {
      await aiEngine.ingestKnowledge({
        workspace_id: workspace._id.toString(),
        bank_id: workspace.hindsightBankId,
        content_type: 'incident',
        content: {
          title: `${incidentId}: ${title}`,
          body: rootCause,
          severity,
          affected_files: affectedFiles || [],
          lessons_learned: lessonsLearned || '',
        },
        metadata: {
          source: 'manual',
          author: req.user.email,
          incident_id: incidentId,
        },
      });

      incident.retainedToHindsight = true;
      await incident.save();
    } catch (ingestErr) {
      console.error(`[INCIDENT] Hindsight ingest failed for ${incidentId}:`, ingestErr.message);
      // Non-fatal: incident is saved in MongoDB even if Hindsight fails
    }

    res.status(201).json({ incident });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workspaces/:workspaceId/incidents
 * List incidents for a workspace.
 */
router.get(
  '/workspace/:workspaceId',
  auth,
  async (req, res, next) => {
    try {
      const incidents = await Incident.find({ workspaceId: req.params.workspaceId })
        .sort({ createdAt: -1 });

      res.json({ incidents });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
