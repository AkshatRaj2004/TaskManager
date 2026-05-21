/**
 * MongoDB Database Connection using Mongoose
 * Reads connection string from environment variable MONGODB_URI
 */

const mongoose = require("mongoose");

/**
 * Connect to MongoDB database
 * Called once when server starts
 */
const connectDB = async () => {
  try {
    // Get MongoDB URI from .env file (loaded by dotenv in server.js)
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/taskmanager";

    // Connect to MongoDB
    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Log error and exit process if connection fails
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
