const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root if not in Docker
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // Also check local .env

module.exports = {
  PORT: process.env.PORT || 3001,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/omni-sre',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  AI_ENGINE_URL: process.env.AI_ENGINE_URL || 'http://localhost:8000',
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
