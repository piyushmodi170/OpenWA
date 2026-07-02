# OpenWA - Dockerfile
# Multi-stage build for production-ready image

# ===== Stage 1: Builder =====
FROM docker.io/node:22-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
# Copy dashboard package files early (before COPY . .) so we can reuse cache
COPY dashboard/package*.json ./dashboard/

# Rewrite Replit-internal registry URLs in BOTH lock files to the public npm registry.
RUN sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' package-lock.json && \
    sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' dashboard/package-lock.json

# Force development mode so npm ci installs ALL deps including devDependencies.
ENV NODE_ENV=development

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the API and dashboard
RUN npm run build && npm run dashboard:ci && npm run dashboard:build

# ===== Stage 2: Production =====
FROM docker.io/node:22-slim AS production

# Always install Chromium — this image is built with INSTALL_CHROMIUM=true via GitHub Actions
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    gosu \
    curl \
    procps \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN groupadd -r openwa && useradd -r -g openwa openwa

WORKDIR /app

COPY package*.json ./

RUN sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' package-lock.json

RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dashboard/dist ./dashboard/dist

RUN mkdir -p ./data/sessions ./data/media ./data/plugins && \
    chown -R openwa:openwa /app/data

ENV HOME=/app/data
ENV XDG_CONFIG_HOME=/tmp/.config
ENV XDG_CACHE_HOME=/tmp/.cache

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 2785

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:2785/api/health/ready || exit 1

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
