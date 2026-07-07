# chat-to-pdf — State
> Android-first Expo app: turns AI chat answers into clean, printable PDFs (on-device). · Last checkpoint: 2026-07-07 14:46 (afternoon session)

## 🚧 In progress / next
- **All build issues (#3–#11) DONE + 3 UX commits this session** (code cards, PDF naming, Documents save). All on `main` **local, NOT pushed** (see Gotchas — push is intentionally held pending the GitHub email fix).
- **ACTION on Raja (GitHub, one-time):** commits are authored correctly as `Anuraj Jit Saikia <rajasaikia1644@gmail.com>` but that email is on the empty **Anuraj-Jit-Saikia** GitHub account, so commits show under the wrong avatar. Fix = remove that email from Anuraj-Jit-Saikia, add+verify it on **Anuraj-dev**. Then push (attribution re-maps retroactively).
- **Phase 3 (still open)**: EAS preview build → adb install → E2E. Blocker: `EXPO_TOKEN` unset AND `npx eas-cli whoami` = Not logged in → Raja must `npx eas-cli login`. (`npx eas` fails — pkg is `eas-cli`.)
- Issue #1 (PRD) is the only open GitHub issue — docs-only.

## Status
- #3–#8 pipeline (scaffold/parse/render/output/storage), #9 UI screens, #10 print gate, #11 capture helper: DONE, committed.
- **NEW — code cards (629cbc1)**: fenced/indented code → carded `.codeblock` (header bar: gray dots + language label, over a highlighted body). JetBrains Mono embedded woff2 (SIL OFL) via `scripts/embed-code-font.js`. highlight.js/lib/common at PARSE time (Hermes-safe, no JS at print). Grayscale-safe theme. Verified in Chromium + on-device bundle.
- **NEW — PDF naming + Documents (c4fdca9)**: Save opens a "Name your PDF" dialog pre-filled with the title (`NameDialog.tsx`); typed name sanitized by `sanitizeUserFilename`. SAF picker pre-seeded to Documents (`getUriForDirectoryInRoot`, lazy). Verified on-device: file at `/sdcard/Documents/<name>.pdf`.
- **NEW — app.json (ba36923)**: EAS project link (owner `anurajjit` + projectId).
- Suite: **282 tests / 20 suites green**, tsc clean.

## Architecture map
- Pipeline: Capture → Parse → Render → Output/Store. `App.tsx` (nav + flow) + `src/{capture,parse,render,output,storage,types,ui}` — spec 0001 §4.
- Code render: `src/parse/markdownToHtml.ts` (`renderCodeBlock` + highlight.js) → `.codeblock` CSS in `src/render/print.css.ts`; font in `src/render/codeFont/codeFontCss.ts` (generated, injected by `template.ts`).
- Save/naming: `src/output/{saf,save,filename}.ts` + `src/ui/components/NameDialog.tsx` + `PreviewScreen` (SaveAction carries the filename).
- Design source: `design/DESIGN-SPEC.md`. Spikes: `spike/FINDINGS.md`, `spike/DEVICE-FINDINGS.md`.

## Stack & run
- Expo SDK 54 + TS. markdown-it + KaTeX + **highlight.js** (parse-time highlight) + **@fontsource/jetbrains-mono** (devDep, author-time embed). expo-print/file-system(SAF)/sharing/clipboard; AsyncStorage; react-native-webview. No router.
- Run: `npx expo start` · Test: `npm test` (282) · Types: `npm run typecheck` · Regen fonts: `npm run embed:codefont` / `embed:katex`.
- Phone: Motorola Edge 60 Fusion, serial ZN42274J4F, adb USB OK. Device launch: adb reverse broken — use LAN `exp://192.168.0.100:8081` after `am force-stop host.exp.exponent`.

## Key decisions (top 6)
- On-device render HTML/CSS → expo-print (FINAL). Storage v0 = AsyncStorage. No backend/auth.
- Code highlighting baked to static HTML at PARSE time (highlight.js/lib/common) — never at print time; grayscale-safe theme (weight/italic, not hue).
- Code font = JetBrains Mono, embedded base64 woff2 (same pattern as KaTeX); ligatures OFF.
- Save flow: user names the PDF (default = title); saved to public Documents via a one-time SAF grant (pre-seeded), persisted.
- Preview shows persisted HTML snapshot; PDF saved to History BEFORE Preview. Dark mode out of scope v0.
- Workflow: commit-per-feature on main (local). Push held until the GitHub email attribution is fixed.

## Gotchas
- **Don't put backticks inside the `PRINT_CSS` template literal** — they close the string (bit me twice this session).
- Code CSS: header bar padding lives on the CELLS not the `display:table` (table width:100% is content-box → table padding overflows the card and `overflow:hidden` clips the language label).
- SAF Documents seed is best-effort (some OEM pickers ignore the hint); grant is persisted either way so the picker only shows once. `documentsInitialUri()` is lazy + try/catch so module load never touches SAF (tests mock `getUriForDirectoryInRoot`).
- Android WebView print: no @page margin boxes/counters; break-inside:avoid works; portrait only.
- helperPrompts.ts backslash escapes are load-bearing. jest-expo ~54.x; @types/jest v29. EAS free tier 15 builds/mo (max 3/session). `npx eas` fails — use `npx eas-cli`.
