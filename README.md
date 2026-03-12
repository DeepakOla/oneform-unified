# OneForm Unified Platform

> **B2B2G Middleware for India** — Connect any CRM to 500+ government forms with AI-powered autofill.

[![Node.js](https://img.shields.io/badge/Node.js-24_LTS-green)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-8.6-red)](https://redis.io)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.x-black)](https://turbo.build)

## Who OneForm Serves

| User | Dashboard | What they do |
|------|-----------|--------------|
| **General (FREE)** | CITIZEN | Students, farmers, individuals — fill forms for themselves + family |
| **Operator** | OPERATOR | CSC centers — help clients fill forms (₹29/form charged) |
| **Business** | BUSINESS | CA firms, HR, NGOs — manage bulk form submissions |
| **Admin** | ADMIN | Platform management |

## Quick Start (Local Development)

```bash
# Prerequisites: Node.js 24 LTS, pnpm, Docker

# 1. Clone and install
git clone https://github.com/DeepakOla/oneform-unified.git
cd oneform-unified
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Start databases (PostgreSQL 17 + Redis 8)
pnpm db:start

# 4. Run database migrations
pnpm db:migrate

# 5. Start all apps (API + Web)
pnpm dev
```

**API:** http://localhost:4000  
**Web:** http://localhost:3000  
**Health check:** http://localhost:4000/api/health

## Monorepo Structure

```
apps/
  web/        # React 19 + Vite 6 + shadcn/ui (Cloudflare Pages)
  api/        # Express 5 + Prisma 6 (Hetzner Xeon)
  extension/  # Chrome Extension MV3 (autofill on govt portals)
  telegram/   # [Phase 2] Telegram Mini App
  desktop/    # [Phase 3] Tauri desktop (Tally integration)
  mobile/     # [Phase 3] Capacitor mobile (optional)

packages/
  shared-types/  # TypeScript interfaces (ABCD profile system)
  validation/    # Zod schemas (Indian data formats)
  config/        # Shared constants, permissions, MasterDataProfile
```

## Security

Section A (PII: Aadhaar, PAN, DOB) is encrypted with **AES-256-GCM** (envelope encryption). No plaintext PII ever reaches the database. All access is audit-logged.

See [docs/unified-platform/](docs/unified-platform/) for full architecture.

## License

Proprietary — © 2026 OneForm Technologies Pvt. Ltd.
