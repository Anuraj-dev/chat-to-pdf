// [3] RENDER — HTML skeleton. Wraps the parse layer's body HTML (with static
// KaTeX markup) into a full, self-contained print document: DOCTYPE + meta +
// inlined KaTeX CSS (fonts base64-embedded) + the print stylesheet.
//
// No React / native / expo imports — pure string→string so it unit-tests under
// plain jest and can run anywhere. See docs/specs/0001-architecture-foundation.md §4.

import { PRINT_CSS } from './print.css';
import { KATEX_CSS } from './katex/katexCss';

export interface BuildDocumentOptions {
  /** <title> of the document. Not printed on the page (Android WebView blocks
   *  running headers/footers) — only metadata. */
  title?: string;
  /** Char-length FALLBACK threshold for the breakable heuristic (the primary
   *  signals are line/row counts — see PRE_BREAKABLE_LINES /
   *  TABLE_BREAKABLE_ROWS). Blocks marked `breakable` may split across pages
   *  instead of pushing a giant orphan block. */
  breakableThreshold?: number;
}

// Height heuristic (issue #10: break-inside avoid protects blocks that FIT a
// page; taller ones must be allowed to split — defects #1 and #2). Height is
// estimated WITHOUT layout:
//  - <pre>: line count (newlines in the inner content). At 9.75pt/1.4 mono,
//    ~55 lines fill the A4 content box; >40 lines is "page-tall risk"
//    territory. Char length is only a FALLBACK for extreme single-line blocks
//    (minified JSON etc.) that wrap into many rendered lines under pre-wrap.
//  - <table>: row count (<tr> tags). ~30 single-line rows fill a page; >25
//    rows → breakable. Char fallback catches few-row tables with huge cells.
export const PRE_BREAKABLE_LINES = 40;
export const TABLE_BREAKABLE_ROWS = 25;
// Char-length FALLBACK threshold (not the primary signal — see above).
export const DEFAULT_BREAKABLE_THRESHOLD = 1200;

/**
 * Add `class="breakable"` to any <pre>/<table> block estimated taller than one
 * A4 page (line/row count primary, serialized char length as fallback). Short
 * blocks are left untouched so the default `break-inside: avoid` in print.css
 * keeps them whole.
 *
 * Non-nested blocks only (chat answers don't nest <pre>/<table>); a nested
 * block would confuse the backreference match — accepted limitation.
 */
export function markBreakableBlocks(
  bodyHtml: string,
  charThreshold: number = DEFAULT_BREAKABLE_THRESHOLD,
): string {
  return bodyHtml.replace(
    /<(pre|table)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    (whole, tag: string, attrs: string, inner: string) => {
      if (!isPageTall(tag.toLowerCase(), whole, inner, charThreshold)) return whole;
      return `<${tag}${addBreakableClass(attrs)}>${whole.slice(
        whole.indexOf('>') + 1,
      )}`;
    },
  );
}

// Estimate whether a block risks being taller than one A4 content box.
function isPageTall(tag: string, whole: string, inner: string, charThreshold: number): boolean {
  if (whole.length > charThreshold) return true; // fallback: sheer bulk
  if (tag === 'pre') {
    const lines = (inner.match(/\n/g) || []).length + 1;
    return lines > PRE_BREAKABLE_LINES;
  }
  const rows = (inner.match(/<tr\b/gi) || []).length;
  return rows > TABLE_BREAKABLE_ROWS;
}

// Insert/merge a `breakable` class into an opening tag's attribute string.
function addBreakableClass(attrs: string): string {
  const classAttr = attrs.match(/\sclass\s*=\s*("|')(.*?)\1/i);
  if (classAttr) {
    if (/\bbreakable\b/.test(classAttr[2])) return attrs; // already marked
    const merged = `${classAttr[2]} breakable`.trim();
    return attrs.replace(classAttr[0], ` class="${merged}"`);
  }
  return `${attrs} class="breakable"`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the full self-contained print document from parsed body HTML.
 *
 * The output has zero external references: KaTeX CSS is inlined with its fonts
 * embedded as base64 woff2 data URIs, and the body/heading/mono fonts are
 * system fonts. This is mandatory — expo-print's Android WebView has no network
 * at print time (spec 0001 §5).
 */
export function buildDocument(bodyHtml: string, opts: BuildDocumentOptions = {}): string {
  const title = escapeHtml(opts.title ?? 'chat-to-pdf');
  const threshold = opts.breakableThreshold ?? DEFAULT_BREAKABLE_THRESHOLD;
  const body = markBreakableBlocks(bodyHtml, threshold);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${KATEX_CSS}</style>
<style>${PRINT_CSS}</style>
</head>
<body>
<main class="doc">
${body}
</main>
</body>
</html>`;
}
