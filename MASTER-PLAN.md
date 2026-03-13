# OneForm Unified Platform — Master Plan
> **Single source of truth for building, deploying, and operating OneForm.**
> Anyone following this document should be able to get the platform running end-to-end.
> Last updated: 2026-03-13

---

## Table of Contents
1. [What This Project Is](#1-what-this-project-is)
2. [Current State Assessment](#2-current-state-assessment)
3. [Infrastructure Map (Hetzner + Cloudflare)](#3-infrastructure-map)
4. [Port Allocation & Conflict Avoidance](#4-port-allocation)
5. [Phase 0 — Foundation (Local Dev)](#5-phase-0)
6. [Phase 1 — Make It Work (MVP)](#6-phase-1)
7. [Phase 2 — Make It Deployable (Hetzner + CF)](#7-phase-2)
8. [Phase 3 — Make It Useful (Core Features)](#8-phase-3)
9. [Phase 4 — Make It Smart (AI + Automation)](#9-phase-4)
10. [Security Checklist](#10-security)
11. [Key Decisions & Rationale](#11-decisions)
12. [File Map](#12-file-map)

---

## 1. What This Project Is

AI-powered Indian government form autofill SaaS. Multi-tenant. Three user types:

| Role | Who | How They Pay |
|------|-----|-------------|
| **CITIZEN** | Individual users | Free tier or ₹29/form |
| **OPERATOR** (Arthiyas) | Village-level agents serving farmers/illiterate users | ₹2-29 per form, bulk wallet |
| **BUSINESS** | Companies filing for employees | Monthly subscription |

**Core value proposition:** A citizen or operator creates a profile once (Aadhaar, PAN, address, etc.), then the Chrome extension auto-fills ANY Indian government portal. The extension uses a 3-tier AI field detection system optimized for 2GB RAM laptops common in CSC centers.

**Domain:** indianform.com (registered at GoDaddy, DNS on Cloudflare)

---

## 2. Current State Assessment

### What's Real & Working (code-level)
| Component | Status | Notes |
|-----------|--------|-------|
| Monorepo scaffold | DONE | Turborepo + pnpm 10, 5 packages |
| TypeScript strict mode | DONE | `pnpm run type-check` = zero errors |
| Auth service | DONE | argon2id + jose JWT, register/login/refresh/logout/me |
| Encryption service | DONE | AES-256-GCM envelope encryption for Section A PII |
| Profile service | DONE | Full ABCD CRUD, encryption at save time, AuditLog on decrypt |
| Wallet service | DONE | getWallet, credit/deduct (atomic), Razorpay topup+verify |
| Deduplication service | DONE | Parameterized SQL (injection fixed 2026-03-13) |
| Profile routes | DONE | All 6 endpoints live |
| Wallet routes | DONE | All 4 endpoints live |
| Auth routes | DONE | 5 endpoints live |
| React dashboard | DONE | Login, Register, DashboardShell + Sidebar + Header |
| Prisma schema | DONE | 10 models, all enums, ready for migration |
| CI workflow | DONE | type-check on push/PR to main |
| Deploy workflow | DONE | `wrangler-action@v3` → CF Pages (fixed from deprecated pages-action) |
| Extension field detection | DONE | 80+ field types, 11 Indian languages, 12+ portal mappings |
| Extension vault | DONE | AES-256-GCM client-side encryption via Web Crypto |
| Extension AI providers | DONE | 5-provider fallback chain (Groq→OpenRouter→Skyvern→Gemini→Ollama) |

### What's NOT Working Yet
| Component | Status | Blocker |
|-----------|--------|---------|
| Database | NO migrations run | Needs PostgreSQL running |
| CF Pages project | NOT CREATED | User created a Worker by mistake — needs deletion + proper Pages project |
| DNS records | WRONG | Points to old GoDaddy IPs (15.197.148.33, 3.33.130.190) |
| GitHub Actions secrets | NOT SET | Need CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID |
| R2 bucket | NOT CREATED | No `oneform-documents` bucket |
| Document routes | ALL 501 STUBS | Phase 3 work |
| Admin routes | ALL 501 STUBS | Phase 3 work |
| Extension routes | MOCKED | Need real SyncJob queries |
| i18n | MISSING | No react-i18next setup |
| Hetzner API deployment | NOT DONE | Need container setup + tunnel routing |
| Scrapling microservice | NOT BUILT | Python FastAPI — Phase 4 |

### Bugs Fixed (2026-03-13)
1. SQL injection in `deduplication.service.ts` → now uses parameterized `$queryRawUnsafe`
2. TOCTOU race in `wallet.service.ts` → now uses Prisma interactive transaction
3. Node version mismatch → lowered to `>=20.0.0` (works on local v20, CI v22, Hetzner v24)
4. Domain references → all `indianform.in` → `indianform.com` across entire codebase
5. Deploy workflow → `cloudflare/pages-action@v1` (deprecated) → `cloudflare/wrangler-action@v3`
6. CI/Deploy Node version → 24 → 22 (stable LTS, matches CF Pages default)
7. `pnpm/action-setup` → v3 → v4

---

## 3. Infrastructure Map

### Two Projects, One Server

**Hetzner server:** 135.181.112.160 (192GB RAM, Helsinki, Ubuntu 24.04, Docker 29.2.1)

This server runs BOTH:
- **Hazelon Power** (legal AI for electricity law) — already deployed
- **OneForm** (this project) — setting up now

### Existing Containers on Hetzner (Power project)

From `docker ps` on the server:

| Container | Image | Port(s) | Project |
|-----------|-------|---------|---------|
| power-backend | power-backend:latest | 8000 | Power |
| power-frontend | power-frontend:latest | 3001 | Power |
| power-postgres | postgres:16 | 5432 | Power |
| power-redis | redis:7.4.2 | 6379 | Power |
| power-neo4j | neo4j:5 | 7474, 7687 | Power |
| power-qdrant | qdrant/qdrant | 6333, 6334 | Power |
| power-ollama | ollama/ollama | 11435 | Power |
| skyvern | skyvern:latest | 8085 | **Shared** |
| skyvern-ui | skyvern-ui | 8086 | **Shared** |
| skyvern-postgres | postgres:14 | 5435 | Skyvern |
| ocr-ensemble | ocr:latest | 8004 | **Shared** |
| portainer | portainer/portainer-ce | 8000 (mgmt), 9443 | System |
| cloudflared | cloudflared | — | System |

### Cloudflare Tunnel (already running)

- Tunnel ID: `64a6bce3-1045-41a9-8baa-6ad8bfd86ee0`
- Location: HEL1-DC4 (Helsinki)
- Status: healthy
- Current routes: ALL point to `hazelon.in` subdomains
- **Needs:** Add `api.indianform.com` route pointing to `localhost:4000`

### Cloudflare Account

- Account ID: `528ce312cefbd072120fc9a83d0a62de`
- Zones: `hazelon.in` (active), `indianform.com` (active)
- Workers: `power` (Hazelon), ~~`oneform-unified`~~ (accidental — DELETE THIS)
- Pages projects: NONE (need to create `oneform-unified-web`)
- R2 buckets: `power-documents` (Hazelon only)

---

## 4. Port Allocation (Conflict Avoidance)

### Hetzner Server Port Map

| Port | Service | Project | Status |
|------|---------|---------|--------|
| 80/443 | Cloudflare Tunnel ingress | Shared | RUNNING |
| 3001 | Power frontend | Power | RUNNING |
| 4000 | **OneForm API** | **OneForm** | **TO CREATE** |
| 5432 | Power PostgreSQL 16 | Power | RUNNING |
| **5433** | **OneForm PostgreSQL 17** | **OneForm** | **CREATED (empty)** |
| 6379 | Power Redis 7.4 | Power | RUNNING |
| **6380** | **OneForm Redis 8** | **OneForm** | **TO CREATE** |
| 7474/7687 | Neo4j | Power | RUNNING |
| 6333/6334 | Qdrant | Power | RUNNING |
| 8000 | Portainer + Power Backend | Power/System | RUNNING |
| 8004 | OCR Ensemble | **Shared** | RUNNING |
| 8085/8086 | Skyvern + UI | **Shared** | RUNNING |
| 8020 | Surya OCR (planned) | OneForm | NOT YET |
| 9443 | Portainer HTTPS | System | RUNNING |
| 11435 | Ollama | Power/**Shared** | RUNNING |

### Shared Services (use without duplication)

These services are **stateless** — safe to share between projects:

| Service | Port | Why Safe to Share |
|---------|------|-------------------|
| **Skyvern** | 8085 | Browser automation agent — per-request, no state leakage |
| **OCR Ensemble** | 8004 | Image → text, stateless |
| **Ollama** | 11435 | LLM inference, stateless (no persistent data per-project) |

### NOT Shared (separate instances)

| Service | Why Separate |
|---------|-------------|
| **PostgreSQL** | Different schemas, versions (Power=16, OneForm=17), data isolation |
| **Redis** | Different data, different flush cycles, operational isolation |

### Coolify — Do NOT Install

**Decision: NO Coolify.**

Reasons:
1. Portainer already runs on port 8000 — Coolify defaults to the same port
2. Coolify would install its own Traefik proxy, conflicting with the existing Cloudflare Tunnel
3. Power backend already uses port 8000
4. Adding another PaaS layer to an already-complex Docker setup adds fragility

**Instead:** Use plain Docker containers managed via Portainer, with `docker-compose.prod.yml` for OneForm services.

---

## 5. Phase 0 — Foundation (Do Before Everything)

### 0.1 Delete Accidental Cloudflare Worker

The user accidentally created a Worker named `oneform-unified` instead of a Pages project.

**Manual step:** Go to Cloudflare Dashboard → Workers & Pages → `oneform-unified` → Settings → Delete

### 0.2 Create Cloudflare Pages Project

**Manual step — two options:**

**Option A: Dashboard (Recommended)**
1. Go to: `https://dash.cloudflare.com/528ce312cefbd072120fc9a83d0a62de/pages`
2. Click "Create a project" → "Direct Upload" (NOT "Connect to Git")
3. Project name: `oneform-unified-web`
4. Upload any placeholder file to create the project
5. GitHub Actions will handle all subsequent deploys via `wrangler pages deploy`

**Option B: Wrangler CLI**
```bash
npx wrangler pages project create oneform-unified-web --production-branch main
```

### 0.3 Set GitHub Actions Secrets

**Manual step:** Go to https://github.com/DeepakOla/oneform-unified/settings/secrets/actions/new

| Secret Name | Where to Get It |
|-------------|----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → API Tokens → "Edit most resource" token |
| `CLOUDFLARE_ACCOUNT_ID` | `528ce312cefbd072120fc9a83d0a62de` |

### 0.4 Create R2 Bucket

**Manual step:**
```bash
npx wrangler r2 bucket create oneform-documents
```

### 0.5 Local Development Setup

**Prerequisites:** Docker Desktop, Node.js 20+, pnpm 9+

```bash
# 1. Start local services
cd "C:\Users\HP\Documents\Downloads\oneform unified-2026"
docker-compose up -d postgres redis

# 2. Install dependencies
pnpm install

# 3. Generate secrets
openssl rand -hex 32     # → JWT_ACCESS_SECRET
openssl rand -base64 32  # → ENCRYPTION_KEK

# 4. Create .env file
cp .env.example apps/api/.env
# Edit apps/api/.env — fill in:
#   DATABASE_URL="postgresql://oneform:oneform_dev_secret@localhost:5432/oneform_dev"
#   REDIS_URL="redis://localhost:6379"
#   JWT_ACCESS_SECRET="<paste hex from step 3>"
#   ENCRYPTION_KEK="<paste base64 from step 3>"
#   ENCRYPTION_KEK_VERSION="1"
#   NODE_ENV="development"
#   PORT="4000"
#   ALLOWED_ORIGINS="http://localhost:3000"

# 5. Run Prisma migration + seed
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed

# 6. Start dev servers
cd ../..
pnpm run dev
# API at: http://localhost:4000
# Web at: http://localhost:3000  (vite.config sets port 3000)
```

**Dev credentials after seed:**
- Admin: `admin@indianform.com` / `Admin@1234`
- Citizen: `citizen@example.com` / `Citizen@1234`

---

## 6. Phase 1 — Make It Work (MVP)

**Goal:** A real user can register, create a profile, and fill ONE government form via the Chrome extension.

### 1.1 Migrate Extension from @ts-nocheck to Typed

The 8 extension `.ts` files all use `@ts-nocheck`. They work but bypass all type safety.

**Approach:** Keep `@ts-nocheck` for now — these files are large (700-1200 lines each) and ported from v1. Refactoring them is Phase 3 work. The code works; it just isn't type-safe.

**What to remove:**
- `hardwareDetector.ts` — the user said hardware detection is unnecessary overhead. The extension should always use Tier 1 (heuristics) by default and let the user opt-in to AI tiers via settings.

### 1.2 Wire Extension to Real API (not Firebase)

The service worker currently talks to Firebase for:
- Job polling (get pending autofill jobs)
- Auth (Firebase UID-based)
- Wallet (balance check + token deduction)

**Change to:**
- Job polling → `POST /api/extension/getPendingJobs` (OneForm API)
- Auth → JWT from OneForm API (store in `chrome.storage.local`)
- Wallet → `GET /api/wallet` + `POST /api/wallet/deduct` (OneForm API)

### 1.3 Implement Extension Routes (Real)

Replace mocks in `apps/api/src/routes/extension.routes.ts`:

| Endpoint | What It Does |
|----------|-------------|
| `POST /api/extension/getPendingJobs` | Query SyncJob table for QUEUED jobs for this user |
| `POST /api/extension/getAutofillPayload` | Decrypt profile SectionA + return with FormTemplate field mappings |
| `POST /api/extension/claimJob` | Atomic job claim (optimistic locking to prevent double-claim) |
| `POST /api/extension/reportJobResult` | Update job status + deduct wallet on success |

### 1.4 Seed at Least One FormTemplate

Add to `prisma/seed.ts`:
- One real `FormTemplate` — e.g., Scholarships National Portal
- Use selectors from `portalMappings.ts` (already has 12+ portals mapped)
- This enables end-to-end testing of the fill flow

### 1.5 i18n Setup (Hindi + English)

```bash
pnpm add react-i18next i18next i18next-browser-languagedetector --filter @oneform/web
```

Create:
```
apps/web/src/i18n/
  index.ts
  locales/
    en/common.json, auth.json, dashboard.json, profile.json
    hi/common.json, auth.json, dashboard.json, profile.json
```

Add `<LanguageToggle />` (EN / हि) to Header.tsx.

**Key:** Proper nouns stay English: Aadhaar, PAN, GSTIN, DigiLocker, OneForm.

### 1.6 Test the Full Flow Locally

1. Register a new user at `http://localhost:3000/register`
2. Login
3. Create a profile (Section A with test Aadhaar/PAN)
4. Load the extension (`chrome://extensions` → Load unpacked → `apps/extension/dist`)
5. Navigate to a government portal (e.g., scholarships.gov.in)
6. Extension should detect form fields and offer to fill them
7. Click fill → extension pulls profile from API → fills form

---

## 7. Phase 2 — Make It Deployable (Hetzner + Cloudflare)

**Goal:** The app runs on production infrastructure.

### 2.1 OneForm Docker Containers on Hetzner

SSH into Hetzner (`ssh dkumar@135.181.112.160`) and create:

**OneForm PostgreSQL 17** (already exists on port 5433, but needs verification):
```bash
# Check existing container
docker ps -a | grep oneform-postgres

# If not running:
docker run -d \
  --name oneform-postgres \
  --restart unless-stopped \
  -p 5433:5432 \
  -e POSTGRES_DB=oneform_prod \
  -e POSTGRES_USER=oneform \
  -e POSTGRES_PASSWORD="<STRONG_PASSWORD>" \
  -v oneform_postgres_data:/var/lib/postgresql/data \
  postgres:17-alpine \
  -c max_connections=100 \
  -c shared_buffers=256MB
```

**OneForm Redis 8** (port 6380):
```bash
docker run -d \
  --name oneform-redis \
  --restart unless-stopped \
  -p 6380:6379 \
  -v oneform_redis_data:/data \
  redis:8.0-alpine \
  redis-server --requirepass "<REDIS_PASSWORD>" --appendonly yes
```

**OneForm API** (port 4000):
```bash
# Clone repo (already done at ~/oneform/oneform-unified)
cd ~/oneform/oneform-unified

# Create production .env
cat > apps/api/.env << 'EOF'
DATABASE_URL="postgresql://oneform:<STRONG_PG_PASSWORD>@localhost:5433/oneform_prod"
REDIS_URL="redis://:<REDIS_PASSWORD>@localhost:6380"
JWT_ACCESS_SECRET="<openssl rand -hex 32>"
ENCRYPTION_KEK="<openssl rand -base64 32>"
ENCRYPTION_KEK_VERSION="1"
NODE_ENV="production"
PORT="4000"
ALLOWED_ORIGINS="https://indianform.com,https://www.indianform.com"
RAZORPAY_KEY_ID="<production key>"
RAZORPAY_KEY_SECRET="<production secret>"
EOF

# Build API
pnpm install --frozen-lockfile
pnpm --filter @oneform/api run build

# Run migration + seed
cd apps/api
npx prisma migrate deploy
npx prisma db seed

# Start (use PM2 or Docker)
# Option A: PM2
npm i -g pm2
pm2 start dist/index.js --name oneform-api
pm2 save

# Option B: Docker
docker build -t oneform-api -f apps/api/Dockerfile .
docker run -d --name oneform-api --restart unless-stopped -p 4000:4000 --env-file apps/api/.env oneform-api
```

### 2.2 Add indianform.com Routes to Cloudflare Tunnel

The tunnel config is at `/home/dkumar/.cloudflared/config.yml` (or similar). Add:

```yaml
ingress:
  # Existing Hazelon routes...
  - hostname: api.indianform.com
    service: http://localhost:4000
  # Keep the catch-all at the bottom
  - service: http_status:404
```

Then restart cloudflared:
```bash
sudo systemctl restart cloudflared
# OR
docker restart cloudflared
```

### 2.3 Update DNS Records

In Cloudflare Dashboard → indianform.com → DNS:

| Action | Type | Name | Value | Proxy |
|--------|------|------|-------|-------|
| DELETE | A | @ | 15.197.148.33 | — |
| DELETE | A | @ | 3.33.130.190 | — |
| ADD | CNAME | @ | oneform-unified-web.pages.dev | Proxied |
| ADD | CNAME | www | oneform-unified-web.pages.dev | Proxied |
| ADD | CNAME | api | `<tunnel-id>.cfargotunnel.com` | Proxied |

The tunnel ID is `64a6bce3-1045-41a9-8baa-6ad8bfd86ee0`, so the CNAME target for `api` is:
`64a6bce3-1045-41a9-8baa-6ad8bfd86ee0.cfargotunnel.com`

### 2.4 CF Pages Custom Domain

After creating the Pages project and first deploy:
1. Pages → `oneform-unified-web` → Custom domains
2. Add `indianform.com`
3. Add `www.indianform.com`
4. Cloudflare auto-provisions SSL certificates

### 2.5 Deploy Flow (After Setup)

```
Push to main
  → CI workflow: type-check (Node 22)
  → Deploy workflow: build web → wrangler pages deploy → CF Pages
  → Hetzner: manual SSH pull + rebuild (or set up webhook later)
```

**Note:** There is currently NO automated deploy for the Hetzner API. Options for later:
- GitHub webhook → Hetzner pulls + rebuilds
- Watchtower (auto-restarts when Docker image updates)
- GitHub Actions SSH deploy step

---

## 8. Phase 3 — Make It Useful (Core Features)

### 3.1 Document Upload + OCR
- Create R2 bucket `oneform-documents`
- Implement `document.routes.ts`:
  - `POST /upload-url` — R2 presigned URL via `@aws-sdk/s3-request-presigner`
  - `GET /` — list documents
  - `POST /:id/ocr` — enqueue BullMQ OCR job
- OCR worker calls the **shared OCR ensemble** on Hetzner (port 8004) — DO NOT duplicate

### 3.2 Admin Dashboard
- Implement `admin.routes.ts`: users CRUD, tenants, audit logs, statistics
- Frontend admin pages in `/dashboard/admin/*`
- Only visible to `SUPER_ADMIN` role (sidebar already role-aware)

### 3.3 Consent System (Operator ↔ Citizen)
- OTP-based: Operator requests access → Citizen receives OTP → enters it → time-limited access granted (24h)
- All consent grants logged in AuditLog

### 3.4 Guest Login
- `GuestSession` type exists in shared-types
- Backend: generate temporary JWT, create temp profile, collect payment (₹29), fill form
- After payment: offer to convert to full account

### 3.5 Phone OTP Login
- MSG91 integration for Indian phone numbers
- `POST /api/auth/otp/send` + `POST /api/auth/otp/verify`

---

## 9. Phase 4 — Make It Smart (AI + Automation)

### 4.1 Scrapling Microservice (CRITICAL)

**What:** Python FastAPI service that scrapes Indian government portal HTML and returns form field CSS selectors. This is how `FormTemplate.fieldMappings` gets populated.

**Why Critical:** Without this, every new government portal must be manually mapped. With it, an admin enters a URL and gets auto-detected field selectors.

**Deploy on Hetzner:**
```bash
# Create the scrapling service (Python FastAPI)
mkdir -p ~/oneform/scrapling-service
cd ~/oneform/scrapling-service

# Dockerfile + requirements.txt + main.py
# Uses Scrapling with DynamicFetcher (Playwright-based) for JS-heavy portals
# Endpoint: POST /scrape?url=https://portal.gov.in/...
# Returns: { "fields": { "aadhaar": "#aadhaarNo", "name": "#applicantName", ... } }

docker run -d \
  --name oneform-scrapling \
  --restart unless-stopped \
  -p 8001:8001 \
  oneform-scrapling:latest
```

**API integration:**
- `POST /api/admin/form-templates/scrape` → calls `http://localhost:8001/scrape?url={url}`
- Stores result in `FormTemplate.fieldMappings`

### 4.2 Skyvern Integration

Skyvern is ALREADY RUNNING on Hetzner (port 8085). Use it for:
- AI-powered form filling for portals not in `portalMappings.ts`
- Auto-generating `FormTemplate.fieldMappings` from Skyvern's AI runs
- Wire `FormTemplate.skyvern_script` to Skyvern API calls

### 4.3 Ollama for AI Field Detection

Ollama is ALREADY RUNNING on Hetzner (port 11435). Use as Tier 3 fallback:
- Extension service worker calls API → API calls Ollama → returns field classifications
- Models: Qwen 2.5 for Hindi text understanding, DeepSeek for reasoning

---

## 10. Security Checklist

### DONE
- [x] No secrets committed to public repo (verified by security audit)
- [x] .gitignore covers .env files
- [x] .env.example has only placeholders
- [x] Passwords hashed with argon2id
- [x] Section A PII encrypted with AES-256-GCM at save time
- [x] JWT tokens signed with HS256, 15min expiry, refresh rotation
- [x] SQL injection fixed in deduplication.service.ts
- [x] TOCTOU race fixed in wallet.service.ts
- [x] Extension vault uses AES-256-GCM via Web Crypto API

### TODO
- [ ] Generate STRONG production secrets (never reuse dev secrets)
- [ ] Enable PostgreSQL SSL in production
- [ ] Set up Cloudflare WAF rules for api.indianform.com
- [ ] Rate limiting on auth endpoints needs Redis (wire up after Redis is running)
- [ ] Content Security Policy headers on API responses
- [ ] Audit all `@ts-nocheck` extension files for XSS vectors in DOM injection

### CRITICAL RULE
**NEVER commit API keys, tokens, or secrets to this repo.** It is PUBLIC.
All secrets go in:
- `apps/api/.env` (gitignored)
- GitHub Actions secrets (for CI/CD)
- Hetzner container env vars (for production)

---

## 11. Key Decisions & Rationale

### Node Version: >=20.0.0
- **Local machine:** v20.19.4
- **CF Pages build:** v22.16.0 (default)
- **CI/Deploy workflows:** v22
- **Hetzner server:** v24.13.1
- All dependencies (Express 5, Prisma 6, Vite 6) work on Node 20+
- **Decision:** `>=20.0.0` in package.json. No conflicts.

### Coolify: NO
- Portainer already runs on port 8000 on Hetzner
- Coolify would install Traefik, conflicting with existing Cloudflare Tunnel routing
- Power backend also uses port 8000
- **Decision:** Use plain Docker + Portainer. No Coolify.

### Cloudflare Pages (NOT Workers)
- Workers are for edge compute (serverless functions)
- Pages are for static sites (React SPA)
- The frontend is a React SPA built by Vite → static files → Pages
- **Decision:** CF Pages with `wrangler pages deploy` (via GitHub Actions)

### Deploy Action: wrangler-action@v3 (NOT pages-action@v1)
- `cloudflare/pages-action@v1` was **archived October 2024** and no longer maintained
- `cloudflare/wrangler-action@v3` is the official replacement
- Uses `command: pages deploy apps/web/dist --project-name=oneform-unified-web`

### pnpm/action-setup: v4 (NOT v3)
- v4 is current, v3 is deprecated

### Separate Databases (Not Shared)
- Power uses PostgreSQL 16, OneForm uses PostgreSQL 17
- Different schemas, different data models
- Operational isolation: one project's DB issues don't affect the other
- **Decision:** Separate containers on different ports (5432 vs 5433)

### Shared Stateless Services
- Skyvern, OCR, Ollama are stateless — safe to share
- No data leakage between projects (each request is independent)
- Saves RAM (no duplicate expensive AI model loads)

### Extension @ts-nocheck Files: Keep For Now
- 8 files, 700-1200 lines each, ported from v1
- They compile (the build works), but bypass type checking
- Refactoring would be weeks of work with risk of breaking field detection
- **Decision:** Keep `@ts-nocheck` for now. Prioritize making the flow work end-to-end. Type-safety refactor is Phase 5.

### Hardware Detection: REMOVE
- The user explicitly said hardware detection is unnecessary
- Extension should default to Tier 1 (heuristics, works on 2GB RAM)
- Users can opt-in to AI tiers via settings

### Web Port: localhost:3000
- `apps/web/vite.config.ts` explicitly sets port 3000
- CLAUDE.md says 5173 (Vite default) — this is outdated documentation
- **Actual port:** 3000

---

## 12. File Map

```
apps/api/
  prisma/
    schema.prisma          ← 10 models, all enums. NO migrations run yet.
    seed.ts                ← Seeds admin + citizen users + wallets
  src/
    app.ts                 ← Express app setup, route mounting
    index.ts               ← Server start (port 4000) + graceful shutdown
    routes/
      auth.routes.ts       ← LIVE — register/login/refresh/logout/me
      profile.routes.ts    ← LIVE — 6 endpoints
      wallet.routes.ts     ← LIVE — 4 endpoints
      extension.routes.ts  ← MOCKED — needs Phase 1 implementation
      document.routes.ts   ← ALL 501 — Phase 3
      admin.routes.ts      ← ALL 501 — Phase 3
    services/
      auth.service.ts      ← argon2id + jose JWT
      encryption.service.ts← AES-256-GCM envelope encryption
      profile.service.ts   ← Full ABCD + encryption + AuditLog
      wallet.service.ts    ← Atomic credit/deduct + Razorpay
      deduplication.service.ts ← Parameterized SQL (fixed)
      fieldTransformer.service.ts ← Profile → form field mapping
      syncQueue.service.ts ← BullMQ job queue
    middleware/
      auth.middleware.ts   ← JWT verify + injectTenantContext

apps/web/
  src/
    app/App.tsx            ← Nested routing with DashboardShell
    contexts/AuthContext.tsx← JWT auth state, isLoading-before-hydration
    lib/api/client.ts      ← Axios + interceptors (401 → redirect)
    components/
      dashboard/           ← Shell + Sidebar + Header
      modules/auth/        ← LoginPage + RegisterPage
      ui/                  ← 20+ shadcn/ui primitives
    i18n/                  ← MISSING — Phase 1 task

apps/extension/
  manifest.json            ← MV3, 12+ portal host permissions
  src/
    background/
      serviceWorker.ts     ← Job polling, AI detection, wallet (1196 lines, @ts-nocheck)
    content/
      contentScript.ts     ← 3-tier field detection + form filling (1062 lines, @ts-nocheck)
      fieldMappers.ts      ← 80+ field types, 11 languages (1161 lines, @ts-nocheck)
      portalMappings.ts    ← 12+ govt portal selectors (738 lines, @ts-nocheck)
      multiAiProvider.ts   ← 5-provider AI fallback chain (556 lines, @ts-nocheck)
      hardwareDetector.ts  ← TO REMOVE (user said unnecessary)
    vault/
      vault.ts             ← AES-256-GCM client-side encryption (597 lines, @ts-nocheck)
      secureKeyManager.ts  ← AI key storage (289 lines, @ts-nocheck)
    popup/
      PopupApp.tsx         ← Extension popup UI (81 lines, typed)

packages/
  shared-types/            ← TypeScript types (tenant, user, profile, etc.)
  validation/              ← Zod schemas (shared between API + web)

.github/workflows/
  ci.yml                   ← Type-check on push/PR (Node 22)
  deploy.yml               ← Build web → CF Pages deploy (Node 22, wrangler-action@v3)
```

---

## Quick Reference: Manual Steps Checklist

Run these in order:

```
[ ] 1. Delete accidental "oneform-unified" Worker from Cloudflare Dashboard
[ ] 2. Create "oneform-unified-web" CF Pages project (Direct Upload mode)
[ ] 3. Set GitHub Actions secrets (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID)
[ ] 4. Create R2 bucket: oneform-documents
[ ] 5. Start Docker Desktop locally
[ ] 6. Run: docker-compose up -d postgres redis
[ ] 7. Create apps/api/.env (copy from .env.example, fill in generated secrets)
[ ] 8. Run: cd apps/api && npx prisma migrate dev --name init && npx prisma db seed
[ ] 9. Run: pnpm run dev (test locally at http://localhost:3000)
[ ] 10. SSH into Hetzner: create oneform-redis on port 6380
[ ] 11. SSH into Hetzner: create apps/api/.env with production secrets
[ ] 12. SSH into Hetzner: build + start API (PM2 or Docker)
[ ] 13. SSH into Hetzner: run Prisma migration on production DB
[ ] 14. Add api.indianform.com route to Cloudflare Tunnel config
[ ] 15. Update DNS: remove old A records, add CNAME for Pages + API tunnel
[ ] 16. Push to main → verify CI green → verify CF Pages deploy succeeds
[ ] 17. Test: https://indianform.com loads the React app
[ ] 18. Test: https://api.indianform.com/api/health returns 200
```

---

*This document is the single source of truth for building and deploying OneForm.*
*Update it at the end of each work session.*
