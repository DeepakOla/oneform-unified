# OneForm Unified Platform — AI Context File
> Claude Code reads this file automatically at the start of every session.
> Last updated: 2026-03-14

---

## What This Project Is

AI-powered Indian government form autofill SaaS. Multi-tenant. Three core user types:
- **CITIZEN** — personal form filling
- **OPERATOR** (Arthiyas) — village-level agents serving farmers/illiterate users (core paying segment)
- **BUSINESS** — bulk submissions for employees

**Status as of 2026-03-14:** Stages 1–5 complete (~90%). Auth is real. Profile + Wallet services implemented. CI/Deploy workflows fixed. PostgreSQL 18 running on Hetzner (port 5433). **Prisma migrations run + seeded** (14 tables). GitHub Actions secrets set. R2 bucket created.

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
| `apps/web/src/app/App.tsx` | COMPLETE | Nested routing with DashboardShell |
| `apps/web/src/contexts/AuthContext.tsx` | COMPLETE | |
| `apps/web/src/lib/api/client.ts` | COMPLETE | |
| `apps/web/src/components/dashboard/` | COMPLETE | Shell + Sidebar + Header (shell only) |
| `apps/web/src/components/modules/auth/` | COMPLETE | LoginPage + RegisterPage |
| `apps/web/src/i18n/` | MISSING | react-i18next bilingual setup |

---

## What To Do Next (Ordered)

1. ~~**Prisma migration**~~ — DONE (2026-03-14). 14 tables created + seeded on Hetzner PostgreSQL.
   - Local dev: still need `docker-compose up -d` + `npx prisma migrate dev --name init` + `npx prisma db seed`
2. **i18n setup** — react-i18next, English + Hindi translations for all UI pages
3. **Loading skeletons** — DashboardSkeleton, ProfileListSkeleton (`skeleton.tsx` in shadcn already exists)
4. **Document routes** — `document.routes.ts`: R2 presigned upload (`@aws-sdk/client-s3`), OCR via BullMQ worker
5. ~~**GitHub secrets**~~ — DONE: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` set in GitHub Actions
6. **Guest login** — `GuestSession` type exists in shared-types; backend not yet implemented
7. **E2E tests** — Playwright, test register/login/dashboard flows
8. **Phone OTP** — MSG91 integration
9. **Admin routes** — all still 501; tenant management, user management
10. **Scrapling microservice** — Python FastAPI on Hetzner to scrape form field selectors → stored in `FormTemplate.fieldMappings`

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

When adding UI text, always use i18next keys, not hardcoded strings:
```tsx
// CORRECT (after i18n is set up)
const { t } = useTranslation('dashboard');
<h2>{t('welcome', { name: user.firstName })}</h2>

// ONLY acceptable until i18n is wired up:
<h2>Welcome back, {user.firstName}</h2>
```

Hindi namespace: `hi/dashboard.json`. English namespace: `en/dashboard.json`.

Proper nouns that stay in English regardless of language: Aadhaar, PAN, GSTIN, DigiLocker, OneForm.

---

## Skyvern Integration (Form Autofill Engine)

The `FormTemplate` DB model has a `skyvern_script` field. Skyvern (`github.com/Skyvern-AI/skyvern`) is the planned AI browser agent for actually filling government portal forms. This is Phase 3 work. For now, `FormTemplate` row data describes the mapping; the actual Skyvern agent call happens from the Chrome extension's background service worker.

---

## Infrastructure (2026-03-14)

**Hetzner server (135.181.112.160)** runs both Hazelon Power and OneForm. **NO Coolify** — uses plain Docker + Portainer.

| Component | Where | Port | Notes |
|---|---|---|---|
| API (Express) | Hetzner | 4000 | Not yet deployed — needs container setup |
| PostgreSQL 18 | Hetzner | 5433 | Container `oneform-postgres` running, DB `oneform`, **14 tables migrated + seeded** |
| Redis 8 | Hetzner | 6380 | NOT yet created |
| Frontend (React) | Cloudflare Pages | — | `oneform-unified-web` project, auto-deploys from GitHub |
| R2 file storage | Cloudflare R2 | — | Bucket `oneform-documents` created |
| Scrapling microservice | Hetzner | 8001 | NOT yet built (Phase 4) |
| Skyvern browser agent | Hetzner | 8085 | **SHARED** with Power project, already running |
| OCR Ensemble | Hetzner | 8004 | **SHARED** with Power project, already running |
| Ollama | Hetzner | 11435 | **SHARED** with Power project, already running |

**Cloudflare tunnel** runs via token (no local config.yml). Routes configured in CF Dashboard → Zero Trust → Tunnels.

**Domain:** indianform.com (DNS on Cloudflare). DNS needs update: remove old A records, add CNAME for Pages + API tunnel.

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
