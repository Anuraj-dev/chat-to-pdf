# chat-to-pdf — State
> Android-first Expo app: turns AI chat answers into clean, printable PDFs (on-device). · Last checkpoint: 2026-07-07 08:53 (morning session, Raja awake)

## 🚧 In progress / next
- **All build issues (#3–#11) DONE.** On-device smoke test running (Sonnet over adb). Then **Phase 3: EAS preview build → adb install → E2E**.
- **Phase 3 blocker (ACTIVE)**: `EXPO_TOKEN` unset AND `npx eas-cli whoami` = Not logged in. Raja must run `npx eas-cli login` (asked in chat). Note: bare `npx eas` fails — the package is `eas-cli`.
- **Push policy**: commits land on `main` locally, pushed to branch **`overnight-build`**. Raja: fast-forward `origin/main` to `overnight-build`.
- Issue #1 (PRD) is the only open issue — docs-only, not a build blocker.

## Status
- #3 scaffold, #4 parse (markdown→HTML + static KaTeX, hardened normalization), #5 render (A4 expo-print), #6 capture (paste box + clipboard suggest), #7 output (share/print/SAF save), #8 storage (AsyncStorage history + durable PDF copies): DONE, committed, closed.
- **#9 UI screens DONE (e337bf4 lineage, commit 4b79074)**: full src/ui layer (theme, navReducer, 6 screens, components) per design/DESIGN-SPEC.md. Codex-reviewed; 4 findings fixed: in-flight guard (double-tap), cancel-safe pipeline (gen-token checks around saveDocument + temp cleanup), Preview shows persisted HTML snapshot (htmlUri on HistoryDoc; file next to PDF, not in AsyncStorage JSON), pageCount threaded from expo-print numberOfPages → subtitle + §1e page indicator.
- **#10 print quality gate DONE (6bc0b69)**: stylesheet already matched spec from #5 work; fixed measure 40em→34em (~71 chars, in 66–75 band); +13 gate tests locking type scale/break rules/code/table/blockquote/hr.
- **#11 capture helper DONE (e337bf4)**: prompts-as-data (src/capture/helperPrompts.ts, verbatim from issue incl. \\( escapes), HelperSheet bottom sheet (picker → copied confirmation), writeClipboard wrapper. Codex-reviewed; 2 findings fixed: copy failure → retry message (never false success), sheet maxHeight 70% + ScrollView. Parser hardening was already complete since #4 — added per-AI fixture tests.
- Suite: **248 tests / 19 suites green**, tsc clean.

## Architecture map
- Pipeline: Capture → Parse → Render → Output/Store. `App.tsx` (nav + flow state, hand-rolled navReducer) + `src/{capture,parse,render,output,storage,types,ui}` — spec 0001 §4.
- `src/ui/`: theme.ts, navigation.ts, onboarding.ts, helperSheet.ts (pure logic), components/, screens/.
- renderToPdf returns `{ uri, pageCount, html }`; saveDocument persists PDF + HTML snapshot (`htmlUri`) into document dir.
- Design source of truth: `design/DESIGN-SPEC.md`. Spike learnings: `spike/FINDINGS.md`, `spike/DEVICE-FINDINGS.md`.

## Stack & run
- Expo SDK 54 (PINNED — phone's Expo Go 54.0.8) + TS. markdown-it + @vscode/markdown-it-katex + katex; expo-print/file-system/sharing/clipboard; AsyncStorage; react-native-safe-area-context; react-native-webview (Preview HTML snapshot). No router.
- Run: `npx expo start` · Test: `npm test` (248) · Types: `npm run typecheck` · Health: `npx expo-doctor`.
- Phone: Motorola Edge 60 Fusion, serial ZN42274J4F, adb USB OK, screen awake (`adb shell svc power stayon true`).
- **Device launch: adb reverse broken — use LAN `exp://<LAN_IP>:8081`** after `am force-stop host.exp.exponent`.

## Key decisions (top 6)
- On-device render via HTML/CSS → expo-print (FINAL). Storage v0 = AsyncStorage. No backend/auth.
- Preview shows the persisted **HTML snapshot** (not PDF bytes) — Expo Go has no PDF viewer; snapshot saved at render time so history reopen never drifts from the saved PDF.
- NO expo-dev-client — dev = Expo Go, ship = EAS preview APK. NO routers (hand-rolled navReducer).
- PDF (and HTML snapshot) saved to History BEFORE Preview shows. Dark mode out of scope v0.
- Codex review gate on substantial diffs (#9: 4 findings, #11: 2 findings — all fixed); small diffs (#10) driver-verified only.
- Workflow: commit-per-issue on main (local) + push to overnight-build.

## Gotchas
- Android WebView print: no @page margin boxes/page counters (OS-level, v0 out of scope); break-inside:avoid works; orphans/widows unreliable; portrait only.
- jest-expo must stay ~54.x; @types/jest pinned v29. Repo tests are pure-logic only — no JSX render harness (deliberate; don't add one casually).
- helperPrompts.ts: backslash escapes are load-bearing (`\\(` in source → `\(` on clipboard) — tests lock the exact strings.
- EAS free tier 15 builds/mo — build budget this session: max 3.
- `npx eas` fails (wrong pkg name) — use `npx eas-cli`.
