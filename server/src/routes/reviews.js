const express = require('express');
const Review = require('../models/Review');
const Repository = require('../models/Repository');
const Workspace = require('../models/Workspace');
const { auth, requireWorkspaceMember } = require('../middleware/auth');
const aiEngine = require('../services/aiEngine');

const router = express.Router();

/**
 * POST /api/reviews
 * Trigger a context-aware code review.
 */
router.post('/', auth, async (req, res, next) => {
  try {
    const { workspaceId, repositoryId, prNumber, prTitle, prAuthor, diff, filesChanged } = req.body;

    if (!workspaceId || !repositoryId || !diff) {
      return res.status(400).json({ error: 'workspaceId, repositoryId, and diff are required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const repo = await Repository.findById(repositoryId);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Create review record
    const review = await Review.create({
      workspaceId,
      repositoryId,
      prNumber: prNumber || 0,
      prTitle: prTitle || 'Manual Review',
      prAuthor: prAuthor || req.user.name,
      status: 'in_progress',
      triggerType: 'manual',
    });

    // Fire and forget — async review
    // In production, use a job queue (Bull, BullMQ). For hackathon, inline async.
    (async () => {
      try {
        const result = await aiEngine.triggerReview({
          review_id: review._id.toString(),
          workspace_id: workspace._id.toString(),
          bank_id: workspace.hindsightBankId,
          repository: {
            full_name: repo.fullName,
            provider: repo.provider,
            language: repo.language,
            default_branch: repo.defaultBranch,
          },
          pull_request: {
            number: prNumber || 0,
            title: prTitle || 'Manual Review',
            author: prAuthor || req.user.name,
            base_branch: repo.defaultBranch,
            head_branch: 'feature-branch',
            diff,
            files_changed: filesChanged || [],
          },
          config: {
            llm_model: workspace.settings.defaultLlmModel,
            severity_threshold: workspace.settings.severityThreshold,
            max_findings: 20,
            include_suggestions: true,
          },
        });

        // Update review with results
        review.status = result.status === 'completed' ? 'completed' : 'failed';
        review.result = {
          findings: result.findings || [],
          summary: result.summary?.total_findings
            ? `${result.summary.total_findings} findings`
            : 'No findings',
          memoryRecallCount: result.summary?.memories_recalled || 0,
          llmModel: result.llm_usage?.model || workspace.settings.defaultLlmModel,
          tokensUsed: {
            input: result.llm_usage?.input_tokens || 0,
            output: result.llm_usage?.output_tokens || 0,
          },
        };
        review.retainedToHindsight = result.memory_retained || false;
        review.completedAt = new Date();
        await review.save();
      } catch (err) {
        review.status = 'failed';
        review.errorLog = err.message;
        await review.save();
        console.error(`[REVIEW] Failed review ${review._id}:`, err.message);
      }
    })();

    res.status(202).json({
      review: review.toJSON(),
      message: 'Review triggered. Poll GET /api/reviews/:id for results.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reviews/:id
 * Get a specific review result.
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('repositoryId', 'fullName provider');

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ review });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workspaces/:workspaceId/reviews
 * List reviews for a workspace.
 */
router.get(
  '/workspace/:workspaceId',
  auth,
  async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find({ workspaceId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('repositoryId', 'fullName provider'),
        Review.countDocuments({ workspaceId }),
      ]);

      res.json({
        reviews,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/reviews/stream
 * Trigger a context-aware code review via SSE.
 */
router.post('/stream', auth, async (req, res, next) => {
  try {
    const { workspaceId, repositoryId, prNumber, prTitle, prAuthor, diff, filesChanged } = req.body;

    if (!workspaceId || !repositoryId || !diff) {
      return res.status(400).json({ error: 'workspaceId, repositoryId, and diff are required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const repo = await Repository.findById(repositoryId);
    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Create review in DB as in_progress
    const review = await Review.create({
      workspaceId,
      repositoryId,
      prNumber: prNumber || 0,
      prTitle: prTitle || 'Manual Review',
      prAuthor: prAuthor || req.user.name,
      status: 'in_progress',
      triggerType: 'manual',
    });

    const aiPayload = {
      review_id: review._id.toString(),
      workspace_id: workspace._id.toString(),
      bank_id: workspace.hindsightBankId,
      repository: {
        full_name: repo.fullName,
        provider: repo.provider,
        language: repo.language,
        default_branch: repo.defaultBranch,
      },
      pull_request: {
        number: prNumber || 0,
        title: prTitle || 'Manual Review',
        author: prAuthor || req.user.name,
        base_branch: repo.defaultBranch,
        head_branch: 'feature-branch',
        diff,
        files_changed: filesChanged || [],
      },
      config: {
        llm_model: workspace.settings.defaultLlmModel,
        severity_threshold: workspace.settings.severityThreshold,
        max_findings: 20,
        include_suggestions: true,
      },
    };

    // Hands off Express response to the AI engine stream proxy
    await aiEngine.streamReview(aiPayload, res, review);

  } catch (err) {
    next(err);
  }
});

module.exports = router;
