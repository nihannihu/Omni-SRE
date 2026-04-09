const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      // Mongoose 8 defaults are good — no need for deprecated options
    });
    console.log(`[DB] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[DB] MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
