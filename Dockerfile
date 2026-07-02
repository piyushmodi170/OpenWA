# OpenWA - Dockerfile (single-stage, no BuildKit/buildx required)
FROM docker.io/node:22-slim

# Build arg to control Chromium installation.
# Set INSTALL_CHROMIUM=true in your Coolify/Docker build args if you use the
# Puppeteer-based engine. The default (false) skips Chromium to keep the image
# lean — Baileys-based sessions do not require a browser.
ARG INSTALL_CHROMIUM=false

# Install runtime utilities + build tools (needed to compile native modules).
# build-essential/python3/make/g++ are only used during `npm ci` / `npm run build`;
# they stay in the image (single-stage trade-off) but add ~200 MB.
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    gosu \
    curl \
    procps \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Conditionally install Chromium and its GUI dependencies only when requested.
RUN if [ "$INSTALL_CHROMIUM" = "true" ]; then \
      apt-get update && apt-get install -y --no-install-recommends \
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
      && rm -rf /var/lib/apt/lists/*; \
    fi

# Set Chrome executable path for Puppeteer (only relevant when INSTALL_CHROMIUM=true)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create app user for security
RUN groupadd -r openwa && useradd -r -g openwa openwa

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY dashboard/package*.json ./dashboard/

# Rewrite Replit-internal registry URLs in BOTH lock files to the public npm registry.
# package-lock.json files may contain http://package-firewall.replit.local URLs baked in
# from development; that host doesn't exist outside Replit → npm ci fails with EAI_AGAIN.
RUN sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' package-lock.json && \
    sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' dashboard/package-lock.json

# Force development mode so npm ci installs ALL deps including devDependencies.
# Coolify injects NODE_ENV=production as a build arg which skips devDeps and breaks
# the build (nest CLI, typescript, etc. are devDeps but required to compile).
ENV NODE_ENV=development

# Install all dependencies (including devDependencies needed to compile)
RUN npm ci

# Copy source and build
COPY . .

# Build the API (dist/) and the dashboard SPA (dashboard/dist/).
# dashboard:ci installs dashboard deps from its own lock file.
RUN npm run build && npm run dashboard:ci && npm run dashboard:build

# Prune devDependencies after build — keeps the image lean without a second stage.
RUN npm prune --omit=dev && npm cache clean --force

# Switch back to production mode for runtime
ENV NODE_ENV=production

# Create data directories with correct ownership.
RUN mkdir -p ./data/sessions ./data/media ./data/plugins && \
    chown -R openwa:openwa /app/data

# Chromium config/cache dirs — see comment in multi-stage version re: XDG_* bypass.
ENV HOME=/app/data
ENV XDG_CONFIG_HOME=/tmp/.config
ENV XDG_CACHE_HOME=/tmp/.cache

# Copy entrypoint: runs as root to fix named-volume ownership, then drops to openwa via gosu
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 2785

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:2785/api/health/ready || exit 1

# dumb-init is PID 1 and handles signal forwarding.
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
