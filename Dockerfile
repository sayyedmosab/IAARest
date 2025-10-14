# Multi-stage build for Ibnexp self-contained system

# Stage 1: Build Angular frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy Angular package files
COPY package*.json ./
COPY angular.json tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy Angular source code
COPY src ./src
COPY index.html ./

# Build Angular application
RUN npm run build -- --configuration=production

# Stage 2: Build Node.js backend
FROM node:20-alpine AS backend-build

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install backend dependencies
RUN npm ci

# Copy backend source code
COPY backend/src ./src
COPY backend/tsconfig*.json ./

# Build backend
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ibnexp -u 1001

WORKDIR /app

# Copy backend built files
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/package*.json ./backend/
COPY --from=backend-build /app/backend/.env* ./backend/

# Copy Angular built files
COPY --from=frontend-build /app/frontend/dist/ibnexp ./frontend/dist

# Install production dependencies for backend
WORKDIR /app/backend
RUN npm ci --only=production && npm cache clean --force

# Create directories for data and uploads
RUN mkdir -p /app/data /app/uploads /app/backend/uploads

# Set ownership
RUN chown -R ibnexp:nodejs /app
USER ibnexp

# Expose ports
EXPOSE 3000 4200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start script
COPY --chown=ibnexp:nodejs scripts/start.sh /app/
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]