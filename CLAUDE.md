# OneForm Unified Platform — AI Context File
> Claude Code reads this file automatically at the start of every session.
> Last updated: 2026-03-14

---

## What This Project Is

AI-powered Indian government form autofill SaaS. Multi-tenant. Three core user types:
- **CITIZEN** — personal form filling
- **OPERATOR** (Arthiyas) — village-level agents serving farmers/illiterate users (core paying segment)
- **BUSINESS** — bulk submissions for employees

**Status as of 2026-03-15 (v0.0.2):** All 4 MVP blockers resolved. Landing page at `/` with hero, features, user roles, i18n. Profile wizard complete. Razorpay checkout wired. Error boundary added. Auth pages i18n done. View Profile + Edit Profile pages built. Primary brand color fixed to OneForm blue. Design tokens centralized at `apps/web/src/styles/tokens.ts`. CF Pages deploys via GitHub Actions only (disable native git integration in CF dashboard).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >=22 + pnpm 10.32.1 + Turborepo |
| API | Express 5 + TypeScript strict mode |
| ORM | Prisma 6 + PostgreSQL 17 |
| Queue | BullMQ + ioredis (Redis 8) |
| Frontend | React 19 + Vite 6 + shadcn/ui + TanStack Query v5 + React Router v7 |
| Extension | Chrome MV3 + @crxjs/vite-plugin |
| Auth | argon2id + jose (HS256) + refresh token rotation |
| Encryption | AES-256-GCM envelope encryption for Section A PII |
| Deploy | Cloudflare Pages (frontend) + Hetzner server (API + PostgreSQL + Redis + Scrapling) |

---

## Monorepo Structure

```
apps/api/          ← Express 5 REST API (port 4000)
apps/web/          ← React 19 dashboard (port 3000 in dev)
apps/extension/    ← Chrome MV3 extension
apps/telegram/     ← Telegram Mini App (stub only)
apps/desktop/      ← Electron (stub only)
apps/mobile/       ← React Native (stub only)
packages/shared-types/  ← TypeScript types shared between apps
packages/validation/    ← Zod schemas shared between apps
```

---

## Critical Conventions

### TypeScript
- `exactOptionalPropertyTypes: true` — passing optional fields requires **spread-conditional pattern**:
  ```typescript
  // CORRECT
  ...(value !== undefined && { key: value })
  // WRONG — TS error
  key: value  // where value could be undefined
  ```
- `noUnusedLocals: true` — unused vars → rename to `_varName`
- `noUnusedParameters: true` — unused params → rename to `_paramName`
- React 19 auto-JSX transform — NEVER `import React from 'react'` in .tsx files
- Use named import for ioredis: `import { Redis } from 'ioredis'`
- Import assertions: `with { type: 'json' }` NOT `assert { type: 'json' }`
- **Prisma Bytes (Buffer) type mismatch** — `Buffer.from(...)` has `.buffer: ArrayBufferLike` but Prisma expects `ArrayBuffer`. Fix: cast the entire spread `as any`:
  ```typescript
  // CORRECT — cast the spread object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(encryptedFields !== undefined && (encryptedFields as any))
  ```
- **Prisma JSON field type mismatch** — typed interfaces like `SectionB` lack index signatures, making them incompatible with Prisma's `InputJsonValue`. Fix: cast at point of use:
  ```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(sectionB !== undefined && { sectionB: sectionB as any })
  ```
- **Express 5 params** — `req.params[name]` is typed as `string | string[]`. Use the `getParam()` helper in route files:
  ```typescript
  function getParam(req: Request, name: string): string {
    const val = req.params[name];
    return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
  }
  ```

### Database / API
- All monetary values in **integer paisa** (divide by 100 for rupees display)
- Section A PII: **ALWAYS** encrypted via `encryption.service.ts` at save time
- Decryption: server-side only, always writes `AuditLog` entry
- JWT: 15min access token (HS256) + refresh token stored as SHA-256 hash in Session table
- logout = delete ALL sessions (not just current)

### Frontend
- `api/client.ts` — axios singleton with request interceptor (attaches Bearer token) and response interceptor (401 → hard redirect to /login)
- `AuthContext.tsx` — handles isLoading-before-hydration pattern; always check `isLoading` first
- Dashboard routing: `/dashboard` is the layout, child routes fill `<Outlet />`

---

## File Status Quick Reference

| File | Status | Notes |
|---|---|---|
| `apps/api/prisma/schema.prisma` | COMPLETE | 10 models, all enums. **Migrations run on Hetzner (2026-03-14).** |
| `apps/api/prisma/seed.ts` | COMPLETE | Seeds admin + citizen demo users |
| `apps/api/src/services/auth.service.ts` | COMPLETE | Real argon2id + jose JWT |
| `apps/api/src/services/encryption.service.ts` | COMPLETE | AES-256-GCM envelope encryption |
| `apps/api/src/services/profile.service.ts` | COMPLETE | Full ABCD + encryption + AuditLog |
| `apps/api/src/services/wallet.service.ts` | COMPLETE | getWallet, credit/deduct, Razorpay topup+verify |
| `apps/api/src/routes/auth.routes.ts` | COMPLETE | register/login/refresh/logout/me |
| `apps/api/src/routes/profile.routes.ts` | COMPLETE | All 6 endpoints live (no 501 stubs) |
| `apps/api/src/routes/wallet.routes.ts` | COMPLETE | All 4 endpoints live (no 501 stubs) |
| `apps/api/src/routes/document.routes.ts` | ALL 501 STUBS | Future phase — R2 upload + OCR |
| `apps/api/src/middleware/auth.middleware.ts` | COMPLETE | JWT verify + injectTenantContext |
| `apps/web/src/app/App.tsx` | COMPLETE | Nested routing with DashboardShell + lazy-loaded pages |
| `apps/web/src/contexts/AuthContext.tsx` | COMPLETE | localStorage-backed JWT auth (no refresh logic — refresh is in api client) |
| `apps/web/src/lib/api/client.ts` | COMPLETE | Axios + silent token refresh (401 → refresh → retry) |
| `apps/web/src/hooks/use-api.ts` | COMPLETE | TanStack Query hooks: useWallet, useTransactions, useProfiles, useProfile, formatPaisa |
| `apps/web/src/i18n/` | COMPLETE | react-i18next config + EN/HI translations (nav, dashboard, wallet, profiles, auth, common) |
| `apps/web/src/components/dashboard/` | COMPLETE | Shell + Sidebar (i18n, role-aware) + Header (wallet balance, lang switcher) |
| `apps/web/src/components/modules/auth/` | COMPLETE | LoginPage + RegisterPage (hardcoded EN — i18n TODO) |
| `apps/web/src/components/modules/overview/` | COMPLETE | Dashboard overview with 4 metric cards + quick actions + wallet summary |
| `apps/web/src/components/modules/wallet/` | COMPLETE | Wallet balance, transaction table, TopUpDialog (Razorpay order — payment modal TODO) |
| `apps/web/src/components/modules/profiles/` | PARTIAL | Profile list with search + completion bars (profile CREATION form is MISSING) |
| `apps/web/src/components/modules/i18n/` | COMPLETE | LanguageSwitcher component (EN/HI dropdown) |

---

## What To Do Next (Ordered by Priority)

### Phase 1 — MVP Completion (profile creation → form submission)
1. **Profile creation form** — Multi-step wizard (Section A/B/C/D) with Zod validation. Section A encrypts client-side placeholder → server encrypts with AES-256-GCM. This is the #1 blocker for MVP.
2. **Razorpay checkout integration** — Load `checkout.razorpay.com/v1/checkout.js`, open payment modal after `useInitiateTopup()`, call `useVerifyTopup()` on success. Currently creates order but never opens modal.
3. **Error Boundary** — Add React Error Boundary wrapping `<App />` in main.tsx. Currently any runtime error = white screen.
4. **Auth pages i18n** — LoginPage + RegisterPage still hardcoded English.

### Phase 2 — Document Upload + Admin
5. **Document routes** — `document.routes.ts`: R2 presigned upload (`@aws-sdk/client-s3`), OCR via BullMQ worker calling Hetzner OCR Ensemble (port 8004)
6. **Admin routes** — all 4 still 501 stubs; tenant management, user management, audit logs, stats
7. **Guest login** — `GuestSession` type exists in shared-types; backend not yet implemented

### Phase 3 — Form Filling Engine
8. **Scrapling microservice** — Python FastAPI on Hetzner (port 8001). Already have Scrapling v0.4.2 on server. Build endpoint: `POST /scrape?url={url}` → returns field selectors
9. **Extension endpoints** — Wire `getPendingJobs`, `claimJob`, `reportJobResult` to real service logic
10. **Form template management** — Admin UI to create/edit FormTemplates with scraped field mappings

### Phase 4 — Production Hardening
11. **E2E tests** — Playwright, test register/login/dashboard/profile/wallet flows
12. **Phone OTP** — MSG91 integration
13. **PM2 save on Hetzner** — `pm2 save` to persist process list across reboots
14. **Rate limiting** — Express rate limiter on auth endpoints

---

## Environment Variables Required

### apps/api/.env
```
DATABASE_URL="postgresql://oneform:oneform@localhost:5432/oneform_dev"
REDIS_URL="redis://localhost:6379"
JWT_ACCESS_SECRET="<256-bit secret — openssl rand -hex 32>"
ENCRYPTION_KEK="<openssl rand -base64 32>"
ENCRYPTION_KEK_VERSION="1"
NODE_ENV="development"
PORT="4000"
ALLOWED_ORIGINS="http://localhost:3000"
RAZORPAY_KEY_ID="<rzp_test_...>"
RAZORPAY_KEY_SECRET="<your razorpay key secret>"
```

### apps/web/.env (Vite)
```
VITE_API_URL="http://localhost:4000"
```

---

## Anti-Patterns to Never Repeat (Lessons from v1)

1. `localStorage.clear()` anywhere except logout handler
2. Encrypting PII at display/read time instead of save time
3. Floating point arithmetic for money — use integer paisa only
4. Separate role-specific route prefixes (`/general/`, `/operator/`) — use unified `/dashboard` + role-aware sidebar
5. Mock auth tokens with `setTimeout` — use real JWT
6. `import React from 'react'` in .tsx files (React 19 JSX transform handles it)
7. `new Redis.default()` — use named import `import { Redis } from 'ioredis'`

---

## Dev Seed Credentials

After running `prisma db seed`:
- **Admin:** `admin@indianform.com` / `Admin@1234`
- **Citizen:** `citizen@example.com` / `Citizen@1234`

---

## Bilingual Implementation Note

i18n is now fully set up. All new UI text **MUST** use i18next keys:
```tsx
const { t } = useTranslation();
<h2>{t('dashboard.welcome', { name: user.firstName })}</h2>
```

Translation files: `apps/web/src/i18n/locales/en.json` + `hi.json` (flat structure, not namespaced).
Language switcher: `LanguageSwitcher.tsx` in Header (EN/HI dropdown, persisted to localStorage).

Proper nouns that stay in English regardless of language: Aadhaar, PAN, GSTIN, DigiLocker, OneForm.

---

## Skyvern Integration (Form Autofill Engine)

The `FormTemplate` DB model has a `skyvern_script` field. Skyvern (`github.com/Skyvern-AI/skyvern`) is the planned AI browser agent for actually filling government portal forms. This is Phase 3 work. For now, `FormTemplate` row data describes the mapping; the actual Skyvern agent call happens from the Chrome extension's background service worker.

---

## Infrastructure (2026-03-15)

**Hetzner server (135.181.112.160)** runs both Hazelon Power and OneForm. **NO Coolify** — uses plain Docker + Portainer.

| Component | Where | Port | Status |
|---|---|---|---|
| API (Express) | Hetzner | 4000 | **RUNNING** via PM2 (`oneform-api`). Accessible at `https://api.indianform.com` |
| PostgreSQL 17 | Hetzner | 5433 | **RUNNING** on 127.0.0.1. Container `oneform-postgres`. 14 tables migrated + seeded. |
| Redis 8 | Hetzner | 6380 | **RUNNING** on 127.0.0.1. Container `oneform-redis`. |
| Frontend (React) | Cloudflare Pages | — | **DEPLOYED** at `indianform.com`. Deploy via GitHub Actions `deploy.yml` only. **Disable native git integration** in CF Pages dashboard (Settings → Builds & deployments) to stop duplicate deploys. |
| R2 file storage | Cloudflare R2 | — | Bucket `oneform-documents` created. Not yet wired to API. |
| Scrapling | Hetzner | 8001 | NOT yet built (Phase 3). Scrapling v0.4.2 available on server. |
| Skyvern browser agent | Hetzner | 8085 | **SHARED** with Power project, already running |
| OCR Ensemble | Hetzner | 8004 | **SHARED** with Power project, already running |
| Ollama | Hetzner | 11435 | **SHARED** with Power project, already running |

**Cloudflare tunnel** runs via token (no local config.yml). Routes: `api.indianform.com → localhost:4000`

**Domain:** indianform.com (DNS on Cloudflare).

---

## Scrapling Microservice (Form Field Scraper)

[github.com/D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling) — Python adaptive web scraper.

**Purpose:** POST a government portal URL → get back CSS/XPath selectors for every form field → stored in `FormTemplate.fieldMappings`.

**Integration flow:**
1. Admin opens FormTemplate creation in dashboard
2. Admin enters portal URL
3. Dashboard calls `POST /api/admin/form-templates/scrape` with `{ url }`
4. API calls Scrapling microservice: `POST http://scrapling:8001/scrape?url={url}`
5. Scrapling returns `{ fields: { "aadhaar": "#aadhaarNo", "name": "#applicantName", ... } }`
6. Stored as `FormTemplate.fieldMappings` in DB

**Scrapling microservice endpoint (to build, Python FastAPI on Hetzner):**
```python
# POST /scrape?url=https://scholarships.gov.in/...
# Returns: { "fields": { "profile_field_path": "css_selector", ... } }
```

Use `DynamicFetcher` (Playwright-based) for JS-heavy government portals.

---

## Full Form-Filling Flow

1. **Profile created** — CITIZEN/OPERATOR fills SectionA (PII, encrypted) + B/C/D
2. **Operator selects template** — picks a `FormTemplate` (e.g. PM scholarship form)
3. **Extension picks up job** — Chrome extension calls `GET /api/extension/getPendingJobs`
4. **Data fetched** — API decrypts SectionA (writes AuditLog) + returns full profile
5. **Field transformation** — `fieldTransformer.service.ts` maps profile fields to `government_portal` format
6. **Form filling** — Extension uses `FormTemplate.fieldMappings` to inject values into DOM
7. **Wallet deducted** — `deductWallet()` called on successful submission (₹2-29 per form)
8. **Operator earns** — `OPERATOR_EARN` transaction credits operator wallet

---

## Running the Project

```bash
docker-compose up -d           # PostgreSQL 17 + Redis 8
pnpm install                   # install all workspaces
pnpm run dev                   # all apps in parallel
# Or individual:
pnpm run dev --filter @oneform/api
pnpm run dev --filter @oneform/web
```

```bash
pnpm run type-check            # must pass with zero errors before any commit
pnpm run build                 # full production build
```
