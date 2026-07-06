# Render-Fidelity Spike — Findings (browser phase)

Issue #2, browser phase only. Goal: prove that a single self-contained
HTML + print-CSS file can produce a clean A4 PDF with correct math, code,
and tables, before any app code is written. The same `sample.html` will
later be fed to `expo-print` (Android WebView) on a real phone to measure
the fidelity delta.

## Verdict: CLEAN (browser / headless Chrome)

| Element | Result |
|---|---|
| Math (KaTeX) | All glyphs correct — 2x2 inverse matrix, Gaussian integral, Basel sum, inline O(n log n), nabla.E = rho/eps0, alpha,beta,gamma in R. No blank boxes, no missing radicals/brackets. |
| Code (highlight.js) | Monospaced, syntax-colored, splits cleanly across the p2->p3 page boundary (break falls between lines, never mid-glyph). |
| Table | 16 rows x 6 cols, all cell borders intact, header row present, zebra striping, right-aligned numeric column. |
| Page breaks | No mid-element breaks on small elements; table kept whole (pushed to p4 rather than split); no trailing blank page. 4 pages total, A4 (594.96 x 841.92 pt). |

## How it was built

`build.js` (Node, run once at author time — NOT at view time):

1. Pre-renders all math to static HTML with the `katex` npm package
   (`renderToString`, display + inline). No KaTeX JS ships in the output —
   important because expo-print's WebView JS execution timing is unreliable.
2. Pre-renders the Python listing with `highlight.js` `highlight()`.
3. Inlines `katex.min.css`, but rewrites every `@font-face`: drops the 8
   font families our content never touches, and for the 12 it does use,
   replaces the `src:` with a single base64 woff2 data URI. Result:
   zero `url(fonts/...)` references, zero network fetches.
4. Inlines the highlight.js `github.css` light theme.
5. Stitches everything into `sample.html` via `template.html`.

`generate-pdf.sh` finds a Chromium-family binary (google-chrome ->
chromium -> flatpak) and prints to `browser-output.pdf` with
`--headless=new --no-pdf-header-footer --print-to-pdf`. A4 comes from the
HTML's `@page { size: A4; margin: 20mm }`.

## Key CSS decisions (all portability-driven)

- No flex, no grid anywhere — `display: block` / `display: table` only.
  Android WebView's print path mis-lays flex/grid.
- `page-break-inside: avoid` on `pre` and `table` — protects blocks that
  fit; a block taller than a page (the code listing) is still allowed to
  split, which is the correct degradation.
- `thead { display: table-header-group }` so a split table repeats its header.
- `white-space: pre-wrap` + `word-break: break-word` on `pre` so long code
  lines wrap instead of overflowing off the right page margin.
- `overflow: hidden` on `.katex-display` and `pre` as a guard against
  horizontal overflow.
- `orphans`/`widows`/`page-break-after: avoid` on headings for sane prose breaks.
- All CSS is plain CSS 2.1 page-break syntax (not the newer `break-inside`)
  for the widest WebView support.

## Numbers

- `sample.html`: ~279 KB (12 woff2 subsets dominate the size; the actual
  math/code/table markup is tiny). Matters for expo-print — the whole
  string is passed to the print API in memory.
- `browser-output.pdf`: 4 pages, ~181 KB.

## Gotchas the on-device (expo-print) phase must watch for

1. Font embedding is the whole ballgame. If Android's WebView ignores base64
   `@font-face` (some older WebViews were finicky), math falls back to a
   system serif and KaTeX positioning breaks. First on-device check: do the
   12 KaTeX glyphs render, or do they box/fallback?
2. Font subset is content-specific. We only embedded the 12 families THIS
   document uses. Real chat answers with different math (script/fraktur, wide
   operators, more AMS symbols) will need those families added, or they render
   as blank boxes. The app's generator must embed the full KaTeX font set (or
   detect used families per document).
3. File size scales with fonts, not text. Full KaTeX font set as base64 is
   ~1-2 MB. Passing a multi-MB HTML string to expo-print on every export may
   be slow/memory-heavy on low-end Android — measure it.
4. `@page` margin support. Confirm Android WebView honors `@page { margin }`.
   If not, fall back to body padding + expo-print's own margin options.
5. Page-break fidelity may differ. Chromium honored `page-break-inside: avoid`
   and `table-header-group` perfectly here; WebView's print engine is a
   different (older) code path — re-verify the code split and table integrity
   on-device, don't assume parity.
6. No JS at view time was deliberate — keep it that way; do not switch to
   load-time KaTeX rendering for expo-print.

## Files

- `sample.html` — the self-contained artifact (the deliverable).
- `browser-output.pdf` — headless-Chrome reference render.
- `generate-pdf.sh` — regenerates the PDF.
- `build.js` + `template.html` + `code-sample.py` — author-time generator
  (needs `node_modules/`; NOT needed to view sample.html).
