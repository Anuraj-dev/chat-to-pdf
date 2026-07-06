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

## 2026-07-06 — Stack informed by Pravah/Khata; shell decision deferred
**Decision:** (a) Build the render layer as a **portable web page first**, developed/previewed in a desktop browser with `paged.js` — the HTML+print-CSS is shell-agnostic. (b) **Defer the native-shell fork** (Expo+expo-print vs React-PWA+Capacitor) until the browser spike shows the PDF quality. Current lean: Expo+expo-print for its one-call `printToFileAsync` PDF export, falling back to Capacitor+paged.js (Khata's proven pattern) if Android WebView print mangles output. (c) **Drop expo-router** — match Raja's convention: hand-rolled tab state + custom `BottomTabBar`. (d) PDF export template = Pravah's `diagnosticsExport.ts` (`expo-file-system/legacy` + `expo-sharing`, write-then-share).
**Why:** Scout of Pravah + Khata: Khata abandoned Expo for a Capacitor PWA (product-driven, not build failure); Pravah ships on Expo+dev-client but its `expo run:android` loop needs a local Android SDK (which Raja doesn't want) and required patching `expo-fetch` + pinning Java 17. This app is web-tech at its core, so a browser-first render loop is the fastest way to de-risk print fidelity while keeping both shells open. Neither project uses a router lib or SQLite. *(Verdict recorded; shell fork is Raja's to confirm.)*

## 2026-07-06 — Storage v0: AsyncStorage preferred over SQLite (reversible)
**Decision:** Use `@react-native-async-storage/async-storage` (Expo) / Capacitor Preferences for v0 history; SQLite is the documented upgrade path when history/query needs grow.
**Why:** Raja said "SQL is fine for v0," but his actual track record (Pravah + Khata) is AsyncStorage + Convex with zero SQLite usage. For a simple v0 document-history list, AsyncStorage is less ceremony and matches his muscle memory. *(Recommendation — awaiting Raja's confirm; he explicitly OK'd SQL, so either is acceptable.)*

## 2026-07-06 — First spike: prove render fidelity in a BROWSER before phone/shell
**Decision:** The very first build task is a throwaway spike: build the hard sample (a KaTeX equation, a syntax-highlighted code block, a multi-row table) as an HTML+print-CSS page with `paged.js`, perfect it in a **desktop browser** (print-to-PDF), THEN validate the same HTML on-device (expo-print and/or Capacitor system WebView) to see how much fidelity the mobile engine loses.
**Why:** Android WebView's *print* engine has documented bugs (trailing blank pages, mid-page breaks, flex unreliable → use `display:block`, `position:absolute` disrupts breaks) and math/code/table fidelity is officially undocumented. The browser loop gives instant feedback with zero phone/EAS overhead, the HTML/CSS is portable to whichever shell wins, and comparing browser-vs-device output is exactly the evidence needed to settle the shell fork. *(Default, driven by research + Pravah/Khata findings.)*
