# chat-to-pdf — State
> Android-first Expo app: turns AI chat answers into clean, printable PDFs (on-device). · Last checkpoint: 2026-07-07

## 🚧 In progress / next
- **NEXT = issue #3: Scaffold Expo (TS) project + EAS + tooling.** Pin SDK 54. TDD setup (jest + jest-expo) is part of it. Then issues #4–#9 in order, one at a time.
- **Issue #2 spike DONE & CLOSED — verdict: GO on expo-print** (both phases passed; see decisions.md 2026-07-07). One fix-before-ship carried into issue #5: pass explicit `width:595, height:842` to `printToFileAsync` — Android ignores CSS `@page size:A4` (outputs Letter).
- Uncommitted: `spike/`, `design/`, all docs changes. PR-per-issue vs commit-per-issue still unanswered by Raja (default: commit-per-issue on main after codex review).
- **Orchestrator rule (Raja, explicit): protect the driver's context at all costs** — delegate everything heavy (code → Opus, device/browser testing + reading → Sonnet, reviews → codex), consume only reports; never read big files/transcripts inline.

## Status
- Spike complete: browser ✅ (2026-07-06) + device ✅ (2026-07-07, 714ms/279KB, math/code/tables PASS, Letter-size defect noted). Issues #3–#9 remain.
- **Design imported**: `design/CDF App Design.dc.html` (from claude.ai/design) + distilled `design/DESIGN-SPEC.md` — 5 flat screens (Onboarding, Home/Capture, Processing, Preview, History) + error states. No gaps vs PRD. Issue #9 implements this spec.
- Nothing committed yet this session (spike/ + design/ are untracked).

## Architecture map
- Pipeline: Capture → Parse → Render → Output/Store (all on-device). Target layout: `app/` + `src/{capture,parse,render,output,storage}` — spec 0001 §4.
- Spike (throwaway): `spike/sample.html` (self-contained torture test, 285KB), `spike/browser-output.pdf`, `spike/device/` (minimal Expo test app), `spike/embed-html.js`.
- Design: `design/DESIGN-SPEC.md` = implementation source of truth for UI (palette #F7F5F0/#1F2933/#1A5C9C/#0E7B47, Roboto 17px body, 56dp CTAs, radius 8/12/16).

## Stack & run
- Stack: React Native + Expo (managed) + TypeScript. Android-first.
- **Raja's phone: Motorola Edge 60 Fusion, Android 16, Expo Go 54.0.8 → SDK 54 ONLY.** Pin all scaffolds to SDK 54 until his Expo Go updates.
- Device access: **adb over USB works** (serial ZN42274J4F). `adb reverse tcp:8081/tcp:9099` pattern: phone reaches Metro + a local receive-server as localhost — no Wi-Fi/QR needed. Sonnet subagents run all device tests autonomously.
- Run: `npx expo start` in the app dir; launch on phone: `adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"`.

## Key decisions (top 6)
- On-device render, NO backend/auth (confirmed). HTML/CSS → expo-print, not direct PDF drawing.
- Shell: Expo + RN + expo-print (FINAL; Capacitor = fallback if device spike fails).
- Storage v0 = AsyncStorage; no router lib.
- Math/code pre-rendered to static HTML at parse time (no JS at print time — WebView JS timing unreliable); KaTeX fonts embedded as base64 woff2 subsets.
- Design invariant: PDF saved to History BEFORE Preview shows. Dark mode = out of scope v0 (design only sketches it).
- Workflow: Opus subagents code (TDD), Sonnet subagents test on device via adb, codex reviews each substantial issue diff before commit. Raja: no PR flow decided yet (asked, unanswered — default: commit-per-issue on main after codex review).

## Gotchas
- Android WebView print bugs (trailing blanks, mid-breaks, flex unreliable → `display:block`). Browser spike used only CSS 2.1 page-break hints — keep it that way.
- KaTeX font subset is content-specific: spike embeds only 12 families; real app must embed full set or detect per-document (see `spike/FINDINGS.md` gotcha #2).
- ~286KB HTML string per print → watch printToFileAsync latency on low-end phones (device spike measures it).
- Expo Go SDK mismatch bit us once (scaffold defaulted to SDK 57). Always check `adb shell dumpsys package host.exp.exponent | grep versionName` first.
- Expo Go app cache is not adb-readable — get files off the phone via HTTP POST to `adb reverse`d port.
- EAS free tier: 15 Android builds/mo — stay in Expo Go.
