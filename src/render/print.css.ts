// [3] RENDER — print stylesheet. On-device markdown→A4 PDF via expo-print's
// Android System WebView print path.
//
// This is the 2026-07-07 REDESIGN that closes the visual-quality gap against
// ChatGPT's built-in PDF export (Raja judged theirs "massively better"). The
// old serif/narrow-column look was replaced with a modern sans, near-full-width
// measure, tighter code blocks, and finished bordered callouts. Issue #10's
// spec is overruled wherever it conflicts with matching ChatGPT quality.
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
//    are hard-blocked at the OS level on Android (issue #10, defect #10). So a
//    per-page "Page N" footer (which ChatGPT's desktop export has) is
//    IMPOSSIBLE here — we do not fake it. Only `@page { size; margin }` is
//    honored, and page *size* is additionally overridden at the expo-print call
//    (see toPdf.ts). @page *margin* IS honored on-device
//    (spike/DEVICE-FINDINGS.md), so margins live here.
//  - Grayscale-safe: only subtle tints + gray borders; the one accent (a muted
//    slate blue) reads as a mid-gray when printed mono.

export const PRINT_CSS: string = `
@page { size: A4; margin: 18mm 16mm; }

html { -webkit-text-size-adjust: 100%; }

body {
  display: block;
  margin: 0;
  padding: 0;
  /* Modern system sans — reads cleaner at print size than the old Georgia
     serif, and matches ChatGPT's export. All system fonts, nothing to
     download (Android WebView print has no network). */
  font-family: -apple-system, system-ui, "Roboto", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.5;
  color: #1f2328;
  -webkit-font-smoothing: antialiased;
}

/* Prose root: a WIDE measure that nearly fills the content box between the
   @page margins (ChatGPT uses effectively full width — the old 34em serif
   column left a lopsided dead zone). 44em ≈ the A4 content width here, so the
   column is centred with only a hair of slack. margin:auto keeps it balanced;
   text stays left-aligned (ragged right) — NO justify, the WebView print engine
   has no reliable hyphenation so justification opens ugly rivers. */
.doc {
  display: block;
  max-width: 44em;
  margin-left: auto;
  margin-right: auto;
  text-align: left;
}

/* ---------- Type scale (strong h1→body contrast, sans throughout) ---------- */
h1, h2, h3, h4 {
  display: block;
  font-family: -apple-system, system-ui, "Roboto", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-weight: 700;
  color: #111418;
}
/* Document title: centred, large, generous space beneath — mirrors ChatGPT. */
h1 { font-size: 25pt;   line-height: 1.2;  margin: 0 0 22pt; text-align: center; }
h2 { font-size: 16pt;   line-height: 1.3;  margin: 24pt 0 8pt; }
h3 { font-size: 13pt;   line-height: 1.35; margin: 16pt 0 6pt; }
h4 { font-size: 11pt;   line-height: 1.4;  margin: 12pt 0 4pt; }

p { display: block; margin: 0 0 9pt; orphans: 3; widows: 3; }

ul, ol { margin: 0 0 9pt; padding-left: 22pt; }
li { margin: 0 0 4pt; }

a { color: #0b3d91; text-decoration: none; }

/* ---------- Break craft ----------
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
   max-width:100% keeps the block itself inside the prose column. */
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
   Tight and small — more content per line than the old loose blocks, matching
   ChatGPT. Subtle gray fill, hairline border (not a heavy rounded card). Short
   blocks stay whole; blocks taller than ~1 page get the .breakable class from
   the renderer (template.ts) so they may split rather than orphan a giant block
   onto the next page (issue #10, defect #1). */
pre {
  display: block;
  break-inside: avoid;
  page-break-inside: avoid;
  background: #f6f8fa;
  border: 0.75pt solid #e3e7eb;
  border-radius: 4px;
  padding: 7pt 9pt;
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
  font-size: 8.5pt;
  line-height: 1.35;
}
/* Inline code inside prose — tinted chip, not a full block. */
:not(pre) > code {
  background: #eef1f4;
  padding: 0.5pt 3pt;
  border-radius: 3px;
  font-size: 8.75pt;
}

/* ---------- Tables ---------- */
table {
  display: table;
  width: 100%;
  border-collapse: collapse;
  margin: 10pt 0;
  font-family: -apple-system, system-ui, "Roboto", "Segoe UI", Arial, sans-serif;
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
  border: 0.5pt solid #d0d7de;
  padding: 4pt 7pt;
  text-align: left;
  vertical-align: top;
}
th { background: #f0f2f4; font-weight: 700; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }

/* ---------- Blockquotes / callouts ----------
   A finished bordered box (full hairline border + left accent bar + subtle
   tint), not the old unfinished thin-blue-bar-only look. Reads as a callout
   even in grayscale. */
blockquote {
  display: block;
  margin: 12pt 0;
  padding: 9pt 13pt;
  border: 0.75pt solid #d8dee4;
  border-left: 3pt solid #4a6da7;   /* accent bar — mid-gray when printed mono */
  border-radius: 3px;
  background: #f7f9fc;              /* subtle tint */
  color: #3a3f45;
}
blockquote p { margin: 0 0 4pt; }
blockquote p:last-child { margin-bottom: 0; }

/* ---------- Horizontal rule — thin, sparing, generous section spacing ---------- */
hr {
  border: none;
  border-top: 0.5pt solid #d8dee4;
  margin: 20pt 0;
}

img { max-width: 100%; }
`;
