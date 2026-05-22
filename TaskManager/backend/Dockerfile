FROM node:20-alpine

RUN apk add --no-cache wget curl

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production 2>/dev/null || npm install --only=production

COPY src ./src

COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]