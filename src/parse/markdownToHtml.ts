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
import { normalizeInput } from './normalize';

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

/**
 * Convert markdown (a pasted AI-chat answer) into print-ready HTML with static
 * KaTeX markup. Input is normalized first (see normalizeInput).
 */
export function markdownToHtml(input: string): string {
  const normalized = normalizeInput(input);
  return md.render(normalized);
}
