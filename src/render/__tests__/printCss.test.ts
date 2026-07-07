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

  // ---- measure / prose column (issue #10 defect #7) ----
  it('caps the prose measure with an em-relative max-width in the 66–75 char band (≈34em)', () => {
    const doc = PRINT_CSS.match(/\.doc\s*\{[^}]*\}/);
    expect(doc).not.toBeNull();
    const m = doc![0].match(/max-width:\s*(\d+(?:\.\d+)?)em/);
    expect(m).not.toBeNull();
    const em = parseFloat(m![1]);
    // Georgia ≈ 0.48em/char → keep the column within ~66–75 chars (≈31–36em),
    // never the full page width. 40em (~83 chars) would breach spec defect #7.
    expect(em).toBeGreaterThanOrEqual(31);
    expect(em).toBeLessThanOrEqual(36);
  });

  // ---- body typography (issue #10: serif, 10.5–11pt, lh 1.45) ----
  it('sets the body size inside the 10.5–11pt band with line-height 1.45', () => {
    const body = PRINT_CSS.match(/body\s*\{[^}]*\}/);
    expect(body).not.toBeNull();
    const size = parseFloat(body![0].match(/font-size:\s*(\d+(?:\.\d+)?)pt/)![1]);
    expect(size).toBeGreaterThanOrEqual(10.5);
    expect(size).toBeLessThanOrEqual(11);
    expect(body![0]).toMatch(/line-height:\s*1\.45/);
  });

  // ---- full type scale: line-heights + vertical rhythm margins ----
  it('locks the type-scale line-heights (h1 1.25 / h2 1.3 / h3 1.35)', () => {
    expect(PRINT_CSS).toMatch(/h1\s*\{[^}]*line-height:\s*1\.25/);
    expect(PRINT_CSS).toMatch(/h2\s*\{[^}]*line-height:\s*1\.3\b/);
    expect(PRINT_CSS).toMatch(/h3\s*\{[^}]*line-height:\s*1\.35/);
  });

  it('locks the type-scale spacing (h1 mb10 / h2 mt22 mb8 / h3 mt16 mb6 / h4 mt12 mb4 / p mb8)', () => {
    expect(PRINT_CSS).toMatch(/h1\s*\{[^}]*margin:\s*0 0 10pt/);
    expect(PRINT_CSS).toMatch(/h2\s*\{[^}]*margin:\s*22pt 0 8pt/);
    expect(PRINT_CSS).toMatch(/h3\s*\{[^}]*margin:\s*16pt 0 6pt/);
    expect(PRINT_CSS).toMatch(/h4\s*\{[^}]*margin:\s*12pt 0 4pt/);
    expect(PRINT_CSS).toMatch(/(^|[^-])p\s*\{[^}]*margin:\s*0 0 8pt/m);
  });

  it('makes h4 bold (weight not inherited from the reset)', () => {
    expect(PRINT_CSS).toMatch(/h4\s*\{[^}]*font-weight:\s*bold/);
  });

  it('uses a sans stack for headings, distinct from the serif body', () => {
    expect(PRINT_CSS).toMatch(/h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*font-family:[^}]*Roboto[^}]*sans-serif/);
  });

  // ---- break-craft selector coverage (issue #10) ----
  it('lists li, blockquote and figure (not just headings/rows) in break-inside:avoid', () => {
    expect(PRINT_CSS).toMatch(
      /h1,\s*h2,\s*h3,\s*h4,\s*thead,\s*tr,\s*li,\s*blockquote,\s*figure\s*\{[^}]*break-inside:\s*avoid/,
    );
  });

  // ---- code blocks (issue #10: 9.5–10pt mono, lh 1.4, gray bg) ----
  it('sets code mono in the 9.5–10pt band at line-height 1.4 on a light bg', () => {
    const code = PRINT_CSS.match(/pre code, code\s*\{[^}]*\}/);
    expect(code).not.toBeNull();
    const size = parseFloat(code![0].match(/font-size:\s*(\d+(?:\.\d+)?)pt/)![1]);
    expect(size).toBeGreaterThanOrEqual(9.5);
    expect(size).toBeLessThanOrEqual(10);
    expect(code![0]).toMatch(/line-height:\s*1\.4\b/);
    expect(PRINT_CSS).toMatch(/pre\s*\{[^}]*background:\s*#f6f8fa/);
    expect(code![0]).toMatch(/font-family:[^}]*monospace/);
  });

  it('renders inline code as a tinted chip, not a full block', () => {
    expect(PRINT_CSS).toMatch(/:not\(pre\)\s*>\s*code\s*\{[^}]*background:/);
  });

  // ---- tables: sans header font + tinted header row (issue #10) ----
  it('uses a sans font for tables and tints the header row', () => {
    expect(PRINT_CSS).toMatch(/table\s*\{[^}]*font-family:[^}]*Roboto[^}]*sans-serif/);
    expect(PRINT_CSS).toMatch(/th\s*\{[^}]*background:/);
  });

  // ---- blockquotes / callouts: tint + padding, not just border ----
  it('gives blockquotes a subtle tint and padding (callout, not plain indent)', () => {
    const bq = PRINT_CSS.match(/blockquote\s*\{[^}]*\}/);
    expect(bq).not.toBeNull();
    expect(bq![0]).toMatch(/background:/);
    expect(bq![0]).toMatch(/padding:\s*8pt/);
  });

  // ---- horizontal rule: thin + generous, sparing (issue #10) ----
  it('draws a thin 0.5pt hr with 16–20pt vertical margins', () => {
    const hr = PRINT_CSS.match(/hr\s*\{[^}]*\}/);
    expect(hr).not.toBeNull();
    expect(hr![0]).toMatch(/border-top:\s*0\.5pt\s+solid/);
    const mt = parseFloat(hr![0].match(/margin:\s*(\d+(?:\.\d+)?)pt/)![1]);
    expect(mt).toBeGreaterThanOrEqual(16);
    expect(mt).toBeLessThanOrEqual(20);
  });

  // ---- images never overflow the page (issue #10 defect #4) ----
  it('constrains images to the content width', () => {
    expect(PRINT_CSS).toMatch(/img\s*\{[^}]*max-width:\s*100%/);
  });
});
