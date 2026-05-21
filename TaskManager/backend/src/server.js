/**
 * Task Manager - Main Server Entry Point
 * Express server with MongoDB, REST APIs, and static frontend
 */

// Load environment variables from .env file FIRST
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const errorHandler = require("./middleware/errorHandler");

// Create Express application
const app = express();

// Port from environment or default 5000
const PORT = process.env.PORT || 5000;

// ---------- Middleware ----------
// Allow frontend to call API from browser (CORS)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve frontend static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../../frontend")));

// ---------- Routes ----------

/**
 * Health Check API - Used by Jenkins for deployment verification
 * GET /health -> returns "OK" with status 200
 * If this fails after deploy, Jenkins triggers AUTO ROLLBACK
 */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Task REST API routes
app.use("/api/tasks", taskRoutes);

// Serve index.html for any unknown route (SPA-style)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

// ---------- Error Handler (must be last) ----------
app.use(errorHandler);

// ---------- Start Server ----------
const startServer = async () => {
  // Connect to MongoDB before accepting requests
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

startServer();
