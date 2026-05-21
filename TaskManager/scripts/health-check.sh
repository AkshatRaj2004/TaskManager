#!/bin/bash
# ============================================
# Standalone Health Check Script
# Used by Jenkins "Health Check" stage
# Returns exit 0 if OK, exit 1 if failed
# ============================================

HEALTH_URL="${HEALTH_URL:-http://localhost:5000/health}"
MAX_RETRIES="${MAX_RETRIES:-5}"

echo "Checking health at: ${HEALTH_URL}"

for i in $(seq 1 "${MAX_RETRIES}"); do
  HTTP_CODE=$(curl -s -o /tmp/health_body.txt -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")
  BODY=$(cat /tmp/health_body.txt 2>/dev/null || echo "")

  if [ "${HTTP_CODE}" = "200" ] && [ "${BODY}" = "OK" ]; then
    echo "Health check PASSED"
    exit 0
  fi

  echo "Attempt ${i}/${MAX_RETRIES} failed (HTTP ${HTTP_CODE}, body='${BODY}')"
  sleep 3
done

echo "Health check FAILED"
exit 1
