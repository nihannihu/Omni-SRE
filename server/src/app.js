const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspaces');
const repoRoutes = require('./routes/repos');
const reviewRoutes = require('./routes/reviews');
const incidentRoutes = require('./routes/incidents');
const webhookRoutes = require('./routes/webhooks');

const app = express();

// ── Security ──
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate Limiting ──
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});
app.use('/api/', limiter);

// ── Logging ──
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Body Parsing ──
// Note: webhooks route uses raw body for HMAC verification
app.use('/api/webhooks', webhookRoutes);
app.use(express.json({ limit: '5mb' }));

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', repoRoutes); // /api/workspaces/:id/repos
app.use('/api/reviews', reviewRoutes);
app.use('/api/incidents', incidentRoutes);

// ── Health Check ──
app.get('/api/health', async (req, res) => {
  const aiEngine = require('./services/aiEngine');
  const aiHealth = await aiEngine.healthCheck();

  res.json({
    status: 'healthy',
    service: 'omni-sre-server',
    timestamp: new Date().toISOString(),
    ai_engine: aiHealth,
  });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start ──
const start = async () => {
  await connectDB();

  app.listen(config.PORT, () => {
    console.log(`\n🚀 Omni-SRE Server running on port ${config.PORT}`);
    console.log(`   Environment: ${config.NODE_ENV}`);
    console.log(`   AI Engine:   ${config.AI_ENGINE_URL}`);
    console.log(`   MongoDB:     ${config.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}\n`);
  });
};

start();

module.exports = app;
