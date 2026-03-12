# Mobile App — OneForm (Capacitor)

> **Status:** Phase 3 (Planned / Optional)
> This directory is a placeholder for the OneForm Mobile App.

## What goes here

A Capacitor-based mobile wrapper around `apps/web` for Android and iOS.

## Why Capacitor (not React Native)?

- Reuses 100% of existing `apps/web` React components
- No separate codebase to maintain
- Native plugins for camera, biometrics, notifications
- Works immediately if the web app is well-built

## Why "Optional"

The Telegram Mini App (Phase 2) may satisfy most mobile use cases.
Evaluate mobile app need after Telegram adoption is measured.

## Planned Features

- [ ] Android APK (Google Play)
- [ ] Native camera for document OCR
- [ ] Biometric auth (fingerprint/face)
- [ ] Push notifications for form deadlines
- [ ] Offline profile access

## When to build

Only after Phase 2 (Telegram) is live and user research shows mobile app is needed.
