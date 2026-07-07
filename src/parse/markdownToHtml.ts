// [2] PARSE — markdown → HTML (+ static KaTeX). Pure string→string.
// See docs/specs/0001-architecture-foundation.md §2,4. Issue #4 (+ #11 hardening).
//
// LOCKED DECISION: math/code are pre-rendered to static HTML at parse time — NO
// client-side JS runs at print time. KaTeX markup here is paired with bundled
// CSS/fonts in the render layer.
//
// No React / native / expo imports — runs under plain jest.

import MarkdownIt from 'markdown-it';
import katex from 'katex';
import katexPlugin from '@vscode/markdown-it-katex';
// `lib/common` = the ~36 most-used languages (bash, js, ts, python, json, yaml,
// sql, html, css, go, rust, java, …) — covers what AI chat answers realistically
// contain without shipping all 190. Pure JS, so it runs under Hermes on-device
// AND under jest at parse time. Highlighting is baked into static HTML here — NO
// JS runs at print time (locked decision), same as KaTeX.
import hljs from 'highlight.js/lib/common';
import { normalizeInput } from './normalize';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// A code block taller than ~this many lines is marked `breakable` so it may
// split across pages instead of orphaning a giant block (mirrors
// render/template.ts PRE_BREAKABLE_LINES — kept in sync deliberately; parse must
// not import from the render layer). Decided HERE (we have the line count) rather
// than by the render layer's regex pass, because the code now lives inside a
// `.codeblock` wrapper whose break behaviour the inner <pre> can't express.
export const CODE_BREAKABLE_LINES = 40;

/**
 * Render one fenced/indented code block as a carded `.codeblock`: a header bar
 * (decorative dots + language label) over a highlighted `<pre>`. Structure and
 * classes are consumed by print.css (§Code). Grayscale-safe, block/table-only
 * layout — no flex/grid (Android WebView print mis-paginates those).
 */
function renderCodeBlock(rawCode: string, info: string): string {
  // markdown-it fence content keeps a trailing newline; drop it so it doesn't
  // render as a blank final line inside the card.
  const code = rawCode.replace(/\n$/, '');
  const lang = (info || '').trim().split(/\s+/)[0].toLowerCase();
  const known = lang !== '' && hljs.getLanguage(lang) !== undefined;

  // hljs.highlight(...).value is already HTML-escaped; the fallback escapes
  // ourselves. ignoreIllegals so a malformed snippet degrades gracefully.
  const inner = known
    ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
    : escapeHtml(code);
  const langClass = known ? ` language-${lang}` : '';
  const label = lang !== '' ? escapeHtml(lang) : 'code';

  const lines = code === '' ? 0 : code.split('\n').length;
  const breakable = lines > CODE_BREAKABLE_LINES ? ' breakable' : '';

  return (
    `<div class="codeblock${breakable}">` +
    `<div class="codeblock-head">` +
    `<span class="codeblock-dots"><i></i><i></i><i></i></span>` +
    `<span class="codeblock-lang">${label}</span>` +
    `</div>` +
    `<pre class="codeblock-body"><code class="hljs${langClass}">${inner}</code></pre>` +
    `</div>\n`
  );
}

// Wrap KaTeX so that malformed math never throws and never leaks raw `$`/`$$`
// delimiters into the output: on error we render the raw source in a code span.
// The plugin calls `katex.renderToString(latex, opts)`; by making our wrapper
// swallow errors, the plugin's own try/catch is never exercised.
const safeKatex = {
  ...katex,
  renderToString(tex: string, options?: katex.KatexOptions): string {
    try {
      // strict:'error' escalates strict-mode WARNINGS (e.g. \htmlClass, Unicode
      // quirks) into thrown errors so they hit the uniform code-span fallback
      // instead of silently producing degraded markup.
      return katex.renderToString(tex, { ...options, throwOnError: true, strict: 'error' });
    } catch {
      const display = options?.displayMode;
      const cls = display ? 'math-error math-error-block' : 'math-error';
      return `<code class="${cls}">${escapeHtml(tex)}</code>`;
    }
  },
} as typeof katex;

const md = new MarkdownIt({
  html: false, // sanitize: pasted raw HTML is escaped, never injected
  linkify: true,
  typographer: false,
  breaks: false,
  langPrefix: 'language-', // fenced code → <code class="language-xxx">
});

md.use(katexPlugin, {
  throwOnError: false,
  katex: safeKatex,
});

// Override both code renderers so fenced (```lang) AND indented code go through
// the same carded, syntax-highlighted treatment. code_block (indented) has no
// info string, so it renders as an unlabeled "code" card.
md.renderer.rules.fence = (tokens, idx) =>
  renderCodeBlock(tokens[idx].content, tokens[idx].info);
md.renderer.rules.code_block = (tokens, idx) =>
  renderCodeBlock(tokens[idx].content, '');

/**
 * Convert markdown (a pasted AI-chat answer) into print-ready HTML with static
 * KaTeX markup. Input is normalized first (see normalizeInput).
 */
export function markdownToHtml(input: string): string {
  const normalized = normalizeInput(input);
  return md.render(normalized);
}
