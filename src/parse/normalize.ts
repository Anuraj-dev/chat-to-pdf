// [2] PARSE — input normalization (pure string→string).
// Implements the "Parser hardening" checklist from issue #11, applied before markdown-it:
//  - normalize CRLF → LF
//  - unwrap a single four-tilde / four-backtick OUTER fence (tolerating stray pre/postamble)
//  - strip ChatGPT's `\$` escapes
//  - convert `\( \)` → `$...$` and `\[ \]` → `$$...$$`
//  - trim trailing whitespace-only lines
//
// Delimiter rewrites are applied ONLY outside code regions (fenced blocks + inline
// code spans), so shell snippets like `echo \$HOME` survive intact.
//
// No React / native / expo imports — runs under plain jest.

/** How many stray non-blank pre/postamble lines we tolerate around an outer wrapper. */
const MAX_STRAY_LINES = 3;

/**
 * Detect an outer wrapper fence made of 4+ tildes or 4+ backticks and return the
 * content between the opener and its matching closer. Ordinary triple-backtick code
 * blocks (3 chars) are intentionally NOT treated as wrappers, so inner ``` fences
 * survive.
 *
 * A fence pair only counts as a WRAPPER when it encloses essentially the whole
 * document: the opener must sit within the first MAX_STRAY_LINES non-blank lines and
 * the closer within the last MAX_STRAY_LINES non-blank lines (that slack is the
 * stray preamble/postamble tolerance). A legitimate mid-document 4+ fence therefore
 * never triggers unwrapping.
 *
 * Returns the original text unchanged when no such enclosing fence pair is found.
 */
function unwrapOuterFence(text: string): string {
  const lines = text.split('\n');
  const opener = /^\s*(~{4,}|`{4,})\s*\S*\s*$/; // opener may carry an info string

  // Opener: among the first MAX_STRAY_LINES non-blank lines.
  let openIdx = -1;
  let fence = '';
  for (let i = 0, nonBlank = 0; i < lines.length && nonBlank < MAX_STRAY_LINES; i++) {
    if (lines[i].trim() === '') continue;
    nonBlank++;
    const m = lines[i].match(opener);
    if (m) {
      openIdx = i;
      fence = m[1];
      break;
    }
  }
  if (openIdx === -1) return text;

  // Closer: same char, length >= opener, among the LAST MAX_STRAY_LINES non-blank lines.
  const closer = new RegExp(`^\\s*${fence[0]}{${fence.length},}\\s*$`);
  for (let j = lines.length - 1, nonBlank = 0; j > openIdx && nonBlank < MAX_STRAY_LINES; j--) {
    if (lines[j].trim() === '') continue;
    nonBlank++;
    if (closer.test(lines[j])) {
      return lines.slice(openIdx + 1, j).join('\n');
    }
  }
  return text; // no whole-document closer → not a wrapper, leave untouched
}

/**
 * Apply `transform` only to the parts of `text` that are NOT inline code spans.
 * Inline code = a run of 1+ backticks lazily matched to an equal-length closing run.
 */
function transformOutsideInlineCode(text: string, transform: (s: string) => string): string {
  const span = /(`+)([\s\S]*?)\1(?!`)/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = span.exec(text)) !== null) {
    out += transform(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + transform(text.slice(last));
}

/**
 * Apply `transform` only to non-code segments of `text`. Fenced code blocks
 * (``` / ~~~, 3+ chars, closed by a same-char run of >= opener length, or running
 * to EOF when unclosed) pass through verbatim, and inline code spans within the
 * remaining prose are protected too. Rewrites can never span across a code region
 * because each prose stretch is transformed independently.
 */
function transformOutsideCode(text: string, transform: (s: string) => string): string {
  const lines = text.split('\n');
  const fenceOpen = /^ {0,3}(`{3,}|~{3,})/;
  const out: string[] = [];
  let prose: string[] = [];

  const flushProse = () => {
    if (prose.length > 0) {
      out.push(transformOutsideInlineCode(prose.join('\n'), transform));
      prose = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(fenceOpen);
    if (m) {
      flushProse();
      const fenceClose = new RegExp(`^ {0,3}${m[1][0]}{${m[1].length},}[ \\t]*$`);
      let j = i + 1;
      while (j < lines.length && !fenceClose.test(lines[j])) j++;
      const end = Math.min(j, lines.length - 1); // unclosed fence runs to EOF
      out.push(lines.slice(i, end + 1).join('\n'));
      i = end + 1;
    } else {
      prose.push(lines[i]);
      i++;
    }
  }
  flushProse();
  return out.join('\n');
}

/**
 * The math-delimiter rewrites (issue #11 hardening). Prose-only — callers must
 * route this through transformOutsideCode so code regions are never touched.
 */
function rewriteMathDelimiters(text: string): string {
  // Convert LaTeX-style delimiters to $-delimiters (block first, then inline).
  // Function replacers so `$` in the replacement isn't treated specially.
  let out = text.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => `$$${inner}$$`);
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => `$${inner}$`);
  // Strip ChatGPT's `\$` escapes (it escapes `$` inside math).
  out = out.replace(/\\\$/g, '$');
  return out;
}

/**
 * Trim trailing lines that are empty or whitespace-only.
 */
function trimTrailingBlankLines(text: string): string {
  return text.replace(/(?:[ \t]*\n)+[ \t]*$/, '').replace(/[ \t]+$/, '');
}

/**
 * Normalize messy pasted AI-chat markdown into clean CommonMark/GFM source.
 */
export function normalizeInput(md: string): string {
  // 1. CRLF (and lone CR) → LF
  let out = md.replace(/\r\n?/g, '\n');

  // 2. Unwrap an outer four-tilde / four-backtick wrapper, dropping pre/postamble.
  out = unwrapOuterFence(out);

  // 3. Math-delimiter rewrites, applied only OUTSIDE code regions.
  out = transformOutsideCode(out, rewriteMathDelimiters);

  // 4. Trim trailing whitespace-only lines.
  out = trimTrailingBlankLines(out);

  return out;
}
