# IMPORTANT: Node.js Version Maintenance
# This Dockerfile uses Node.js 24.22.0-slim, which was the latest LTS version at the time of writing.
# To ensure security and compatibility, regularly update the NODE_VERSION ARG to the latest LTS version.
ARG NODE_VERSION=24.22.1-slim

FROM node:${NODE_VERSION}

# Set working directory
WORKDIR /app

ENV PORT=9000

# Copy package-related files first to leverage Docker's caching mechanism
COPY package.json package-lock.json ./
COPY apps/realtime/package.json ./apps/realtime/

# Install project dependencies with frozen lockfile for reproducible builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --workspace apps/realtime

# Copy application source code
COPY ./apps/realtime/dist/rollup/appRealtime.js ./apps/realtime/appRealtime.js

USER node

# Start server
CMD ["node", "./apps/realtime/appRealtime.js"]
