# ============================================
# Dockerfile for Task Manager Backend
# Build from PROJECT ROOT: docker build -f backend/Dockerfile .
# ============================================

FROM node:20-alpine

# Tools for health checks in container
RUN apk add --no-cache wget curl

# Match local folder layout: /app/backend + /app/frontend
WORKDIR /app/backend

# Copy package files first (layer caching)
COPY backend/package*.json ./

# Install production dependencies
RUN npm ci --only=production 2>/dev/null || npm install --only=production

# Copy backend source and frontend static files
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY frontend ../frontend

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Health check used by Docker and Jenkins
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
