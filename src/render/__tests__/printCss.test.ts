import { PRINT_CSS } from '../print.css';

describe('print.css — load-bearing rules (issue #10 quality gate)', () => {
  it('sets A4 page with 20mm/18mm margins', () => {
    expect(PRINT_CSS).toMatch(/@page\s*\{\s*size:\s*A4;\s*margin:\s*20mm\s+18mm;/);
  });

  it('uses the serif body font stack (Georgia/Noto Serif/serif)', () => {
    expect(PRINT_CSS).toMatch(/font-family:\s*Georgia,\s*"Noto Serif",\s*serif/);
  });

  it('body is display:block, never flex/grid', () => {
    expect(PRINT_CSS).toMatch(/body\s*\{[^}]*display:\s*block/);
    expect(PRINT_CSS).not.toMatch(/display:\s*flex/);
    expect(PRINT_CSS).not.toMatch(/display:\s*grid/);
  });

  it('writes BOTH legacy page-break-* and modern break-* forms', () => {
    expect(PRINT_CSS).toContain('page-break-inside: avoid');
    expect(PRINT_CSS).toContain('break-inside: avoid');
    expect(PRINT_CSS).toContain('page-break-after: avoid');
    expect(PRINT_CSS).toContain('break-after: avoid');
  });

  it('protects table rows and thead from splitting; header repeats across pages', () => {
    expect(PRINT_CSS).toMatch(/tr\s*\{[^}]*page-break-inside:\s*avoid/);
    expect(PRINT_CSS).toMatch(/thead\s*\{[^}]*display:\s*table-header-group/);
  });

  it('keeps short pre blocks whole but lets .breakable ones split', () => {
    expect(PRINT_CSS).toMatch(/pre\s*\{[^}]*page-break-inside:\s*avoid/);
    expect(PRINT_CSS).toMatch(/pre\.breakable\s*\{[^}]*page-break-inside:\s*auto/);
    expect(PRINT_CSS).toMatch(/table\.breakable\s*\{[^}]*page-break-inside:\s*auto/);
  });

  it('wraps long code lines (pre-wrap) instead of clipping at the right margin', () => {
    expect(PRINT_CSS).toMatch(/white-space:\s*pre-wrap/);
    expect(PRINT_CSS).toMatch(/word-break:\s*break-word/);
  });

  it('keeps headings with following content (break-after avoid)', () => {
    expect(PRINT_CSS).toMatch(/h1,\s*h2,\s*h3,\s*h4\s*\{\s*break-after:\s*avoid;\s*page-break-after:\s*avoid/);
  });

  it('sets orphans/widows on paragraphs', () => {
    expect(PRINT_CSS).toMatch(/p\s*\{[^}]*orphans:\s*3[^}]*widows:\s*3/);
  });

  it('gives blockquotes an accent left border + tint (not just indent)', () => {
    expect(PRINT_CSS).toMatch(/blockquote\s*\{[^}]*border-left:\s*3pt\s+solid/);
  });

  it('implements the issue #10 type scale (h1 22 / h2 17 / h3 13.5 / h4 11.5)', () => {
    expect(PRINT_CSS).toMatch(/h1\s*\{\s*font-size:\s*22pt/);
    expect(PRINT_CSS).toMatch(/h2\s*\{\s*font-size:\s*17pt/);
    expect(PRINT_CSS).toMatch(/h3\s*\{\s*font-size:\s*13\.5pt/);
    expect(PRINT_CSS).toMatch(/h4\s*\{\s*font-size:\s*11\.5pt/);
  });

  it('does NOT clip wide display equations (issue #10 defect #4: silent truncation is data loss)', () => {
    const katexDisplayBlock = PRINT_CSS.match(/\.katex-display\s*\{[^}]*\}/);
    expect(katexDisplayBlock).not.toBeNull();
    expect(katexDisplayBlock![0]).not.toMatch(/overflow:\s*hidden/);
    expect(katexDisplayBlock![0]).toMatch(/max-width:\s*100%/);
  });

  it('collapses table borders at 0.5pt', () => {
    expect(PRINT_CSS).toMatch(/border-collapse:\s*collapse/);
    expect(PRINT_CSS).toMatch(/border:\s*0\.5pt\s+solid/);
  });
});
