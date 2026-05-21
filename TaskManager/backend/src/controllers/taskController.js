/**
 * Task Controller - Contains business logic for each API endpoint
 * Handles request/response and calls the Task model
 */

const Task = require("../models/Task");
const PRIORITY_LEVELS = Task.PRIORITY_LEVELS || ["High", "Medium", "Low"];

/**
 * GET /api/tasks - Get all tasks (newest first)
 */
const getAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks - Create a new task
 * Body: { title, description?, dueDate?, priority? }
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, priority } = req.body;

    // Validate title is provided
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    // Validate priority if sent from frontend dropdown
    const taskPriority =
      priority && PRIORITY_LEVELS.includes(priority) ? priority : "Medium";

    // Parse due date string (from <input type="date">) into Date object
    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date format",
        });
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      dueDate: parsedDueDate,
      priority: taskPriority,
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:id - Toggle or set completion status
 * Body: { completed: true/false } (optional - toggles if not sent)
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    // If completed is sent in body, use it; otherwise toggle
    if (typeof req.body.completed === "boolean") {
      task.completed = req.body.completed;
    } else {
      task.completed = !task.completed;
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id - Delete a task by ID
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
};
