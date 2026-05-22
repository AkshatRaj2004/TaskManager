# Task Manager App with CI/CD and Auto Rollback

A beginner-friendly **DevOps college project** for 3rd year B.Tech CSE students.  
Build a full-stack Task Manager with **Docker**, **GitHub Actions (CI)**, and **Jenkins (CD)** including **automatic rollback** on failed health checks.

---

## Features

| Feature | Description |
|---------|-------------|
| Add Task | Create tasks with title and description |
| View Tasks | List all tasks with stats |
| Delete Task | Remove tasks by ID |
| Completion Status | Mark tasks done / pending |
| Health API | `GET /health` returns `OK` (used by Jenkins) |
| CI | GitHub Actions on push to `main` |
| CD | Jenkins pipeline with deploy + rollback |

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (responsive UI)
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Containers:** Docker + Docker Compose
- **CI:** GitHub Actions
- **CD:** Jenkins Pipeline

---

## Project Structure

```
TaskManager/
├── .github/workflows/ci.yml    # GitHub Actions CI pipeline
├── Jenkinsfile                 # Jenkins CD pipeline
├── docker-compose.yml          # MongoDB + Backend containers
├── scripts/
│   ├── deploy.sh               # Deploy + AUTO ROLLBACK logic
│   └── health-check.sh         # Standalone health verification
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js           # Entry point
│       ├── config/db.js        # MongoDB connection
│       ├── models/Task.js      # Mongoose schema
│       ├── routes/taskRoutes.js
│       ├── controllers/taskController.js
│       └── middleware/errorHandler.js
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/app.js
```

---

## Prerequisites

Install before starting:

1. [Node.js 20+](https://nodejs.org/)
2. [MongoDB](https://www.mongodb.com/try/download/community) OR use Docker only
3. [Docker Desktop](https://www.docker.com/products/docker-desktop/)
4. [Git](https://git-scm.com/)
5. **Optional:** Jenkins server for CD demo

---

## Setup Instructions

### Option A: Run with Docker Compose (Recommended)

```bash
# 1. Clone or open project folder
cd TaskManager

# 2. Start MongoDB + Backend (builds image automatically)
docker compose up -d --build

# 3. Open browser
# http://localhost:5000

# 4. Test health API
curl http://localhost:5000/health
# Expected output: OK

# 5. Stop services
docker compose down
```

### Option B: Run Locally (without Docker)

```bash
# 1. Start MongoDB locally on port 27017

# 2. Setup backend
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # Linux/Mac
npm install
npm run dev

# 3. Open browser
# http://localhost:5000
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check → returns `OK` |
| GET | `/api/tasks` | Get all tasks |
| POST | `/api/tasks` | Create task `{ "title": "...", "description": "..." }` |
| PATCH | `/api/tasks/:id` | Toggle/update completion `{ "completed": true }` |
| DELETE | `/api/tasks/:id` | Delete task |

### Example (curl)

```bash
# Create task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Study DevOps\",\"description\":\"Chapter 5\"}"

# Get all tasks
curl http://localhost:5000/api/tasks

# Health check
curl http://localhost:5000/health
```

---

## CI/CD Flow Explanation (For Viva)

### 1. Continuous Integration (GitHub Actions)

**File:** `.github/workflows/ci.yml`

**Trigger:** Push or Pull Request to `main` branch

**Steps:**
1. Checkout code
2. Install Node.js dependencies
3. Run `npm run check` (validates project structure)
4. Verify JavaScript syntax
5. Build Docker image to ensure Dockerfile works

**Purpose:** Catch errors **before** deployment. Developers get fast feedback on GitHub.

```
Developer Push → GitHub → Actions CI → Pass/Fail badge
```

### 2. Continuous Deployment (Jenkins)

**File:** `Jenkinsfile`

**Stages:**
1. **Pull Code** – Get latest from Git
2. **Install Dependencies** – `npm install`
3. **Run Checks** – Same validation as CI
4. **Build Docker Image** – Tag with build number
5. **Deploy Container** – Run `scripts/deploy.sh`
6. **Health Check** – Call `GET /health`

**Purpose:** Automate deployment to server/docker host.

```
CI Passed → Jenkins CD → Build Image → Deploy → Health Check → Live App
```

---

## Auto Rollback Mechanism (For Viva)

**File:** `scripts/deploy.sh`

### Why rollback?

If a new version crashes or fails to start, users should not see downtime. Jenkins automatically restores the **last working version**.

### How it works (step by step)

1. **Before deploy:** Read last stable Docker image tag from `.deploy-state/stable_tag.txt`
2. **Deploy new version:** Start container `taskmanager-backend-new` on port 5000
3. **Health check:** Call `GET http://localhost:5000/health`
   - Must return HTTP `200` and body exactly `OK`
4. **If health FAILS (rollback):**
   - Stop and remove **new** failed container
   - Start **previous stable** image as `taskmanager-backend-stable`
   - Exit with error so Jenkins marks build as failed
5. **If health PASSES:**
   - Replace old stable container with new version
   - Save new tag as stable for next deployment

### Diagram

```
                    ┌─────────────────┐
                    │  New Deploy     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  GET /health    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
         [ OK ]                         [ FAIL ]
              │                             │
    ┌─────────▼─────────┐         ┌─────────▼─────────┐
    │ Promote to stable │         │ AUTO ROLLBACK     │
    │ Save new tag      │         │ Stop new container│
    └───────────────────┘         │ Start old stable  │
                                  └───────────────────┘
```

### Jenkins `post { failure }` block

Extra safety: if pipeline fails after deploy, Jenkins tries to start the stable container again and removes failed containers.

---

## Jenkins Setup (College Lab)

1. Install Jenkins and Docker on the same machine
2. Add Jenkins user to Docker group (Linux): `sudo usermod -aG docker jenkins`
3. Create **Pipeline** job → **Pipeline script from SCM** → point to your Git repo
4. Ensure MongoDB container is running:
   ```bash
   docker compose up -d mongodb
   ```
5. Run Jenkins build → watch stages in Blue Ocean or Console Output

### Simulate rollback (demo)

1. Deploy a working build first (creates stable tag)
2. Break the app (e.g. wrong `PORT` or stop MongoDB)
3. Run Jenkins again → health fails → rollback restores previous version

---

## Docker Commands Reference

```bash
# Build image manually
docker build -f backend/Dockerfile -t taskmanager-backend:latest .

# Run full stack
docker compose up -d --build

# View logs
docker compose logs -f backend

# List containers
docker ps

# Stop all
docker compose down
```

---

## GitHub Actions (CI) Setup

1. Push project to GitHub
2. Workflow runs automatically on push to `main`
3. View results: **Repository → Actions tab**

No extra secrets required for basic CI (build only, no push to registry).

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/taskmanager` |
| `NODE_ENV` | Environment | `development` / `production` |

---

## Viva Questions & Answers

**Q: What is CI vs CD?**  
A: CI (GitHub Actions) automatically tests/builds on every push. CD (Jenkins) automatically deploys to server after checks pass.

**Q: Why `/health` endpoint?**  
A: Jenkins needs a simple way to verify the app is running. `OK` response means deploy succeeded.

**Q: What is Docker Compose?**  
A: Tool to run multiple containers (MongoDB + Backend) with one command and shared network.

**Q: What happens during rollback?**  
A: Failed new container is stopped; previous stable Docker image is started again on port 5000.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Cannot connect to MongoDB | Ensure MongoDB container is running: `docker compose ps` |
| Port 5000 in use | Stop other apps or change port in `docker-compose.yml` |
| Jenkins deploy fails | Run `docker compose up -d mongodb` first |
| Health check fails | Wait 15s after deploy; check logs: `docker logs taskmanager-backend-stable` |

---

## Author

B.Tech CSE — 3rd Year DevOps Project  
**Project Title:** Task Manager App with CI/CD and Auto Rollback

---

## License

MIT — Free to use for educational purposes.
#   t r i g g e r   C I  
 #   p i p e l i n e   w o r k i n g  
 