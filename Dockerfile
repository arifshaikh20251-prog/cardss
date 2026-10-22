# ==============================================================================
# Production Dockerfile for B2B UtilityPay Backend Engine
# Lightweight Node.js 20 Alpine Linux image with non-root security enforcement
# ==============================================================================

FROM node:20-alpine AS base

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5000

# Install security updates
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy backend source code & database schema
COPY src/ ./src/
COPY database/ ./database/

# Security: Run as unprivileged non-root user
USER node

# Expose internal application port
EXPOSE 5000

# Docker Healthcheck targeting platform health API
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

# Launch Express server and 24h background cooling worker
CMD ["node", "src/server.js"]
