// [1] CAPTURE — pre-parse text cleanup + a markdown-ish heuristic. Pure string fns.
// See docs/specs/0001-architecture-foundation.md §4. Issue #6.
//
// This is LIGHT, pre-parse cleanup only. Heavier normalization (outer-fence
// unwrap, math-delimiter rewrites, CRLF handling for the parser) lives in
// src/parse/normalize.ts and MUST NOT be duplicated here — cleanCapturedText
// just strips the obvious chat-UI cruft so what reaches the paste box (and
// later the parser) is tidy.
//
// No React / native / expo imports — runs under plain jest.

// Zero-width + BOM characters that AI chat UIs occasionally smuggle into copies.
// U+FEFF (BOM / zero-width no-break space), U+200B–U+200D (zero-width space/
// non-joiner/joiner), U+2060 (word joiner).
const ZERO_WIDTH = /[﻿​‌‍⁠]/g;

// Standalone artifact lines some chat UIs prepend to code blocks. Matched only
// when a whole line is EXACTLY this label (case-insensitive), so real prose is
// never touched.
const ARTIFACT_LINE = /^(?:copy code|copy)$/i;

// A fenced-code opener line (```/~~~) — used to anchor artifact-line stripping.
const FENCE_OPEN = /^\s{0,3}(?:`{3,}|~{3,})/;

/**
 * Drop "Copy code" / "Copy" chat-UI artifact lines, but ONLY where chat UIs
 * actually put them: a standalone line immediately BEFORE a fence opener, or
 * within the first 2 lines of the text (copy-button cruft at the top of a
 * selection). A matching line anywhere else is real prose and passes through.
 */
function stripArtifactLines(text: string): string {
  const lines = text.split('\n');
  return lines
    .filter((line, i) => {
      if (!ARTIFACT_LINE.test(line.trim())) return true;
      if (i < 2) return false;
      const next = lines[i + 1];
      if (next !== undefined && FENCE_OPEN.test(next)) return false;
      return true;
    })
    .join('\n');
}

/**
 * Light, pre-parse cleanup of raw pasted / clipboard text:
 *  - strip BOM + zero-width characters
 *  - normalize CRLF/CR → LF (so blank-line collapse is reliable)
 *  - drop "Copy code" / "Copy" artifact lines (only pre-fence or in the first 2 lines)
 *  - collapse runs of 3+ blank lines down to 2
 *  - trim leading/trailing whitespace overall
 *
 * Intentionally does NOT unwrap fences or rewrite math — that is the parser's job.
 */
export function cleanCapturedText(raw: string): string {
  if (!raw) return '';

  let out = raw.replace(ZERO_WIDTH, '');

  // Normalize line endings so the line-based passes below are predictable.
  out = out.replace(/\r\n?/g, '\n');

  // Drop chat-UI artifact lines (e.g. ChatGPT's "Copy code") — position-anchored
  // so a "Copy" line in the middle of real prose survives.
  out = stripArtifactLines(out);

  // Collapse 3+ consecutive blank lines (whitespace-only counts as blank) to 2.
  out = out.replace(/(?:[ \t]*\n){3,}/g, '\n\n\n');

  // Trim outer whitespace (including now-leading blank lines from artifact removal).
  return out.trim();
}

// --- looksLikeMarkdown heuristic --------------------------------------------

const MARKDOWN_HINTS: RegExp[] = [
  /^#{1,6}\s+\S/m, // ATX heading
  /^\s{0,3}(```|~~~)/m, // fenced code block
  /^\s{0,3}\|?\s*:?-{2,}:?\s*\|\s*:?-{2,}:?/m, // GFM table delimiter row
  /\$\$[\s\S]+?\$\$/, // block math
  /(^|[^\\$])\$[^\s$][^$\n]*\$/, // inline math ($...$)
  /\\\([\s\S]+?\\\)/, // LaTeX inline math \( ... \)
  /\\\[[\s\S]+?\\\]/, // LaTeX block math \[ ... \]
  /^\s{0,3}[-*+]\s+\S/m, // bullet list
  /^\s{0,3}\d+\.\s+\S/m, // ordered list
  /`[^`\n]+`/, // inline code span
  /\[[^\]]+\]\([^)]+\)/, // link
  /\*\*[^*\n]+\*\*/, // bold
];

/**
 * Heuristic: does `text` look like markdown (has headings, fences, tables, math,
 * lists, or inline formatting)? Used only to HINT the user — never to gate the
 * conversion, which happily runs on plain prose too.
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text || text.trim() === '') return false;
  return MARKDOWN_HINTS.some((re) => re.test(text));
}
