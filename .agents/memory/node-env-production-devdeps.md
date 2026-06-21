---
name: NODE_ENV=production breaks devDependencies
description: Replit sets NODE_ENV=production globally; plain npm install skips devDependencies, losing CLI tools like @nestjs/cli and vite.
---

**Rule:** Always run `NODE_ENV=development npm install` in this project (both root and dashboard subdirectory). Never run a plain `npm install` without prefixing the env override.

**Why:** Replit sets `NODE_ENV=production` as a shared env var. npm skips devDependencies when NODE_ENV=production, which removes @nestjs/cli (needed for `nest start --watch`) and vite (needed for dashboard dev server). The symptom is `nest: command not found` or `vite: not found` immediately after an install.

**How to apply:**
- Root: `NODE_ENV=development npm install`
- Dashboard: `cd dashboard && NODE_ENV=development npm install`
- After installing new packages: always use the NODE_ENV=development prefix
- Scripts in package.json already patched: `dashboard:install` and `dashboard:ci` use `NODE_ENV=development`
