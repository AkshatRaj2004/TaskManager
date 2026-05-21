/**
 * Task Model - Defines how task data is stored in MongoDB
 * Mongoose creates a collection named "tasks" in the database
 */

const mongoose = require("mongoose");

// Allowed priority values (used in dropdown and validation)
const PRIORITY_LEVELS = ["High", "Medium", "Low"];

// Schema = structure of each task document in MongoDB
const taskSchema = new mongoose.Schema(
  {
    // Task title - required field
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    // Task description - optional
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Completion status - false = pending, true = completed
    completed: {
      type: Boolean,
      default: false,
    },

    // Due date - optional; frontend highlights overdue tasks
    dueDate: {
      type: Date,
      default: null,
    },

    // Priority level - High / Medium / Low (default Medium)
    priority: {
      type: String,
      enum: {
        values: PRIORITY_LEVELS,
        message: "Priority must be High, Medium, or Low",
      },
      default: "Medium",
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

// Export Task model and priority list for controller validation
module.exports = mongoose.model("Task", taskSchema);
module.exports.PRIORITY_LEVELS = PRIORITY_LEVELS;
