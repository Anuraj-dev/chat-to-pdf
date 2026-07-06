# Decisions — chat-to-pdf
> Append-only log of load-bearing choices and WHY. Newest at the bottom.
> Format: `## YYYY-MM-DD — <decision>` then a short **Why:** line.

## 2026-07-06 — On-device rendering, no backend (v0)
**Decision:** The entire pipeline runs on the phone. No server, no auth, no account.
**Why:** Persona is phone-only, budget, low-connectivity, privacy-simple students. On-device = offline, $0 running cost, data never leaves device, instant. Fidelity is capped by Android's WebView but that's an acceptable trade for v0. *(Confirmed by Raja.)*

## 2026-07-06 — Render engine: HTML/CSS → expo-print
**Decision:** Produce PDFs by building an HTML+CSS document and handing it to `expo-print` (Android WebView + PrintManager). Not direct PDF drawing (pdf-lib).
**Why:** The browser does layout for us — math, code, tables render as HTML almost for free. Direct drawing would mean hand-coding a layout engine. The market gap (clean math/code/table PDFs) lives at this layer and expo-print is the tool built for it. *(Confirmed by Raja.)*

## 2026-07-06 — Capture: copy-paste backbone in v1, share-sheet later
**Decision:** v1 capture is manual copy-paste (student copies the AI answer, app reads clipboard / paste field). Android share-sheet target is a v2 bonus.
**Why:** Copy-paste is reliable and gives markdown text (structure we can render). "Share" from ChatGPT/Gemini often yields a link, not content. Accessibility-scraping is Play-Store-banned. *(Default — Raja away.)*

## 2026-07-06 — Markdown parse: markdown-it (+ katex plugin)
**Decision:** Parse the pasted markdown with `markdown-it` and its KaTeX plugin; do not write a parser.
**Why:** Robust, plugin ecosystem, works offline, produces the HTML we feed to expo-print. *(Default.)*

## 2026-07-06 — Math: KaTeX, bundled offline
**Decision:** Render math with KaTeX, bundled into the app (not loaded from a CDN).
**Why:** Fast, bundle-friendly, covers most AI-generated math. Bundling keeps the app offline-first. MathJax is more complete but slow/heavy for a budget phone. *(Default.)*

## 2026-07-06 — Storage: expo-sqlite + expo-file-system, no account
**Decision:** Persist history/documents locally with `expo-sqlite` (metadata) + `expo-file-system` (PDF files). No login, no cloud sync in v0.
**Why:** Privacy + simplicity for the persona; matches the on-device, no-backend decision. *(Default.)*

## 2026-07-06 — Stack: React Native + Expo (managed) + TypeScript
**Decision:** Expo managed workflow, TypeScript.
**Why:** `expo-print` is exactly our render path; all target modules run in Expo Go. TS for maintainability. *(Default.)*

## 2026-07-06 — Build/dev: EAS Build cloud, no Android Studio/SDK
**Decision:** Local machine installs only Node + `eas-cli`. Native compilation happens on EAS cloud. Day-to-day dev via Expo Go on a physical phone (LAN or `--tunnel`). Test APKs via EAS `preview` profile (internal distribution, sideload — no Play Console). Auth via one-time `eas login` / `EXPO_TOKEN` so the rest is scriptable from Claude Code.
**Why:** Raja has no Android Studio/SDK and doesn't want them. Research confirmed all four target modules run in Expo Go, so no dev build is needed until a non-Expo native module is added. *(Confirmed constraint from Raja; workflow from research.)*

## 2026-07-06 — First spike: prove expo-print fidelity before building UI
**Decision:** The very first build task is a throwaway spike that renders one hard sample (a KaTeX equation, a syntax-highlighted code block, a multi-row table) to PDF on a real phone and inspects page breaks.
**Why:** Android WebView's *print* engine has documented bugs (trailing blank pages, mid-page breaks, flex unreliable → use `display:block`, `position:absolute` disrupts breaks). Math/code/table fidelity is officially undocumented. If expo-print can't clear this bar, the whole render decision must be revisited — so we de-risk it first, cheaply. *(Default, driven by research risk findings.)*
