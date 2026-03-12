# Telegram Mini App — OneForm

> **Status:** Phase 2 (Planned)
> This directory is a placeholder for the OneForm Telegram Mini App.

## What goes here

OneForm's first-class Telegram client — built as a Telegram Mini App (TMA).

## Why Telegram First?

- 500M Indian users on Telegram
- No app store downloads needed
- Bot + Mini App = full UI in chat
- Works on 2G connections

## Architecture

```
Telegram Bot (@OneFormInBot)
    ↓
Telegram Mini App (this app)
    ↓ uses
@oneform/shared-types + @oneform/validation
    ↓ API calls
apps/api (Express)
    ↓
PostgreSQL 17 + Redis 8 (Hetzner)
```

## Planned Tech Stack

- React 19 + Vite 6 (same as `apps/web`)
- Telegram Mini App SDK (`@twa-dev/sdk`)
- Telegram Bot API (`telegraf`)
- Shared components from `apps/web/src/components/ui/`

## Key Features (Phase 2)

- [ ] Profile creation via Telegram
- [ ] Document upload via bot
- [ ] Form autofill trigger via chat command
- [ ] OTP-less auth (Telegram is the auth!)
- [ ] WhatsApp integration via Baileys (alternative channel)
- [ ] Voice-to-profile (Hindi + regional languages)

## When to build

Start Phase 2 after `apps/api` auth + profile endpoints are complete (Stage 3).
