import {
  buildDocument,
  markBreakableBlocks,
  DEFAULT_BREAKABLE_THRESHOLD,
  PRE_BREAKABLE_LINES,
  TABLE_BREAKABLE_ROWS,
} from '../template';
import { PRINT_CSS } from '../print.css';
import { markdownToHtml } from '../../parse';

describe('buildDocument — document skeleton', () => {
  const body = '<h1>Hello</h1><p>World</p>';
  const doc = buildDocument(body);

  it('emits a valid HTML5 document (DOCTYPE + lang + meta charset + viewport)', () => {
    expect(doc.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(doc).toContain('<html lang="en">');
    expect(doc).toContain('<meta charset="utf-8">');
    expect(doc).toContain('<meta name="viewport"');
  });

  it('inlines the print stylesheet', () => {
    expect(doc).toContain(PRINT_CSS);
    expect(doc).toContain('@page');
  });

  it('inlines KaTeX CSS with base64-embedded woff2 fonts', () => {
    expect(doc).toContain('data:font/woff2;base64,');
    // full font set embedded (spike gotcha #2) — not the 12-family subset
    expect(doc).toContain('KaTeX_Fraktur');
    expect(doc).toContain('KaTeX_Script');
    expect(doc).toContain('KaTeX_Typewriter');
  });

  it('embeds the body html inside a .doc prose container', () => {
    expect(doc).toContain('<main class="doc">');
    expect(doc).toContain(body);
  });

  it('escapes the title', () => {
    const d = buildDocument('<p>x</p>', { title: '<script>&"x"' });
    expect(d).toContain('<title>&lt;script&gt;&amp;&quot;x&quot;</title>');
  });

  it('carries real parsed markdown (math + code) through unchanged', () => {
    const parsed = markdownToHtml('# T\n\nInline $x^2$.\n\n```py\nprint(1)\n```\n');
    const out = buildDocument(parsed);
    expect(out).toContain(parsed);
    expect(out).toContain('katex'); // static KaTeX markup survived
  });
});

describe('markBreakableBlocks — size-based break heuristic (issue #10)', () => {
  it('leaves a short <pre> block whole (no breakable class)', () => {
    const short = '<pre><code>print(1)</code></pre>';
    expect(markBreakableBlocks(short)).toBe(short);
  });

  it('marks a long <pre> block breakable', () => {
    const long = `<pre><code>${'x'.repeat(DEFAULT_BREAKABLE_THRESHOLD + 100)}</code></pre>`;
    const out = markBreakableBlocks(long);
    expect(out).toContain('<pre class="breakable">');
  });

  it('marks a long <table> breakable', () => {
    const rows = '<tr><td>cell</td></tr>'.repeat(200);
    const long = `<table><tbody>${rows}</tbody></table>`;
    const out = markBreakableBlocks(long);
    expect(out).toMatch(/<table class="breakable">/);
  });

  it('merges into an existing class attribute without duplicating', () => {
    const long = `<pre class="language-python"><code>${'y'.repeat(2000)}</code></pre>`;
    const out = markBreakableBlocks(long);
    expect(out).toContain('class="language-python breakable"');
    // idempotent
    expect(markBreakableBlocks(out)).toContain('class="language-python breakable"');
    expect((out.match(/breakable/g) || []).length).toBe(1);
  });

  it('respects a custom threshold', () => {
    const block = '<pre><code>hello world</code></pre>';
    expect(markBreakableBlocks(block, 5)).toContain('<pre class="breakable">');
  });

  it('preserves block content exactly when marking', () => {
    const inner = 'z'.repeat(2000);
    const out = markBreakableBlocks(`<pre><code>${inner}</code></pre>`);
    expect(out).toContain(`<code>${inner}</code></pre>`);
  });

  // -- height-proxy correctness: line/row counts, not just char length --

  it('exports sane line/row thresholds', () => {
    expect(PRE_BREAKABLE_LINES).toBeGreaterThan(0);
    expect(TABLE_BREAKABLE_ROWS).toBeGreaterThan(0);
  });

  it('marks a 60-line pre of SHORT lines breakable (char count alone would miss it)', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `x=${i}`).join('\n');
    const html = `<pre><code>${lines}</code></pre>`;
    expect(html.length).toBeLessThan(DEFAULT_BREAKABLE_THRESHOLD); // the trap
    expect(markBreakableBlocks(html)).toContain('<pre class="breakable">');
  });

  it('leaves a 10-line pre whole', () => {
    const lines = Array.from({ length: 10 }, (_, i) => `x=${i}`).join('\n');
    const html = `<pre><code>${lines}</code></pre>`;
    expect(markBreakableBlocks(html)).toBe(html);
  });

  it('marks a 30-short-row table breakable via row count', () => {
    const rows = Array.from({ length: 30 }, () => '<tr><td>a</td></tr>').join('');
    const html = `<table><tbody>${rows}</tbody></table>`;
    expect(markBreakableBlocks(html)).toContain('<table class="breakable">');
  });

  it('leaves a 10-row table whole', () => {
    const rows = Array.from({ length: 10 }, () => '<tr><td>a</td></tr>').join('');
    const html = `<table><tbody>${rows}</tbody></table>`;
    expect(markBreakableBlocks(html)).toBe(html);
  });
});

describe('parse → render integration: breakable heuristic on real markdownToHtml output', () => {
  it('a 60-line short-token fenced code block gets class="breakable"', () => {
    const code = Array.from({ length: 60 }, (_, i) => `x=${i}`).join('\n');
    const parsed = markdownToHtml('```py\n' + code + '\n```\n');
    const doc = buildDocument(parsed);
    expect(doc).toMatch(/<pre[^>]*class="[^"]*\bbreakable\b[^"]*"/);
  });

  it('a 30-row markdown table gets class="breakable"', () => {
    const header = '| a | b |\n|---|---|\n';
    const rows = Array.from({ length: 30 }, (_, i) => `| ${i} | y |`).join('\n');
    const parsed = markdownToHtml(header + rows + '\n');
    const doc = buildDocument(parsed);
    expect(doc).toMatch(/<table[^>]*class="[^"]*\bbreakable\b[^"]*"/);
  });

  it('a 10-line fenced code block stays non-breakable', () => {
    const code = Array.from({ length: 10 }, (_, i) => `x=${i}`).join('\n');
    const parsed = markdownToHtml('```py\n' + code + '\n```\n');
    const doc = buildDocument(parsed);
    expect(doc).not.toMatch(/<pre[^>]*breakable/);
  });
});
