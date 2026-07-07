# chat-to-pdf — State
> Android-first Expo app: turns AI chat answers into clean, printable PDFs (on-device). · Last checkpoint: 2026-07-07 17:46 (evening session)

## 🚧 In progress / next
- **v0 pipeline is DONE, shipped, on-device, and PUSHED.** Repo is now **public** (`Anuraj-dev/chat-to-pdf`), `main` up to date.
- **NEW this session — in-app updater (spec 0002) built + verified end-to-end on device (v1.0.0→v1.0.1).**
- **Immediate next step:** fix the one known gap — **on-device SHA-256 verify OOMs** on the 60MB base64 round-trip and degrades to a non-blocking "install with caution" warning. Fix = chunked/streamed hashing in `src/update/download.ts` (`sha256OfFile`). Until then checksum protection is inert (install still works). Then a rebuild + re-verify.
- **Optional follow-ups:** `.github/workflows/release.yml` (spec §8 — auto build+release on `v*` tag; not written yet); friendlier "no releases yet" message for a 404 (currently shows "couldn't read").

## Status
- Full pipeline (capture→parse→render→output/store), UI screens, code cards, PDF naming, Documents save: DONE.
- **In-app update (NEW):** "Check for updates" from the Home top-bar ⓘ → GitHub Releases `/latest` → semver compare → download APK → sha256 verify → Android package installer. Manual only, Android only. Verified live on the Motorola: check/download/install-intent all work; **Expo's built-in FileProvider is accepted by the installer (no custom provider needed)**; signing continuity confirmed (in-place update, not a conflict).
- Releases live: GitHub Releases **v1.0.0** and **v1.0.1** (each with `chat-to-pdf-<v>.apk` + `.apk.sha256`). Phone currently on **1.0.1**.
- Suite: **305 tests / 23 suites green**, tsc clean.

## Architecture map
- Pipeline: Capture→Parse→Render→Output/Store. `App.tsx` (nav+flow) + `src/{capture,parse,render,output,storage,types,ui}` — spec 0001 §4.
- **Update feature:** `src/update/{config,semver,models,githubReleases,download,installer,index}.ts` + `src/ui/components/UpdateSheet.tsx`; entry = ⓘ button in `src/ui/components/TopBar.tsx` (`HomeTopBar`), wired in `src/ui/screens/HomeScreen.tsx` (local state — App.tsx untouched). Permission via `app.json` `android.permissions`. Full design + on-device verdict: `docs/specs/0002-in-app-update.md`.
- Design source: `design/DESIGN-SPEC.md`. Spikes: `spike/FINDINGS.md`, `spike/DEVICE-FINDINGS.md`.

## Stack & run
- Expo SDK 54 + TS. markdown-it + KaTeX + highlight.js + JetBrains Mono. expo-print/file-system(SAF)/sharing/clipboard; AsyncStorage; react-native-webview; **expo-intent-launcher/expo-application/expo-crypto** (update feature).
- Run: `npx expo start` · Test: `npm test` (305) · Types: `npm run typecheck`.
- Build APK: `npx eas-cli build --platform android --profile preview --non-interactive` (logged in as `anurajjit`; keystore `WcDeRw6Z45` — NEVER regenerate). `npx eas` fails — use `npx eas-cli`.
- Phone: Motorola Edge 60 Fusion, serial ZN42274J4F, adb USB (drops off intermittently — replug/allow debugging).

## Key decisions (top 6)
- On-device render HTML/CSS → expo-print. Storage v0 = AsyncStorage. No backend/auth.
- In-app updater uses **GitHub Releases**, NOT `expo-updates` (expo-updates can't replace a whole sideloaded APK). Manual check only in v0.
- **Repo is public** — the app reads releases via the anonymous GitHub API, which 404s on private repos (check AND asset download). Keep it public or move releases to a public host.
- Release contract: tag `vX.Y.Z`, exactly one `.apk` + one `.apk.sha256` asset per release; every release signed with the SAME EAS keystore (in-place update depends on it).
- sha256 verify is **non-blocking**: a mismatch blocks+deletes, but a hashing *failure* degrades to a warning and still installs (currently the on-device path).
- Workflow: commit-per-feature on `main`, pushed. No AI credits in commits.

## Gotchas
- **On-device sha256 verify currently fails** (60MB base64→bytes OOM/limit) → shows "Couldn't verify… install with caution". Fix = chunked hashing. Not a blocker; install proceeds.
- **Signing continuity is load-bearing** — if the EAS keystore is ever regenerated, all installed users are stranded (must uninstall to update).
- First install on a phone hits the OS "install unknown apps" gate + Play Protect "scan/install without scanning" — expected, user must tap through; the app deep-links to the right settings screen.
- Don't put backticks inside the `PRINT_CSS` template literal — they close the string.
- Update code uses `expo-file-system/legacy` (downloadAsync/getContentUriAsync/cacheDirectory) — NOT the SDK 54 File/Directory API, matching the rest of the codebase.
- Android WebView print: no @page margin boxes/counters; break-inside:avoid works; portrait only. EAS free tier 15 builds/mo (3 used today).
