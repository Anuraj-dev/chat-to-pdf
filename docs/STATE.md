# chat-to-pdf — State
> Android-first Expo app: turns AI chat answers into clean, printable PDFs (on-device). · Last checkpoint: 2026-07-07 01:51 (overnight autonomous run)

## 🚧 In progress / next
- **NEXT = issue #9: UI screens per design/DESIGN-SPEC.md (home+preview+history, one-tap flow).** Then #10 gate, #11 helper, Phase 3 ship.
- **Push policy tonight**: direct push to `main` is blocked by local permission policy → commits land on `main` locally and are pushed to branch **`overnight-build`** after each issue. Raja: fast-forward `origin/main` to `overnight-build` in the morning.
- **Phase 3 blocker (pending)**: `EXPO_TOKEN` is NOT in the env and eas-cli is not logged in → EAS build will fail. Raja must `eas login` or export EXPO_TOKEN. Recheck before Phase 3.

## Status
- Issue #3 DONE (commit 62e650f, closed): Expo SDK 54 TS scaffold at repo root, EAS profiles (dev/preview APK, no dev-client — Expo Go workflow), jest+jest-expo (1/1), tsc clean, expo-doctor 18/18, codex-reviewed, on-device boot PASS (screenshot-verified Hello screen).
- Phase 1 research DONE → issue #10 (PDF formatting quality gate: full print stylesheet spec, A4 margins/type scale/break rules + WebView reality) and #11 (capture helper: per-AI "get full answer" prompts, four-tilde fence trick, parser-hardening reqs for #4).
- spike/ + design/ + docs committed (e27998d). Issues #4–#9 + #10, #11 open.

## Architecture map
- Pipeline: Capture → Parse → Render → Output/Store (on-device). `App.tsx` + `src/{capture,parse,render,output,storage,types}` — spec 0001 §4.
- Print quality bar: issue #10 (spec inline in the issue). Capture helper prompts: issue #11.
- Design: `design/DESIGN-SPEC.md` = UI source of truth (issue #9). Spike learnings: `spike/FINDINGS.md`, `spike/DEVICE-FINDINGS.md`.

## Stack & run
- Expo SDK 54 (PINNED — phone's Expo Go 54.0.8) + TS. markdown-it + @vscode/markdown-it-katex + katex; expo-print/file-system/sharing; AsyncStorage. No router.
- Run: `npx expo start` · Test: `npm test` · Types: `npm run typecheck` · Health: `npx expo-doctor`.
- Phone: Motorola Edge 60 Fusion, serial ZN42274J4F, adb USB OK. Screen kept awake tonight via `adb shell svc power stayon true`.
- **Device launch: adb reverse tcp:8081 was silently broken (tunnel up, zero bytes) — working fallback: LAN `exp://192.168.0.101:8081`** after `am force-stop host.exp.exponent` (kills stale cached experience).

## Key decisions (top 6)
- On-device render via HTML/CSS → expo-print (FINAL). Storage v0 = AsyncStorage. No backend/auth.
- Math/code pre-rendered to static HTML at parse time; KaTeX fonts base64-embedded.
- NO expo-dev-client (would flip `expo start` away from Expo Go) — dev = Expo Go, ship = EAS preview APK.
- Letter-size fix lands in #5: explicit `width:595, height:842` in printToFileAsync (Android ignores CSS @page size).
- PDF saved to History BEFORE Preview shows. Dark mode out of scope v0.
- Workflow: commit-per-issue on main (local) + push to overnight-build; codex reviews substantial diffs.

## Gotchas
- Android WebView print: no @page margin boxes/page counters (OS-level); break-inside:avoid works; orphans/widows unreliable; portrait only. Full spec in issue #10.
- ChatGPT escapes `$` in math (`\$`) and prefers `\( \)` — parser must strip/accept fallbacks (issue #11 checklist → #4).
- jest-expo must stay ~54.x (ERESOLVE if it drifts to SDK 57); @types/jest pinned v29.
- SafeAreaView deprecation warning from App.tsx (cosmetic) — migrate to react-native-safe-area-context in #9.
- Expo Go app cache not adb-readable — get files off phone via HTTP POST to a reversed port (if reverse works) or LAN.
- EAS free tier 15 builds/mo — tonight's budget: max 3.
