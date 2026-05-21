#!/bin/bash
# ============================================
# Jenkins Deploy Script with AUTO ROLLBACK
# Called from Jenkinsfile "Deploy Container" stage
#
# ROLLBACK LOGIC (for viva):
# 1. Save current stable image tag before deploy
# 2. Stop and remove old app container
# 3. Start NEW container with new image tag
# 4. Call GET /health - if NOT "OK", rollback:
#    - Stop and remove FAILED new container
#    - Restart PREVIOUS stable container/image
# 5. If health OK, save new tag as stable for next deploy
# ============================================

set -e

# Configuration (override via Jenkins environment)
APP_NAME="${APP_NAME:-taskmanager-backend}"
IMAGE_NAME="${IMAGE_NAME:-taskmanager-backend}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HEALTH_URL="${HEALTH_URL:-http://localhost:5000/health}"
NETWORK_NAME="${NETWORK_NAME:-taskmanager-network}"
MONGODB_URI="${MONGODB_URI:-mongodb://taskmanager-mongodb:27017/taskmanager}"
STATE_DIR="${STATE_DIR:-.deploy-state}"

# Container names for blue-green style rollback
NEW_CONTAINER="${APP_NAME}-new"
STABLE_CONTAINER="${APP_NAME}-stable"
STABLE_TAG_FILE="${STATE_DIR}/stable_tag.txt"
PREVIOUS_TAG_FILE="${STATE_DIR}/previous_tag.txt"

mkdir -p "${STATE_DIR}"

echo "============================================"
echo "  Task Manager - Deploy with Auto Rollback"
echo "============================================"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Health URL: ${HEALTH_URL}"

# Read previously stable image tag (for rollback)
PREVIOUS_STABLE="none"
if [ -f "${STABLE_TAG_FILE}" ]; then
  PREVIOUS_STABLE=$(cat "${STABLE_TAG_FILE}")
fi
echo "Previous stable tag: ${PREVIOUS_STABLE}"

# Ensure Docker network exists
docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1 || \
  docker network create "${NETWORK_NAME}"

# ---------- Deploy NEW container ----------
echo ""
echo "[1/4] Starting NEW container: ${NEW_CONTAINER}"

# Remove failed leftover new container if any
docker rm -f "${NEW_CONTAINER}" 2>/dev/null || true

docker run -d \
  --name "${NEW_CONTAINER}" \
  --network "${NETWORK_NAME}" \
  -p 5000:5000 \
  -e PORT=5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="${MONGODB_URI}" \
  "${IMAGE_NAME}:${IMAGE_TAG}"

# Wait for app to start
echo "[2/4] Waiting for application to start..."
sleep 8

# ---------- Health Check ----------
echo "[3/4] Running health check on ${HEALTH_URL}"

HEALTH_OK=false
MAX_RETRIES=5
RETRY=0

while [ "${RETRY}" -lt "${MAX_RETRIES}" ]; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")
  BODY=$(curl -s "${HEALTH_URL}" 2>/dev/null || echo "")

  if [ "${RESPONSE}" = "200" ] && [ "${BODY}" = "OK" ]; then
    HEALTH_OK=true
    echo "Health check PASSED (HTTP 200, body=OK)"
    break
  fi

  RETRY=$((RETRY + 1))
  echo "Health check attempt ${RETRY}/${MAX_RETRIES} failed (HTTP ${RESPONSE}). Retrying..."
  sleep 3
done

# ---------- AUTO ROLLBACK if health failed ----------
if [ "${HEALTH_OK}" = "false" ]; then
  echo ""
  echo "!!! HEALTH CHECK FAILED - STARTING AUTO ROLLBACK !!!"
  echo ""

  # ROLLBACK STEP 1: Stop and remove the FAILED new container
  echo "[ROLLBACK] Stopping failed new container: ${NEW_CONTAINER}"
  docker stop "${NEW_CONTAINER}" 2>/dev/null || true
  docker rm -f "${NEW_CONTAINER}" 2>/dev/null || true

  # ROLLBACK STEP 2: Restart previous stable version if it exists
  if [ "${PREVIOUS_STABLE}" != "none" ] && [ "${PREVIOUS_STABLE}" != "" ]; then
    echo "[ROLLBACK] Restarting previous stable image: ${IMAGE_NAME}:${PREVIOUS_STABLE}"

    docker rm -f "${STABLE_CONTAINER}" 2>/dev/null || true

    docker run -d \
      --name "${STABLE_CONTAINER}" \
      --network "${NETWORK_NAME}" \
      -p 5000:5000 \
      -e PORT=5000 \
      -e NODE_ENV=production \
      -e MONGODB_URI="${MONGODB_URI}" \
      "${IMAGE_NAME}:${PREVIOUS_STABLE}"

    echo "[ROLLBACK] Previous stable version restored on port 5000"
  else
    echo "[ROLLBACK] No previous stable tag found - cannot restore older version"
  fi

  echo ""
  echo "DEPLOYMENT FAILED - Rolled back to previous stable release"
  exit 1
fi

# ---------- Deploy SUCCESS - promote new to stable ----------
echo ""
echo "[4/4] Deployment successful - promoting new version to stable"

# Stop old stable container (running on port 5000)
docker stop "${STABLE_CONTAINER}" 2>/dev/null || true
docker rm -f "${STABLE_CONTAINER}" 2>/dev/null || true

# Stop temporary new container and restart as stable with same tag
docker stop "${NEW_CONTAINER}" 2>/dev/null || true
docker rm -f "${NEW_CONTAINER}" 2>/dev/null || true

docker run -d \
  --name "${STABLE_CONTAINER}" \
  --network "${NETWORK_NAME}" \
  -p 5000:5000 \
  -e PORT=5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="${MONGODB_URI}" \
  "${IMAGE_NAME}:${IMAGE_TAG}"

# Save tags for next rollback
echo "${PREVIOUS_STABLE}" > "${PREVIOUS_TAG_FILE}"
echo "${IMAGE_TAG}" > "${STABLE_TAG_FILE}"

echo ""
echo "============================================"
echo "  Deploy complete! App live at port 5000"
echo "  Stable tag saved: ${IMAGE_TAG}"
echo "============================================"
exit 0
