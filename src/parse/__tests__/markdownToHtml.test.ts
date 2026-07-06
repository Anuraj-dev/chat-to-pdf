// Tests for markdownToHtml — issue #4. Assert on HTML STRUCTURE, not KaTeX internals.

import { markdownToHtml } from '../markdownToHtml';

describe('markdownToHtml — core markdown', () => {
  it('renders headings', () => {
    expect(markdownToHtml('# Hello')).toContain('<h1>Hello</h1>');
  });

  it('renders bold and italic', () => {
    const html = markdownToHtml('**bold** and *italic*');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders unordered and ordered lists', () => {
    expect(markdownToHtml('- a\n- b')).toContain('<ul>');
    expect(markdownToHtml('1. a\n2. b')).toContain('<ol>');
  });

  it('renders links', () => {
    expect(markdownToHtml('[x](https://example.com)')).toContain('href="https://example.com"');
  });

  it('renders blockquotes', () => {
    expect(markdownToHtml('> quoted')).toContain('<blockquote>');
  });

  it('renders GFM tables', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = markdownToHtml(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('renders fenced code with a language class', () => {
    const md = '```python\nprint("hi")\n```';
    const html = markdownToHtml(md);
    expect(html).toContain('<pre>');
    expect(html).toContain('class="language-python"');
    expect(html).toContain('print');
  });
});

describe('markdownToHtml — safety / sanitization', () => {
  it('escapes raw HTML in input (html:false)', () => {
    const html = markdownToHtml('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('does not throw on malformed math and does not leak $$ into output', () => {
    const md = 'broken $$\\frac{1}{$$ math';
    let html = '';
    expect(() => { html = markdownToHtml(md); }).not.toThrow();
    expect(html).not.toContain('$$');
  });

  it('falls back to a code span (not a thrown error) on invalid LaTeX', () => {
    const html = markdownToHtml('$\\undefinedcmd{x}$');
    expect(() => markdownToHtml('$\\undefinedcmd{x}$')).not.toThrow();
    // Either a katex render or our math-error code-span fallback, never raw delimiters.
    expect(html).not.toMatch(/(^|[^$])\$([^$]|$)/);
  });

  it('renders invalid math via the math-error code-span fallback (proves the fallback ran)', () => {
    const html = markdownToHtml('$\\undefinedcmd{x}$');
    expect(html).toContain('class="math-error"');
    expect(html).toContain('\\undefinedcmd{x}');
  });

  it('routes KaTeX strict-mode violations through the same fallback (strict: error)', () => {
    // \htmlClass is a strict/trust violation: by default it warns instead of throwing,
    // bypassing the fallback unless strict is escalated to 'error'.
    let html = '';
    expect(() => { html = markdownToHtml('$\\htmlClass{cls}{x}$'); }).not.toThrow();
    expect(html).toContain('class="math-error"');
    expect(html).toContain('\\htmlClass{cls}{x}');
  });

  it('does not rewrite \\$ or \\( \\) inside code and does not turn prose prices into math', () => {
    const md = [
      'This costs \\$5 and \\$10 in total.',
      '',
      'Use `echo \\$HOME` or:',
      '',
      '```bash',
      'echo \\$HOME \\(literal\\) \\[array\\]',
      '```',
    ].join('\n');
    const html = markdownToHtml(md);
    expect(html).not.toContain('class="katex"'); // no math anywhere in this input
    expect(html).toContain('$5');                // prose price survives as plain text
    expect(html).toContain('\\$HOME');           // code keeps the backslash escape
    expect(html).toContain('\\(literal\\)');     // \( \) in code not converted to $
    expect(html).toContain('\\[array\\]');       // \[ \] in code not converted to $$
  });
});

describe('markdownToHtml — KaTeX math', () => {
  it('renders inline math to KaTeX markup', () => {
    const html = markdownToHtml('Energy is $E = mc^2$ today.');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('$E = mc^2$');
  });

  it('renders block math to KaTeX markup', () => {
    const html = markdownToHtml('$$\\int_0^1 x\\,dx$$');
    expect(html).toContain('katex');
    expect(html).not.toContain('$$');
  });

  it('renders a matrix / aligned environment', () => {
    const md = '$$\\begin{matrix} a & b \\\\ c & d \\end{matrix}$$';
    const html = markdownToHtml(md);
    expect(html).toContain('katex');
    // KaTeX renders the matrix to an mtable; delimiters must not leak as literal $$.
    expect(html).toContain('mtable');
    expect(html).not.toContain('$$');
  });

  it('accepts \\( \\) and \\[ \\] delimiters via normalization', () => {
    const html = markdownToHtml('inline \\(x^2\\) and block \\[y^2\\]');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('\\(');
    expect(html).not.toContain('\\[');
  });
});

describe('markdownToHtml — representative AI answers', () => {
  it('math-heavy answer (inline + block + aligned env)', () => {
    const md = [
      '# Solving the Integral',
      '',
      'We know that $f(x) = x^2$, so the area is:',
      '',
      '$$\\int_0^1 x^2 \\, dx = \\frac{1}{3}$$',
      '',
      'In matrix form:',
      '',
      '$$\\begin{aligned} a &= 1 \\\\ b &= 2 \\end{aligned}$$',
    ].join('\n');
    const html = markdownToHtml(md);
    expect(html).toContain('<h1>Solving the Integral</h1>');
    expect(html).toContain('class="katex"');
    expect(html).toContain('class="katex-block"');
    // Delimiters consumed; KaTeX keeps the TeX source only inside a MathML annotation.
    expect(html).not.toContain('$$');
    expect(html).toContain('<annotation encoding="application/x-tex">');
  });

  it('code-heavy answer: nested ``` inside a four-tilde wrapper with language tags', () => {
    const md = [
      '~~~~',
      'Here are two snippets.',
      '',
      '```python',
      'def add(a, b):',
      '    return a + b',
      '```',
      '',
      '```javascript',
      'const x = 1;',
      '```',
      '~~~~',
    ].join('\n');
    const html = markdownToHtml(md);
    expect(html).toContain('class="language-python"');
    expect(html).toContain('class="language-javascript"');
    expect(html).toContain('def add');
    // The outer four-tilde wrapper must be consumed, not rendered as a code block.
    expect(html).not.toContain('~~~~');
  });

  it('table answer', () => {
    const md = [
      '## Comparison',
      '',
      '| Feature | A | B |',
      '|---------|---|---|',
      '| Speed   | Fast | Slow |',
      '| Cost    | $10 | $20 |',
    ].join('\n');
    const html = markdownToHtml(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>Feature</th>');
    expect(html).toContain('Fast');
  });

  it('mixed long answer (headings + list + code + math + table + quote)', () => {
    const md = [
      '# Report',
      '',
      'Key points:',
      '- Uses $O(n \\log n)$ time',
      '- Simple to implement',
      '',
      '> Note: this is important.',
      '',
      '```python',
      'sorted(xs)',
      '```',
      '',
      '| n | ops |',
      '|---|-----|',
      '| 8 | 24  |',
      '',
      'Final: $$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$',
    ].join('\n');
    const html = markdownToHtml(md);
    expect(html).toContain('<h1>Report</h1>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('class="language-python"');
    expect(html).toContain('<table>');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('$$');
  });

  it('ChatGPT \\$-escaped math answer round-trips through normalization', () => {
    const md = 'The formula \\$E = mc^2\\$ is famous.';
    const html = markdownToHtml(md);
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('\\$');
  });
});
