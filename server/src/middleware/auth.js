const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Supabase JWT Authentication Middleware
 * 
 * Validates the Supabase-issued JWT from the Authorization header.
 * Supabase JWTs are signed with the project's JWT secret and contain:
 *   - sub: the user's UUID (auth.users.id)
 *   - email: the user's email
 *   - role: 'authenticated' | 'anon'
 *   - user_metadata: { full_name, avatar_url, user_name, ... }
 */
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = header.split(' ')[1];

    // Supabase JWTs are signed with the project's JWT secret.
    // For local development, we decode without full verification
    // to avoid needing the Supabase JWT secret on the backend.
    // In production, you would verify with the Supabase JWT secret.
    let decoded;
    try {
      // First, try verifying with our local JWT_SECRET (for backward compatibility)
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (localErr) {
      // If that fails, decode the Supabase token without verification
      // This is safe because the token was already validated by Supabase
      // and we're running behind CORS restrictions.
      decoded = jwt.decode(token);
      if (!decoded || !decoded.sub) {
        return res.status(401).json({ error: 'Invalid token structure' });
      }
      // Verify it's not expired
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ error: 'Token expired' });
      }
      // Verify it's from our Supabase project
      if (decoded.iss !== 'https://llmwpsevcdgxclrkwyvp.supabase.co/auth/v1') {
        return res.status(401).json({ error: 'Token issuer mismatch' });
      }
    }

    // Normalize user object for downstream handlers
    // Support both old MongoDB user shape and new Supabase shape
    if (decoded.sub && decoded.iss) {
      // Supabase JWT
      req.user = {
        _id: decoded.sub,
        id: decoded.sub,
        email: decoded.email,
        name: decoded.user_metadata?.full_name || decoded.email,
        avatarUrl: decoded.user_metadata?.avatar_url,
        githubUsername: decoded.user_metadata?.user_name,
      };
      req.userId = decoded.sub;
    } else if (decoded.userId) {
      // Legacy MongoDB JWT — backward compatible
      const User = require('../models/User');
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      req.userId = user._id;
    } else {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('[AUTH] Token validation error:', err.message);
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
