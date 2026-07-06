# On-device render-fidelity findings (issue #2, device phase)

Physical device: Motorola Edge 60 Fusion, Android 16, serial `ZN42274J4F`, Expo Go 54.0.8.
App: `spike/device/` (downgraded from scaffolded SDK 57 → SDK 54 to match Expo Go). Same
`SAMPLE_HTML` (~279 KB, identical to the browser phase) fed to `Print.printToFileAsync` and
`Print.printAsync`.

## SDK downgrade
- `expo` ~57.0.2 → ~54.0.0, then `npx expo install --fix` aligned the rest:
  `expo-print` 15.0.8, `expo-sharing` 14.0.8, `expo-status-bar` 3.0.9, `expo-file-system` 19.0.23,
  `react` 19.1.0, `react-native` 0.81.5, `@types/react` ~19.1.0, `typescript` ~5.9.2.
- Had to drop `"expo-sharing"` from `app.json`'s `plugins` array — it has no config plugin and its
  presence there crashed Metro config resolution under Node 22's experimental type-stripping
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` inside `expo-modules-core`). `expo-sharing` needs
  no plugin entry at all.
- `npx tsc --noEmit` passes clean after the fix.
- Result: **downgrade succeeded**, app loads in Expo Go 54.0.8 with no further changes needed.

## Automated retrieval path
- `App.tsx` now reads the generated PDF via `expo-file-system/legacy`'s `readAsStringAsync` (base64)
  and POSTs `{ base64 }` as JSON to `http://localhost:9099/upload`. Dropped the `Sharing.shareAsync`
  call from the generate-PDF flow — the system share sheet would have blocked headless automation.
- `spike/receive-pdf.js` — tiny Node HTTP server, decodes the base64 body and writes
  `spike/device-output.pdf`.
- Wired via `adb reverse tcp:9099 tcp:9099` and `adb reverse tcp:8081 tcp:8081` (USB, no Wi-Fi
  dependency). Upload arrived and was written successfully (136,357 bytes).

## Run log
- Metro started clean (`Bundled 15616ms index.ts (695 modules)`).
- Launched via `adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"` → Expo Go
  opened and loaded the app on first try (~15s bundle, no error screen).
- Tapped "Generate PDF" (`adb shell input tap`, native screencap resolution 1220×2712 — note the
  coordinates must be in *raw* screencap pixels, not the tool's displayed/scaled preview pixels).
- On-screen result box: **`printToFileAsync took 714 ms`**. No error box shown.
- POST arrived at the local server immediately after; `device-output.pdf` written.
- Tapped "Print preview" → system "Save as PDF" dialog rendered the same content live (confirms the
  print pipeline, not just file generation) → dismissed cleanly with back (`adb shell input keyevent 4`).
  A second back press exited to the Expo Go home screen (harmless — all data already captured).

## Fidelity comparison (pdftoppm -r 60, 4 pages both sides)

| Check | Verdict | Note |
|---|---|---|
| Math (KaTeX) glyphs | **PASS** | All glyphs render correctly on-device: integral, summation, nabla, fractions, matrix brackets, inline math baseline. No blank boxes/fallback serif — base64 woff2 `@font-face` works in Android WebView print. |
| Code block (monospace + highlight.js colors) | **PASS** | Monospace font and syntax-highlight colors (keywords, strings, comments) render identically to browser. The ~90-line block splits cleanly across pages 2→3 at the exact same line (`came_from: dict = {start: None}` / continues at `g_score: dict = {start: 0.0}`) — no mid-glyph or mid-line break. |
| Table (borders, header, alignment) | **PASS** | All 16 rows + header row render with intact borders on page 4, right-aligned numeric columns preserved, no split (fits on one page both sides). |
| Page-break-inside:avoid / break points | **PASS** | Same break behavior as browser — long code block allowed to split (as intended), no element torn mid-content. |
| Trailing blank page | **PASS** | Both browser and device PDFs are exactly 4 pages; device page 4 ends with "4. Closing prose" section, no extra blank page appended. |
| A4 page size | **FAIL** | Browser PDF: 594.96×841.92 pt (A4, 210×297mm). **Device PDF: 612×792 pt (US Letter, 215.9×279.4mm)** — confirmed both in the downloaded file (`pdfinfo`) and live in the system "Save as PDF" print-preview dialog (shows "Paper size: Letter"). The CSS `@page { size: A4; margin: 20mm; }` in `template.html` is **not honored** by Android's print bridge (`expo-print`/`PrintManager`) — it falls back to the device/locale default media size (Letter, presumably en-US locale default) regardless of the CSS `@page size` rule. |
| Margins | **DEGRADED** | Visual left/right inset looks consistent between the two renders (same ~20mm-equivalent gutter), so `margin: 20mm` itself appears to be honored — but because the *page size* is wrong (Letter, not A4), the effective content width/height and the pt-perfect A4 layout are not reproduced. This is a downstream consequence of the size mismatch, not an independent margin bug. |
| Elapsed time (`printToFileAsync`) | **PASS** | 714 ms for ~279 KB HTML on Motorola Edge 60 Fusion — well within acceptable range for a foreground one-tap action. |

## Overall recommendation: **GO, with a fix-before-ship condition**

expo-print/Android WebView is fidelity-safe for the content that matters most (KaTeX math, code
highlighting, tables, break behavior) — the things `docs/STATE.md`'s gotchas flagged as
undocumented/risky all come back clean. The **one real defect** is that Android's print bridge
ignores the CSS `@page size: A4` directive and always emits US Letter. Two ways to fix before
shipping v0, either of which is small:
1. Pass an explicit page size to `Print.printToFileAsync({ html, width, height })` in points
   (595×842 for A4) — expo-print supports overriding page dimensions via the `width`/`height`
   options, which should take priority over both CSS and locale defaults. Retest to confirm.
2. Or accept Letter as the v0 default and drop the A4 CSS/marketing claim, since margin proportions
   still look fine and no content is lost or corrupted — only the physical page dimensions differ
   from what the CSS asks for.
Recommend (1): a targeted retest, not a redesign — the spike does not need to be re-run in full.

## Paths
- `spike/device-output.pdf` — PDF captured from the phone (4 pages, Letter, 136,357 bytes).
- `spike/browser-output.pdf` — known-good reference (4 pages, A4, 185,617 bytes).
- `spike/compare/browser/page-{1..4}.png`, `spike/compare/device/page-{1..4}.png` — 60dpi renders
  used for the side-by-side visual check above.
- `spike/receive-pdf.js` — throwaway upload receiver (safe to delete).
- `spike/device/App.tsx` — modified with the base64-POST retrieval path (throwaway code, per repo
  convention for `spike/`).

## Blockers encountered (all resolved)
- SDK 57→54 downgrade needed a version realignment pass (`expo install --fix`) plus removing a
  bogus `expo-sharing` config-plugin entry from `app.json` that crashed Metro under Node 22.
- adb tap coordinates must use the *native* screencap resolution (1220×2712 on this phone), not the
  scaled preview resolution shown by the image-reading tool — an early tap missed the button because
  of this scale mismatch; corrected on the second attempt.
- No permission dialogs or other blockers requiring manual intervention were hit.
