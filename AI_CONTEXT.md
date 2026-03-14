# OneForm Unified — Master AI Context File

> Paste this into any AI assistant (Claude, Copilot, Cursor, Gemini) for full zero-confusion context.
> Last updated: 2026-03-14 | Hetzner commit: 2e1c9a7

---

## PROJECT IDENTITY — READ THIS FIRST

**This file is for: OneForm Unified Platform**
- GitHub: `DeepakOla/oneform-unified`
- Domain: `indianform.com`
- Hetzner path: `/home/dkumar/oneform/oneform-unified/`
- Local VS Code path: `C:\Users\HP\Documents\Downloads\oneform unified-2026\`

**This is NOT the Hazelon Power project.**
- Power GitHub: `DeepakOla/Power-Backend`
- Power domain: `hazelon.com`
- Power Hetzner path: `/opt/power/`
- Power git remote: `git@github-backend:DeepakOla/Power-Backend.git`
- Power SSH alias: `github-backend` (key: `~/.ssh/github_backend`)

**NEVER mix files, commits, secrets, or SSH keys between these two projects.**

---

## WHAT THIS PROJECT DOES

AI-powered Indian government form autofill SaaS. Multi-tenant.

Three user types:
- **CITIZEN** — fills their own forms
- **OPERATOR** (Arthiyas) — village agents serving farmers, illiterate users (primary paying segment)
- **BUSINESS** — HR companies doing bulk submissions

B2B2G middleware. Tenant-based. Multi-language: Hindi + English.

---

## HETZNER SERVER — TWO PROJECTS, ZERO CONFLICTS

Server IP: `135.181.112.160`

| Project | Path | DB Port | Redis Port | Docker Network |
|---------|------|---------|------------|----------------|
| **OneForm** | `/home/dkumar/oneform/oneform-unified/` | **5433** | **6380** | oneform_network |
| **Hazelon Power** | `/opt/power/` | **5432** | **6379** | power_net |

**Shared stateless services (safe to call from both projects — no DB writes):**

| Service | Port | Notes |
|---------|------|-------|
| Ollama LLM | 11435 | Stateless per-request |
| OCR Ensemble | 8004 | Stateless per-request |
| Skyvern | 8085 | Stateless per-request |

**Complete Port Map:**

| Port | Service | Project |
|------|---------|---------|
| 4000 | OneForm API (Express) | OneForm |
| 5433 | oneform-postgres (PostgreSQL 17) | OneForm |
| 6380 | oneform-redis (Redis 8) | OneForm |
| 8001 | Scrapling microservice (planned) | OneForm |
| 3000 | power-openwebui | Power |
| 3001 | power-grafana | Power |
| 5432 | power-postgres | Power |
| 6379 | power-redis | Power |
| 5678 | power-n8n | Power |
| 6333 | power-qdrant | Power |
| 7687 | power-neo4j | Power |
| 8004 | ocr_ensemble | SHARED |
| 8085 | power-skyvern | SHARED |
| 11435 | power-ollama | SHARED |

---

## SSH KEYS ON HETZNER — WHICH KEY FOR WHICH REPO

| Key file | SSH alias | GitHub repo |
|----------|-----------|-------------|
| `~/.ssh/github_oneform` | `github-oneform` | `DeepakOla/oneform-unified` |
| `~/.ssh/github_deploy` | `github.com` (default fallback) | hazelon general |
| `~/.ssh/github_backend` | `github-backend` | `DeepakOla/Power-Backend` |

**`~/.ssh/config`:**
```
Host github-oneform
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_oneform
  IdentitiesOnly yes

Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes

Host github-backend
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_backend
  IdentitiesOnly yes
```

**Git remotes:**
- OneForm: `git@github-oneform:DeepakOla/oneform-unified.git`
- Power: `git@github-backend:DeepakOla/Power-Backend.git`

---

## CLOUDFLARE SETUP

| Resource | Name | Purpose |
|----------|------|---------|
| Pages | `oneform-unified-web` | React SPA → `indianform.com` |
| Worker | `oneform-unified` | DO NOT DELETE — kept intentionally |
| Worker | `power` | Hazelon Power — separate project |
| R2 Bucket | `oneform-documents` | Document storage for OCR uploads |
| Tunnel | Token-based (no local config.yml) | Routes `api.indianform.com` → Hetzner:4000 |

CF Account ID: `528ce312cefbd072120fc9a83d0a62de`

**GitHub Actions secrets (in DeepakOla/oneform-unified repo):**
- `CLOUDFLARE_API_TOKEN` — set already
- `CLOUDFLARE_ACCOUNT_ID` — set already
- `VITE_API_URL` — **needs to be set** → value: `https://api.indianform.com`

**Cloudflare Tunnel — add public hostname:**
Go to CF Dashboard → Zero Trust → Tunnels → (select the tunnel) → Public Hostname tab → Add:
- Subdomain: `api`, Domain: `indianform.com`, Service: `http://localhost:4000`

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >=22 + pnpm 10.32.1 + Turborepo |
| API | Express 5 + TypeScript strict mode |
| ORM | Prisma 6 + PostgreSQL 17 |
| Queue | BullMQ + ioredis (Redis 8) |
| Frontend | React 19 + Vite 6 + shadcn/ui + TanStack Query v5 + React Router v7 |
| Extension | Chrome MV3 + @crxjs/vite-plugin |
| Auth | argon2id + jose (HS256 JWT) + refresh token rotation |
| Encryption | AES-256-GCM envelope encryption for Section A PII |
| Deploy | CF Pages (frontend) + Hetzner (API + PostgreSQL + Redis + Scrapling) |

---

## MONOREPO STRUCTURE

```
apps/api/                ← Express 5 REST API (port 4000)
apps/web/                ← React 19 dashboard (port 3000 in dev)
apps/extension/          ← Chrome MV3 extension
apps/telegram/           ← stub only
apps/desktop/            ← stub only
apps/mobile/             ← stub only
packages/shared-types/   ← TypeScript types shared between apps
packages/validation/     ← Zod schemas shared between apps
```

---

## ENVIRONMENT VARIABLES

### `apps/api/.env` — Hetzner (production/staging)
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://oneform:oneform@localhost:5433/oneform"
REDIS_URL="redis://localhost:6380"
JWT_ACCESS_SECRET="<openssl rand -hex 32>"
ENCRYPTION_KEK="<openssl rand -base64 32>"
ENCRYPTION_KEK_VERSION="1"
ALLOWED_ORIGINS="http://localhost:3000,https://indianform.com,https://www.indianform.com"
```

### `apps/api/.env` — Local dev (Windows/Mac)
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://oneform:oneform@localhost:5432/oneform_dev"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="dev-secret-any-long-string"
ENCRYPTION_KEK="<openssl rand -base64 32>"
ENCRYPTION_KEK_VERSION="1"
ALLOWED_ORIGINS="http://localhost:3000"
```

### `apps/web/.env` — Local dev only
```env
VITE_API_URL=http://localhost:4000
```
Production VITE_API_URL is a GitHub Actions secret — baked into JS bundle at build time.

### Variable name gotchas:
- `JWT_ACCESS_SECRET` — NOT `JWT_SECRET`
- `ENCRYPTION_KEK` — NOT `ENCRYPTION_KEY`

---

## CI/CD PIPELINES

### `.github/workflows/ci.yml` — triggers on: push to main, pull_request
```
1. actions/checkout@v4
2. pnpm/action-setup@v4          ← NO "version:" field — reads from packageManager in package.json
3. actions/setup-node@v4 (22)    ← with cache: pnpm
4. pnpm install --frozen-lockfile
5. prisma generate               ← MUST run before type-check (generates TS types)
6. Build shared packages
7. pnpm run type-check
```

### `.github/workflows/deploy.yml` — triggers on: push to main
```
1-5. Same as CI
6. Build web app
     env: VITE_API_URL: ${{ secrets.VITE_API_URL }}   ← baked into bundle
7. cloudflare/wrangler-action@v3
     command: pages deploy apps/web/dist --project-name=oneform-unified-web --branch=main
```

### CRITICAL RULES for workflows:
- `pnpm/action-setup@v4` with NO `version:` — it reads from `packageManager: pnpm@10.32.1` in package.json
- Adding `version: 10` causes ERROR: "Multiple versions of pnpm specified" — never add it
- `actions/checkout@v4` is the latest — there is NO @v5 or @v6
- `prisma generate` MUST precede type-check or CI fails with implicit `any` errors
- CF Pages project name: `oneform-unified-web` (must match exactly)

---

## WHAT IS DONE vs WHAT NEEDS DOING

### DONE
- Monorepo scaffold (Turborepo + pnpm workspaces + TypeScript strict)
- Prisma schema: 14 tables — User, Tenant, Profile, Document, FormTemplate, Wallet, WalletTransaction, Session, OAuthAccount, AuditLog, CRMConnection, SyncJob, SyncJobLog + migration lock
- Prisma migrations run on Hetzner PostgreSQL (2026-03-14) — 14 tables live
- DB seeded with demo data on Hetzner
- `auth.service.ts` — real argon2id + jose JWT (not mocks)
- `encryption.service.ts` — AES-256-GCM envelope encryption
- `profile.service.ts` — ABCD sections + encryption + AuditLog
- `wallet.service.ts` — getWallet, credit/deduct, Razorpay topup+verify
- `auth.routes.ts` — register/login/refresh/logout/me (all live)
- `profile.routes.ts` — all 6 endpoints live (no 501 stubs)
- `wallet.routes.ts` — all 4 endpoints live (no 501 stubs)
- Cloudflare Pages project created (`oneform-unified-web`)
- R2 bucket created (`oneform-documents`)
- GitHub secrets set (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)
- CI/Deploy workflows fixed (commit on Hetzner — being pushed via SSH key)

### NEEDS DOING — Immediate (infrastructure)
- **Add deploy key** to `github.com/DeepakOla/oneform-unified/settings/keys` → then push
- **Add `VITE_API_URL` GitHub secret** → `https://api.indianform.com`
- **Create `oneform-redis` container** on Hetzner (port 6380)
- **Add `api.indianform.com` hostname** to Cloudflare Tunnel
- **Build + run OneForm API** on Hetzner (port 4000)
- **Security fix**: rebind oneform-postgres to `127.0.0.1:5433` (currently `0.0.0.0:5433`)

### NEEDS DOING — Feature work (ordered)
1. i18n setup — react-i18next (English + Hindi)
2. Dashboard pages — Profile list/detail, Document upload, Wallet top-up (currently "Under Construction" stubs)
3. Document routes — R2 presigned upload + OCR via BullMQ worker
4. `admin.routes.ts` — all 501 stubs → implement
5. Guest login flow
6. Phone OTP (MSG91)
7. Scrapling microservice — Python FastAPI (port 8001)
8. E2E tests (Playwright)

---

## FILE STATUS QUICK REFERENCE

| File | Status |
|------|--------|
| `apps/api/prisma/schema.prisma` | COMPLETE — 14 models, migrations run |
| `apps/api/prisma/seed.ts` | COMPLETE |
| `apps/api/src/services/auth.service.ts` | COMPLETE — real argon2id + jose |
| `apps/api/src/services/encryption.service.ts` | COMPLETE — AES-256-GCM |
| `apps/api/src/services/profile.service.ts` | COMPLETE — ABCD + encryption |
| `apps/api/src/services/wallet.service.ts` | COMPLETE — Razorpay too |
| `apps/api/src/routes/auth.routes.ts` | COMPLETE |
| `apps/api/src/routes/profile.routes.ts` | COMPLETE |
| `apps/api/src/routes/wallet.routes.ts` | COMPLETE |
| `apps/api/src/routes/document.routes.ts` | ALL 501 STUBS — future phase |
| `apps/api/src/routes/admin.routes.ts` | ALL 501 STUBS — future phase |
| `apps/api/src/routes/extension.routes.ts` | stub |
| `apps/web/src/i18n/` | MISSING — react-i18next not set up |
| Dashboard pages (Profile/Queue/Docs/Wallet) | STUBS — "Under Construction" |

---

## TYPESCRIPT CONVENTIONS

- `exactOptionalPropertyTypes: true` — use spread-conditional pattern for optional fields
- `noUnusedLocals: true` — rename unused vars to `_varName`
- `noUnusedParameters: true` — rename unused params to `_paramName`
- React 19 auto-JSX transform — **NEVER** `import React from 'react'` in .tsx files
- ioredis: `import { Redis } from 'ioredis'` (named import — NOT `new Redis.default()`)
- Express 5 params: use the `getParam()` helper (not `req.params.id` directly)
- Prisma `Bytes` (Buffer): cast the spread as `any`
- Prisma JSON fields: cast at point of use as `any`
- Import assertions: `with { type: 'json' }` NOT `assert { type: 'json' }`

---

## DATABASE CONVENTIONS

- All monetary values: **integer paisa** (100 paisa = ₹1, display only divides by 100)
- Section A PII: **ALWAYS** encrypt via `encryption.service.ts` before writing to DB
- Decryption: server-side only; always write `AuditLog` entry when decrypting
- JWT: 15min access token (HS256) + refresh token stored as SHA-256 hash in `sessions` table
- Logout: deletes ALL sessions for user (not just current session)

---

## FRONTEND CONVENTIONS

- `apps/web/src/lib/api/client.ts` — axios singleton; request interceptor attaches Bearer token; response interceptor on 401 → hard redirect to /login
- `AuthContext.tsx` — always check `isLoading` before `isAuthenticated`
- Dashboard routing: `/dashboard` is the layout shell, nested routes render inside `<Outlet />`
- No `localStorage.clear()` anywhere except the logout handler

---

## ANTI-PATTERNS — NEVER DO THESE

| # | Anti-pattern | Correct alternative |
|---|-------------|-------------------|
| 1 | `version: 10` in pnpm/action-setup@v4 | Remove it — v4 reads from packageManager |
| 2 | `actions/checkout@v6` | Use `actions/checkout@v4` (latest) |
| 3 | `JWT_SECRET` in .env | `JWT_ACCESS_SECRET` |
| 4 | `ENCRYPTION_KEY` in .env | `ENCRYPTION_KEK` |
| 5 | Pushing to `Power-Backend` from oneform folder | Check `git remote -v` before pushing |
| 6 | Encrypting PII at read/display time | Encrypt at write time, never read-encrypt |
| 7 | Float arithmetic for money | Integer paisa only (BigInt in DB) |
| 8 | `import React from 'react'` in .tsx | React 19 auto-JSX, no import needed |
| 9 | `new Redis.default()` | `import { Redis } from 'ioredis'` |
| 10 | Scrapling → Power's Redis (6379) | Scrapling → OneForm's Redis (6380) |
| 11 | docker-compose up without checking which project | Check pwd + check port map above |

---

## LOCAL DEV SETUP (VS Code on Windows)

```powershell
# In C:\Users\HP\Documents\Downloads\oneform unified-2026\
corepack enable
pnpm install
copy apps\api\.env.example apps\api\.env   # then edit with values from ".env — local dev" section above
pnpm --filter @oneform/api exec prisma generate
pnpm --filter @oneform/api exec prisma migrate dev
pnpm --filter @oneform/api exec tsx prisma/seed.ts
pnpm dev   # api on :4000 + web on :3000
```

Then open `http://localhost:3000` — login with seed credentials.

---

## SEED CREDENTIALS

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@indianform.com | Admin@1234 |
| Citizen | citizen@example.com | Citizen@1234 |

---

## SCRAPLING MICROSERVICE — Phase 4 (not built yet)

Python FastAPI on Hetzner port **8001**. Completely independent process.

```
Flow:
  Form URL → Scrapling (8001) → Playwright DynamicFetcher (JS-heavy portals)
           → Ollama (11435) for Hindi field label translation
           → OneForm PostgreSQL (5433) to store FormTemplate
```

**Does NOT touch:** Power's PostgreSQL (5432), Power's Redis (6379), or any Power container.

---

## GITHUB ACTIONS — PR RULES

- PR #16 (`copilot/devops-project-analysis`) — **DO NOT MERGE as-is**
  - Uses `actions/checkout@v6` which does not exist → CI fails
  - Keeps `version: 10` in pnpm/action-setup → pnpm conflict error
  - All its valid fixes are already in commit `2e1c9a7` on Hetzner (better implementation)
  - Cherry-pick only: `apps/web/wrangler.toml`, `apps/api/package.json` db scripts, `README.md` updates
  - After those are merged, close PR #16

---

## HOW TO DEPLOY (once SSH key is added to GitHub)

```bash
# On Hetzner, from /home/dkumar/oneform/oneform-unified/
git push origin main
# -> GitHub Actions runs: CI (type-check) + Deploy (CF Pages)
# -> yourapp: https://oneform-unified-web.pages.dev
```

For API on Hetzner (to be set up):
```bash
pnpm --filter @oneform/api run build
pm2 start apps/api/dist/index.js --name oneform-api
# API runs on port 4000; Cloudflare Tunnel proxies api.indianform.com → :4000
```
