/**
 * Task Routes - Maps HTTP URLs to controller functions
 * All routes are prefixed with /api/tasks in server.js
 */

const express = require("express");
const router = express.Router();

const {
  getAllTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
} = require("../controllers/taskController");

// GET    /api/tasks      -> List all tasks
router.get("/", getAllTasks);

// POST   /api/tasks      -> Add new task
router.post("/", createTask);

// PATCH  /api/tasks/:id  -> Update completion status
router.patch("/:id", updateTaskStatus);

// DELETE /api/tasks/:id  -> Delete task
router.delete("/:id", deleteTask);

module.exports = router;
