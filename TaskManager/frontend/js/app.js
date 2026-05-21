/**
 * Task Manager - Frontend JavaScript
 * Features: Due Date, Search, Priority, Toast Notifications
 */

// API base URL - same origin when served by Express
const API_BASE = "/api/tasks";

// Store all tasks in memory for live search (no extra API call)
let allTasks = [];

// DOM elements
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskDueDate = document.getElementById("taskDueDate");
const taskPriority = document.getElementById("taskPriority");
const searchInput = document.getElementById("searchInput");
const taskList = document.getElementById("taskList");
const loadingMessage = document.getElementById("loadingMessage");
const emptyMessage = document.getElementById("emptyMessage");
const noResultsMessage = document.getElementById("noResultsMessage");
const totalCount = document.getElementById("totalCount");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");
const overdueCount = document.getElementById("overdueCount");
const toastContainer = document.getElementById("toastContainer");

// ============================================
// TOAST NOTIFICATIONS (modern UI feedback)
// Types: success | error | info
// ============================================

const TOAST_ICONS = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

/**
 * Show a toast message in the container (auto-dismiss after 3.5s)
 * @param {string} message - Text to display
 * @param {string} type - success | error | info
 */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Close button removes toast immediately
  toast.querySelector(".toast-close").addEventListener("click", () => {
    removeToast(toast);
  });

  // Auto remove after delay
  setTimeout(() => removeToast(toast), 3500);
}

/** Animate toast out and remove from DOM */
function removeToast(toast) {
  if (!toast || !toast.parentElement) return;
  toast.classList.add("toast-exit");
  setTimeout(() => toast.remove(), 300);
}

// ============================================
// DATE & OVERDUE HELPERS
// ============================================

/** Format date for display on task card */
function formatDisplayDate(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Check if task is overdue (for viva):
 * - Has a due date
 * - Not marked completed
 * - Due date is before today (compare at midnight)
 */
function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;

  const due = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

/** Map priority to CSS class for colored badge */
function getPriorityClass(priority) {
  const map = {
    High: "priority-high",
    Medium: "priority-medium",
    Low: "priority-low",
  };
  return map[priority] || "priority-medium";
}

// ============================================
// STATS & SEARCH
// ============================================

/** Update stat counters at top of task list */
function updateStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const overdue = tasks.filter((t) => isOverdue(t)).length;

  totalCount.textContent = `Total: ${total}`;
  pendingCount.textContent = `Pending: ${pending}`;
  completedCount.textContent = `Completed: ${completed}`;
  overdueCount.textContent = `Overdue: ${overdue}`;
}

/**
 * Live search filter - runs on every keystroke
 * Searches title and description (case-insensitive)
 */
function filterTasks(searchTerm) {
  const query = searchTerm.trim().toLowerCase();

  if (!query) return allTasks;

  return allTasks.filter((task) => {
    const title = (task.title || "").toLowerCase();
    const desc = (task.description || "").toLowerCase();
    return title.includes(query) || desc.includes(query);
  });
}

// ============================================
// RENDER TASK LIST
// ============================================

/**
 * Render tasks to the DOM
 * @param {Array} tasks - Filtered task array to display
 */
function renderTasks(tasks) {
  taskList.innerHTML = "";
  emptyMessage.classList.add("hidden");
  noResultsMessage.classList.add("hidden");

  if (allTasks.length === 0) {
    emptyMessage.classList.remove("hidden");
    return;
  }

  if (tasks.length === 0) {
    noResultsMessage.classList.remove("hidden");
    return;
  }

  tasks.forEach((task) => {
    const overdue = isOverdue(task);
    const li = document.createElement("li");
    li.className = `task-item ${task.completed ? "completed" : ""} ${overdue ? "overdue" : ""}`;
    li.dataset.id = task._id;

    // Due date HTML block
    const dueDateHtml = task.dueDate
      ? `<p class="task-due ${overdue ? "due-overdue" : ""}">
           <span class="due-label">Due:</span> ${formatDisplayDate(task.dueDate)}
           ${overdue ? '<span class="overdue-label">Overdue</span>' : ""}
         </p>`
      : "";

    li.innerHTML = `
      <div class="task-content">
        <div class="task-badges">
          <span class="status-badge ${task.completed ? "done" : "pending"}">
            ${task.completed ? "Done" : "Pending"}
          </span>
          <span class="priority-badge ${getPriorityClass(task.priority)}">
            ${escapeHtml(task.priority || "Medium")}
          </span>
        </div>
        <p class="task-title">${escapeHtml(task.title)}</p>
        ${
          task.description
            ? `<p class="task-desc">${escapeHtml(task.description)}</p>`
            : ""
        }
        ${dueDateHtml}
        <p class="task-meta">Created: ${formatDisplayDate(task.createdAt)}</p>
      </div>
      <div class="task-actions">
        <button class="btn btn-success toggle-btn" data-id="${task._id}">
          ${task.completed ? "Mark Pending" : "Mark Done"}
        </button>
        <button class="btn btn-danger delete-btn" data-id="${task._id}">
          Delete
        </button>
      </div>
    `;

    taskList.appendChild(li);
  });

  // Button event listeners
  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => toggleTask(btn.dataset.id));
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteTask(btn.dataset.id));
  });
}

// ============================================
// API CALLS
// ============================================

/** Fetch all tasks from MongoDB via API */
async function loadTasks() {
  loadingMessage.classList.remove("hidden");
  emptyMessage.classList.add("hidden");
  noResultsMessage.classList.add("hidden");
  taskList.innerHTML = "";

  try {
    const response = await fetch(API_BASE);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to load tasks");
    }

    allTasks = result.data || [];
    updateStats(allTasks);
    loadingMessage.classList.add("hidden");

    // Apply current search term after reload
    const filtered = filterTasks(searchInput.value);
    renderTasks(filtered);
  } catch (error) {
    loadingMessage.classList.add("hidden");
    showToast(error.message, "error");
  }
}

/** Prevent XSS - escape HTML in user content */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Add new task with due date and priority */
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const dueDate = taskDueDate.value; // YYYY-MM-DD from date input
  const priority = taskPriority.value;

  if (!title) {
    showToast("Please enter a task title", "error");
    return;
  }

  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, dueDate, priority }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to add task");
    }

    taskForm.reset();
    taskPriority.value = "Medium"; // Reset dropdown default
    showToast("Task added successfully", "success");
    loadTasks();
  } catch (error) {
    showToast(error.message, "error");
  }
});

/** Toggle task completion status */
async function toggleTask(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to update task");
    }

    showToast("Task updated successfully", "success");
    loadTasks();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/** Delete a task */
async function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Failed to delete task");
    }

    showToast("Task deleted successfully", "success");
    loadTasks();
  } catch (error) {
    showToast(error.message, "error");
  }
}

// ============================================
// LIVE SEARCH - filter while typing
// ============================================

searchInput.addEventListener("input", () => {
  const filtered = filterTasks(searchInput.value);
  renderTasks(filtered);
});

// Load tasks when page opens
loadTasks();
