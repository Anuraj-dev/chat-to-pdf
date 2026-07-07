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

## 2026-07-06 — FINAL shell verdict: Expo + React Native + expo-print (supersedes the deferral)
**Decision:** Commit the native shell to **Expo + React Native**, generating PDFs with **`expo-print`** (`printToFileAsync({html})`). Capacitor is documented fallback ONLY if the render spike proves expo-print's print-CSS ceiling too low for math/tables. Storage for v0 = **AsyncStorage** (locked). Render still developed browser-first; spike tests **plain `@page`/print-CSS first**, paged.js only if needed.
**Why:** The app's two differentiators (one-tap simplicity + clean math/code/table PDF) collide at PDF generation. `expo-print` is the only option that delivers a **silent, one-tap, real *vector* PDF** (crisp/selectable). Capacitor's paged.js layout edge is undercut by its weak silent-PDF story on Android: the vector path needs a print *dialog* (breaks one-tap) and the silent path (`html2canvas`) is *raster* (blurry math — kills the differentiator). Expo also has the biggest ecosystem / most Claude training data / Raja's Pravah familiarity, and the "no Android Studio/SDK" concern is now confirmed dead by both the research and the BMMcmmnjrM8 course video. *(Final verdict by Claude at Raja's request; reversible via the spike.)*

## 2026-07-06 — Adopt Claude-Code mobile workflow habits (from BMMcmmnjrM8)
**Decision:** Adopt these working habits: (a) iterate the UI/render in a **browser tab** (`npx expo start` → web) for speed, verify on a real phone for the things Chrome can't show (fonts/glyphs, layout, thumb-reach); (b) run **`/init`** right after scaffold to generate a good CLAUDE.md, and **`/clear`** between phases to keep context cheap; (c) drive the app-design from a **core-function → core-loop → accessory-features → surface-area(≤5–7 screens) → retention-hook** framing; (d) run a **security-audit pass** before shipping (hard-coded secrets, input validation, storage); (e) feed reference screenshots for design.
**Why:** These come from a creator running a $300k/mo business almost entirely on Claude Code; they're cheap, proven process wins that fit our orchestration model. *(Reference — process, not architecture.)*

## 2026-07-06 — First spike: prove render fidelity in a BROWSER before phone/shell
**Decision:** The very first build task is a throwaway spike: build the hard sample (a KaTeX equation, a syntax-highlighted code block, a multi-row table) as an HTML+print-CSS page with `paged.js`, perfect it in a **desktop browser** (print-to-PDF), THEN validate the same HTML on-device (expo-print and/or Capacitor system WebView) to see how much fidelity the mobile engine loses.
**Why:** Android WebView's *print* engine has documented bugs (trailing blank pages, mid-page breaks, flex unreliable → use `display:block`, `position:absolute` disrupts breaks) and math/code/table fidelity is officially undocumented. The browser loop gives instant feedback with zero phone/EAS overhead, the HTML/CSS is portable to whichever shell wins, and comparing browser-vs-device output is exactly the evidence needed to settle the shell fork. *(Default, driven by research + Pravah/Khata findings.)*

## 2026-07-07 — Device testing runs autonomously via adb (Sonnet agents), not human-in-the-loop Expo Go QR flow
**Why:** Raja hit the Expo Go SDK-mismatch error and explicitly wants zero manual testing. adb over USB gives agents logcat, screencap, UI driving, and `adb reverse` networking (no Wi-Fi/QR). Rejected: manual QR + human eyeballing (slow, error-prone), EAS cloud simulator (real-hardware WebView fidelity is the whole point).

## 2026-07-07 — Pin Expo SDK 54 (phone's Expo Go 54.0.8), not latest
**Why:** Expo Go runs exactly one SDK; scaffolding "latest" (57) produced an unloadable project. Check `adb shell dumpsys package host.exp.exponent | grep versionName` before any scaffold. Revisit when his Expo Go updates.

## 2026-07-07 — Get generated files off the phone via HTTP POST to an adb-reversed port
**Why:** Expo Go's app-private cache is not adb-readable on unrooted phones, and share-sheet automation is brittle. The test app POSTs base64 to `http://localhost:9099` (reversed to the dev box). Rejected: MediaLibrary/SAF (permission dialogs), rooting (absurd).

## 2026-07-07 — SPIKE VERDICT: GO on expo-print (issue #2)
**Why:** On-device (Moto Edge 60 Fusion, Expo Go SDK 54) the torture HTML matched the clean browser PDF: math PASS (base64 @font-face honored), code PASS (same clean page split), tables PASS, no trailing blank, 714ms for 279KB HTML. Shell stays Expo + expo-print; Capacitor fallback retired.
**One fix-before-ship:** Android's print bridge ignores CSS `@page size: A4` — device PDF came out US Letter (612×792pt). Fix: pass explicit `width: 595, height: 842` to `Print.printToFileAsync`; keep `@page` margins in CSS. Full comparison: `spike/DEVICE-FINDINGS.md`.

## 2026-07-07 — No expo-dev-client; dev stays in Expo Go
**Why:** Installing expo-dev-client flips `npx expo start` into dev-client mode, breaking the Expo Go USB/LAN workflow the whole overnight test loop depends on. The eas.json `development` profile builds a plain internal APK instead. Alternative (install it for proper dev builds) rejected for v0 — Expo Go covers all dev needs and EAS build budget is tight.

## 2026-07-07 — Print quality + capture UX are research-backed issues, not folklore
**Why:** Sonnet research distilled into issue #10 (exact print stylesheet spec + verified Android WebView print constraints — no page counters possible) and #11 (per-AI "get full answer" prompts with four-tilde outer fence + parser hardening). These are the spec for #5's CSS and #4's parser edge cases; alternative (improvise during implementation) rejected — quality bar is 9.5/10.

## 2026-07-07 — Preview renders a persisted HTML snapshot, not the PDF bytes
**Why:** Expo Go has no PDF viewer (react-native-pdf needs a dev-client — locked NO). Regenerating HTML at view time (rejected) would drift from the saved PDF when render logic changes; so saveDocument persists the exact HTML fed to expo-print (htmlUri file next to the PDF) and Preview shows that, with regeneration only as legacy fallback.

## 2026-07-07 — Code blocks: syntax-highlighted cards, highlight at parse time, JetBrains Mono embedded
**Why:** Raja judged the plain boxy code blocks ugly vs ChatGPT/Claude. Chose a carded design (header bar + language label) with highlight.js run at PARSE time (baked to static HTML — expo-print's Android WebView runs no JS at print, same constraint as KaTeX) over Shiki (needs WASM; Hermes has none). Font = JetBrains Mono embedded as base64 woff2 (code-legibility: dotted zero, distinct 1/l/I) via an author-time generator mirroring embed-katex-css.js. Theme is grayscale-safe (weight/italic carry meaning, not hue) because many users print mono. Rejected: runtime highlighting, hue-based themes, red/yellow/green window dots (false status signal in grayscale).

## 2026-07-07 — Save: user-named PDF, default to public Documents via one-time SAF grant
**Why:** Non-technical end-user (Raja's sister) couldn't find or title PDFs. Save now prompts for a name (default = doc title) and targets the public Documents folder. On modern Android a managed Expo app CANNOT silently write Documents — chose the SAF folder picker pre-seeded to Documents (getUriForDirectoryInRoot) with the grant persisted, so the picker appears once then every save is silent. Rejected: MediaLibrary (media collections only, not Documents), direct WRITE_EXTERNAL_STORAGE (blocked by scoped storage on Android 11+), app-private external dir (buried, non-technical users won't find it).

## 2026-07-07 — Hold the push until GitHub commit attribution is fixed
**Why:** Commits are authored correctly (Anuraj Jit Saikia <rajasaikia1644@gmail.com>) but that email is registered on the empty Anuraj-Jit-Saikia GitHub account, so GitHub shows commits under the wrong avatar instead of Anuraj-dev (repo owner). Fix is a GitHub email-settings action only Raja can do (move+verify the email to Anuraj-dev); GitHub then re-attributes retroactively. Holding the push so pushed commits land under the right account. NOT a git-config change — the local identity stays as-is.
