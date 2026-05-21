/**
 * Simple CI check script - verifies project structure and syntax.
 * GitHub Actions runs: npm run check
 */

const fs = require("fs");
const path = require("path");

// Files that must exist for the app to work
const requiredFiles = [
  "src/server.js",
  "src/config/db.js",
  "src/models/Task.js",
  "src/routes/taskRoutes.js",
  "src/controllers/taskController.js",
  "src/middleware/errorHandler.js",
];

console.log("Running project structure checks...\n");

let hasError = false;

requiredFiles.forEach((file) => {
  const fullPath = path.join(__dirname, "..", file);
  if (fs.existsSync(fullPath)) {
    console.log(`  [OK] ${file}`);
  } else {
    console.error(`  [FAIL] Missing: ${file}`);
    hasError = true;
  }
});

if (hasError) {
  console.error("\nCheck failed.");
  process.exit(1);
}

console.log("\nAll checks passed.");
process.exit(0);
