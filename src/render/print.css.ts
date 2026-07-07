// [3] RENDER — print stylesheet. The full print CSS from issue #10 (the PDF
// formatting quality gate, target 9.5/10) as a TS string.
//
// Design constraints (all locked findings — do not "modernise" away):
//  - CSS 2.1-safe page-break hints: every break rule is written in BOTH the
//    legacy `page-break-*` form AND the modern `break-*` form. Android System
//    WebView's print path is an older Chromium fork; the legacy form is the
//    load-bearing one, the modern form is future-proofing.
//  - display:block / display:table ONLY — NO flex/grid. Android WebView's print
//    layout mis-paginates flex/grid (spec 0001 §5, spike/FINDINGS.md).
//  - Portrait A4 only — landscape is unsupported by the WebView print engine.
//  - NO @page margin boxes / running headers-footers / page counters — those
//    are hard-blocked at the OS level on Android (issue #10, defect #10). Only
//    `@page { size; margin }` is honored, and page *size* is additionally
//    overridden at the expo-print call (see toPdf.ts). @page *margin* IS
//    honored on-device (spike/DEVICE-FINDINGS.md), so margins live here.
//
// Type scale, spacing, and break craft are transcribed verbatim from issue #10.

export const PRINT_CSS: string = `
@page { size: A4; margin: 20mm 18mm; }

html { -webkit-text-size-adjust: 100%; }

body {
  display: block;
  margin: 0;
  padding: 0;
  /* Serif prose body — system fonts, nothing to download (issue #10). */
  font-family: Georgia, "Noto Serif", serif;
  font-size: 10.75pt;          /* issue #10: 10.5–11pt */
  line-height: 1.45;
  color: #1a1a1a;
  -webkit-font-smoothing: antialiased;
}

/* Prose root: cap the measure to ~66–75 chars so long paragraphs don't run the
   full page width (issue #10 defect #7). em-relative so it tracks font-size.
   Georgia's average advance is ~0.48em/char, so 34em ≈ 71 chars — inside the
   66–75 target. (40em ≈ 83 chars overshot the spec's upper bound.) */
.doc {
  display: block;
  max-width: 34em;
}

/* ---------- Type scale (~1.3 ratio, 4pt vertical rhythm) ---------- */
h1, h2, h3, h4 {
  display: block;
  /* Sans for headings — clear hierarchy vs the serif body (issue #10). */
  font-family: "Roboto", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif;
  color: #111;
}
h1 { font-size: 22pt;   line-height: 1.25; margin: 0 0 10pt; }
h2 { font-size: 17pt;   line-height: 1.3;  margin: 22pt 0 8pt; }
h3 { font-size: 13.5pt; line-height: 1.35; margin: 16pt 0 6pt; }
h4 { font-size: 11.5pt; font-weight: bold; margin: 12pt 0 4pt; }

p { display: block; margin: 0 0 8pt; orphans: 3; widows: 3; }

ul, ol { margin: 0 0 8pt; padding-left: 22pt; }
li { margin: 0 0 3pt; }

a { color: #0b3d91; text-decoration: none; }

/* ---------- Break craft (issue #10) ----------
   The heading break-after:avoid is the load-bearing rule (keeps a heading
   with the content it introduces — kills the "orphaned heading" defect #3).
   orphans/widows are nice-to-have; WebView support is spotty. */
h1, h2, h3, h4, thead, tr, li, blockquote, figure {
  break-inside: avoid;
  page-break-inside: avoid;
}
h1, h2, h3, h4 {
  break-after: avoid;
  page-break-after: avoid;
}

/* ---------- Math (static KaTeX markup + bundled fonts) ----------
   NO overflow:hidden here (issue #10 defect #4): KaTeX display math is
   white-space:nowrap internally, so hiding overflow would SILENTLY TRUNCATE a
   wide equation at the right margin — invisible data loss. A visible overflow
   into the margin is detectable and fixable by the author; a clip is not.
   max-width:100% keeps the block itself inside the prose column; a wider-than-
   page equation prints partially into the margin rather than being cut by us. */
.katex-display {
  margin: 12pt 0;
  break-inside: avoid;
  page-break-inside: avoid;
  max-width: 100%;
}
.katex { font-size: 1.05em; }
/* Parser fallback for un-renderable math: keep it visible, not a blank box. */
.math-error { color: #a00; }
.math-error-block { display: block; margin: 12pt 0; }

/* ---------- Code ----------
   Short blocks stay whole (break-inside:avoid). Blocks taller than ~1 page get
   the .breakable class from the renderer (see template.ts) so they may split
   rather than shove a giant orphan onto the next page (issue #10, defect #1). */
pre {
  display: block;
  break-inside: avoid;
  page-break-inside: avoid;
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  padding: 8pt 10pt;
  margin: 10pt 0;
  white-space: pre-wrap;       /* wrap long lines — never clip at the right margin */
  word-break: break-word;
  overflow: hidden;
}
pre.breakable {
  break-inside: auto;
  page-break-inside: auto;
}
pre code, code {
  font-family: "Roboto Mono", "DejaVu Sans Mono", "Consolas", "Menlo", "Courier New", monospace;
  font-size: 9.75pt;           /* issue #10: 9.5–10pt */
  line-height: 1.4;
}
/* Inline code inside prose — tinted chip, not a full block. */
:not(pre) > code {
  background: #f0f0f0;
  padding: 0 2px;
  border-radius: 3px;
  font-size: 9.25pt;
}

/* ---------- Tables ---------- */
table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  margin: 10pt 0;
  font-family: "Roboto", system-ui, -apple-system, Arial, sans-serif;
  font-size: 9.25pt;
  break-inside: avoid;
  page-break-inside: avoid;
}
table.breakable {
  break-inside: auto;
  page-break-inside: auto;
}
thead { display: table-header-group; }   /* repeat header row across a page split */
tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
th, td {
  border: 0.5pt solid #999;
  padding: 4pt 6pt;
  text-align: left;
  vertical-align: top;
}
th { background: #ececec; font-weight: bold; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }

/* ---------- Blockquotes / callouts ---------- */
blockquote {
  display: block;
  margin: 10pt 0;
  padding: 8pt 12pt;
  border-left: 3pt solid #4a6da7;   /* accent border — visually distinct, not just indent */
  background: #f4f7fb;              /* subtle tint */
  color: #2a2a2a;
}
blockquote p { margin: 0 0 4pt; }
blockquote p:last-child { margin-bottom: 0; }

/* ---------- Horizontal rule ---------- */
hr {
  border: none;
  border-top: 0.5pt solid #bbb;
  margin: 18pt 0;
}

img { max-width: 100%; }
`;
