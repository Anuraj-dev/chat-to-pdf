# Conventions — chat-to-pdf
- Stack: React Native + Expo (managed workflow) + TypeScript. Android-first.
- Render path: markdown → `markdown-it`(+KaTeX) → HTML + print CSS → `expo-print` → PDF. On-device only.
- Run the app (dev): `npx expo start` → open in **Expo Go** on a physical Android phone (same LAN, or `npx expo start --tunnel`). No Android Studio / SDK needed.
- Build a shareable APK: `eas build -p android --profile preview --non-interactive` (internal distribution; sideload, no Play Console).
- Auth for CI/Claude Code: one-time `eas login`, or set `EXPO_TOKEN` env var.
- Run tests: `TODO` (add jest/expo test setup during scaffold).
- Print CSS rules of thumb: prefer `display: block` over flex; `@page` for A4 margins; `page-break-inside: avoid` on code/tables (unreliable — test on device); embed all fonts.
- Naming / structure: see `docs/specs/0001-architecture-foundation.md` §4 for the module map (`src/{capture,parse,render,output,storage}`).
