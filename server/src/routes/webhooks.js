const express = require('express');
const crypto = require('crypto');
const Repository = require('../models/Repository');
const Workspace = require('../models/Workspace');
const Review = require('../models/Review');
const config = require('../config/env');
const aiEngine = require('../services/aiEngine');

const router = express.Router();

/**
 * POST /api/webhooks/github
 * Receive GitHub webhook events (pull_request, push).
 */
router.post('/github', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    // Verify HMAC signature
    const signature = req.headers['x-hub-signature-256'];
    if (config.GITHUB_WEBHOOK_SECRET && signature) {
      const hmac = crypto.createHmac('sha256', config.GITHUB_WEBHOOK_SECRET);
      const digest = 'sha256=' + hmac.update(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.headers['x-github-event'];
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event === 'pull_request' && ['opened', 'synchronize'].includes(payload.action)) {
      const pr = payload.pull_request;
      const repoFullName = payload.repository.full_name;

      // Find linked repository
      const repo = await Repository.findOne({
        providerRepoId: `github:${payload.repository.id}`,
      });

      if (!repo) {
        console.log(`[WEBHOOK] Ignoring PR event for unlinked repo: ${repoFullName}`);
        return res.status(200).json({ message: 'Repository not linked' });
      }

      const workspace = await Workspace.findById(repo.workspaceId);
      if (!workspace || !workspace.settings.autoIngestPRs) {
        return res.status(200).json({ message: 'Auto-ingest disabled' });
      }

      // Create review
      const review = await Review.create({
        workspaceId: workspace._id,
        repositoryId: repo._id,
        prNumber: pr.number,
        prTitle: pr.title,
        prAuthor: pr.user.login,
        diffUrl: pr.diff_url,
        status: 'pending',
        triggerType: 'webhook',
      });

      console.log(`[WEBHOOK] Review ${review._id} created for PR #${pr.number} in ${repoFullName}`);
      // In production: enqueue the review job. For now, just create the record.

      return res.status(202).json({ message: 'Review queued', reviewId: review._id });
    }

    res.status(200).json({ message: `Event '${event}' acknowledged` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
