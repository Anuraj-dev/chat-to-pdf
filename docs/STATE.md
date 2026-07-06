# chat-to-pdf — State
> Android-first Expo app: turns AI chat answers into clean, printable PDFs (on-device). · Last checkpoint: 2026-07-06

## 🚧 In progress / next
- Foundation locked (spec 0001 + decisions). PRD + issues filed on GitHub. No app code yet.
- GitHub: https://github.com/Anuraj-dev/chat-to-pdf (private) · Issues #1 (PRD) + #2–#9 (build steps), milestone "v0".
- **Next / first build task = issue #2? No → issue "Spike" first:** prove expo-print fidelity for math/code/tables on a real phone. Go/no-go before scaffold.
- Order: Spike → Scaffold → Parse → Render → Capture → Output → Storage → UI.

## Status
- Architecture forks resolved, PRD written, 9 GitHub issues created (ready-for-agent). Ready to implement one by one.

## Architecture map
- Pipeline: Capture → Parse → Render → Output/Store (all on-device).
- Target layout: `app/` (screens) + `src/{capture,parse,render,output,storage}` — see spec 0001 §4.
- Render (the hard 80%): `src/render/` — HTML template + print CSS + expo-print wrapper.

## Stack & run
- Stack: React Native + Expo (managed) + TypeScript. Android-first.
- Run: `npx expo start` → Expo Go on physical phone (LAN or `--tunnel`). No Android Studio/SDK.
- Build test APK: `eas build -p android --profile preview --non-interactive`.
- Test: TODO (set up during scaffold).

## Key decisions (top 5)
- On-device render, NO backend/auth/account (confirmed).
- HTML/CSS → expo-print, not direct PDF drawing (confirmed).
- Copy-paste capture in v1; share-sheet is v2.
- markdown-it + KaTeX (bundled offline); expo-sqlite + expo-file-system storage.
- EAS cloud build; local box only needs Node + eas-cli.
- Full rationale: `docs/decisions.md`.

## Gotchas
- Android WebView **print** engine is buggy: trailing blank pages, mid-page breaks, flex unreliable → use `display:block`. Fidelity for math/code/tables is undocumented → prove it in the spike, retest per WebView update.
- Fonts must be embedded or print substitutes garbage glyphs.
- EAS free tier: 15 Android builds/mo, slow queue at peak → stay in Expo Go, minimize native rebuilds.
