/**
 * Global Error Handling Middleware
 * Catches all errors passed via next(error) and sends JSON response
 * Must be registered LAST in Express (after all routes)
 */

const errorHandler = (err, req, res, next) => {
  // Log error for debugging (visible in Docker/Jenkins logs)
  console.error("Error:", err.message);

  // Mongoose invalid ObjectId format (e.g. /api/tasks/invalid-id)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID format",
    });
  }

  // Mongoose validation error (e.g. missing required field)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", "),
    });
  }

  // Default server error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
