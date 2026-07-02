import { existsSync } from 'fs';
import { execSync } from 'child_process';

/**
 * Resolve the best available Chromium/Chrome executable path at runtime.
 * Priority:
 *  1. PUPPETEER_EXECUTABLE_PATH env var — only if the file actually exists
 *  2. Common system paths (distro packages, snap, nix store pattern)
 *  3. `which chromium` / `which google-chrome-stable` / `which google-chrome`
 *  4. undefined — lets Puppeteer/whatsapp-web.js use its own bundled binary
 */
function resolveChromiumPath(): string | undefined {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
  if (envPath && existsSync(envPath)) return envPath;

  const candidates = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/snap/bin/chromium',
    '/usr/local/bin/chromium',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  // Try nix store glob (path changes across rebuilds)
  try {
    const nixChrome = execSync('find /nix/store -maxdepth 4 -name chromium -type f 2>/dev/null | grep bin/chromium | head -1', { timeout: 3000 }).toString().trim();
    if (nixChrome && existsSync(nixChrome)) return nixChrome;
  } catch { /* ignore */ }

  // Try `which`
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome-stable', 'google-chrome']) {
    try {
      const p = execSync(`which ${bin} 2>/dev/null`, { timeout: 2000 }).toString().trim();
      if (p && existsSync(p)) return p;
    } catch { /* ignore */ }
  }

  return undefined;
}

export default () => ({
  port: parseInt(process.env.PORT || '2785', 10),

  // Redis configuration
  // REDIS_URL takes precedence when set (e.g. redis://:password@host:port)
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // Queue configuration
  queue: {
    enabled: process.env.QUEUE_ENABLED === 'true',
  },

  // Cache configuration
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
  },

  // Main Database configuration (always SQLite for boot config)
  database: {
    type: 'sqlite' as const,
    database: './data/main.sqlite',
    // Schema management for the auth/audit DB. Default ON (zero-config first boot).
    // Set MAIN_DATABASE_SYNCHRONIZE=false to manage schema via the main-owned migrations
    // instead (migrationsRun then creates api_keys/audit_logs). When disabled, run the
    // main-connection migrations explicitly with `npm run migration:run:main` (or
    // `migration:run:main:prod` for the compiled image) — the plain `migration:run` only
    // manages the data connection.
    synchronize: process.env.MAIN_DATABASE_SYNCHRONIZE !== 'false',
    logging: process.env.DATABASE_LOGGING === 'true',
  },

  // Data Storage Database configuration (pluggable: SQLite, PostgreSQL, etc.)
  dataDatabase: {
    type: process.env.DATABASE_TYPE || 'sqlite',
    // SQLite path (used when type is sqlite)
    database: process.env.DATABASE_NAME || './data/openwa.sqlite',
    // Postgres database NAME (used when type is postgres). Resolved from the same
    // DATABASE_NAME env as the migration CLI (data-source.ts) so the runtime factory and
    // migrations never target different databases. Distinct sqlite-vs-pg defaults.
    name: process.env.DATABASE_NAME || 'openwa',
    // PostgreSQL/MySQL connection (used when type is postgres/mysql)
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.PGPASSWORD || process.env.DATABASE_PASSWORD,
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    // Connection pooling (PostgreSQL)
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    // SSL configuration
    ssl: process.env.DATABASE_SSL === 'true',
    sslRejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  },

  // WhatsApp engine configuration
  engine: {
    type: process.env.ENGINE_TYPE || 'whatsapp-web.js',
    puppeteer: {
      headless: process.env.PUPPETEER_HEADLESS !== 'false',
      args: (process.env.PUPPETEER_ARGS || '--no-sandbox,--disable-setuid-sandbox').split(','),
      // Optional path to a system Chromium/Chrome binary. When unset, whatsapp-web.js
      // uses Puppeteer's bundled Chromium. Required on hosts where the bundled binary
      // is missing or incompatible (Alpine, ARM, custom base images).
      executablePath: resolveChromiumPath(),
    },
    sessionDataPath: process.env.SESSION_DATA_PATH || './data/sessions',
    // Baileys engine (used when ENGINE_TYPE=baileys). Multi-file auth state base dir; each session
    // gets its own subdirectory. Read by the Baileys plugin from the opaque engine config blob.
    baileys: {
      authDir: process.env.BAILEYS_AUTH_DIR || './data/baileys',
    },
  },

  // Webhook configuration
  webhook: {
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '10000', 10),
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '5000', 10),
  },

  // API configuration
  api: {
    rateLimit: {
      // Short burst protection: 10 requests per second
      shortTtl: parseInt(process.env.RATE_LIMIT_SHORT_TTL || '1000', 10),
      shortLimit: parseInt(process.env.RATE_LIMIT_SHORT_LIMIT || '10', 10),
      // Medium protection: 100 requests per minute
      mediumTtl: parseInt(process.env.RATE_LIMIT_MEDIUM_TTL || '60000', 10),
      mediumLimit: parseInt(process.env.RATE_LIMIT_MEDIUM_LIMIT || '100', 10),
      // Long protection: 1000 requests per hour
      longTtl: parseInt(process.env.RATE_LIMIT_LONG_TTL || '3600000', 10),
      longLimit: parseInt(process.env.RATE_LIMIT_LONG_LIMIT || '1000', 10),
    },
  },

  // Security configuration
  security: {
    // Comma-separated IPs/CIDRs of reverse proxies whose X-Forwarded-For header
    // may be trusted for client-IP resolution. Empty by default: X-Forwarded-For
    // is ignored and the direct socket address is used, preventing spoofing of
    // the API-key allowedIps whitelist.
    trustedProxies: (process.env.TRUSTED_PROXIES || '')
      .split(',')
      .map(proxy => proxy.trim())
      .filter(Boolean),
  },

  // Storage configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'local',
    localPath: process.env.STORAGE_LOCAL_PATH || './data/media',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      endpoint: process.env.S3_ENDPOINT,
    },
  },
});
