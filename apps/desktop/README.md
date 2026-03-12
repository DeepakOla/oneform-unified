# Desktop App — OneForm (Tauri)

> **Status:** Phase 3 (Planned)
> This directory is a placeholder for the OneForm Desktop App.

## What goes here

A Tauri-based desktop application for power users — primarily:
- **Tally ERP Integration** (pull data from Tally → OneForm profiles)
- **Offline OCR** (process documents without internet)
- **Bulk form processing** (for CSC operators with 50+ clients/day)

## Why Tauri (not Electron)?

- Tauri: ~10MB bundle vs Electron's ~150MB
- Uses system WebView (no bundled Chromium)
- Rust backend: safer + faster file system access
- Better for offline OCR workflows

## Planned Features (Phase 3)

- [ ] Tally ERP data import (pull GST, ITR data)
- [ ] Local Surya OCR (no internet needed)
- [ ] Bulk profile creation from Excel/CSV
- [ ] Offline mode with sync on reconnect
- [ ] Chrome Extension companion (auto-trigger from desktop)

## Tech Stack

- Tauri v2 (Rust + WebView)
- React 19 frontend (same as `apps/web`)
- Shared components + types from workspace

## When to build

Start Phase 3 after Chrome extension (`apps/extension`) is complete and deployed.
