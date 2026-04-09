const jwt = require('jsonwebtoken');
const config = require('../config/env');
const User = require('../models/User');

/**
 * JWT Authentication Middleware
 * Extracts Bearer token, verifies, and attaches user to req.
 */
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Workspace membership check middleware
 * Must be used after auth middleware.
 * Checks req.params.workspaceId or req.body.workspaceId
 */
const requireWorkspaceMember = (requiredRoles = []) => {
  return async (req, res, next) => {
    try {
      const Workspace = require('../models/Workspace');
      const workspaceId = req.params.workspaceId || req.params.id || req.body.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Owner always has access
      if (workspace.ownerId.toString() === req.userId.toString()) {
        req.workspace = workspace;
        req.workspaceRole = 'admin';
        return next();
      }

      // Check membership
      const member = workspace.members.find(
        (m) => m.userId.toString() === req.userId.toString()
      );

      if (!member) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(member.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.workspace = workspace;
      req.workspaceRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { auth, requireWorkspaceMember };
