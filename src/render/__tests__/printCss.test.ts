import { PRINT_CSS } from '../print.css';

// These tests gate the PDF print stylesheet against DRIFT, not against a frozen
// spec. They were rewritten on 2026-07-07 to lock the ChatGPT-parity REDESIGN
// (modern sans, wide measure, tight code, bordered callouts, centred title).
describe('print.css — load-bearing rules (ChatGPT-parity redesign quality gate)', () => {
  it('sets A4 page with 18mm/16mm margins', () => {
    expect(PRINT_CSS).toMatch(/@page\s*\{\s*size:\s*A4;\s*margin:\s*18mm\s+16mm;/);
  });

  it('uses a modern system sans body font stack (not serif)', () => {
    const body = PRINT_CSS.match(/body\s*\{[^}]*\}/);
    expect(body).not.toBeNull();
    expect(body![0]).toMatch(/font-family:\s*-apple-system,\s*system-ui,\s*"Roboto"/);
    // The old Georgia serif body font-family must be gone.
    const fontFamily = body![0].match(/font-family:[^;]*/)![0];
    expect(fontFamily).not.toMatch(/Georgia/);
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

  it('keeps short code cards whole but lets .breakable ones split', () => {
    // The break decision lives on the .codeblock WRAPPER (the inner <pre> can't
    // express "keep header+body together but allow tall bodies to split").
    expect(PRINT_CSS).toMatch(/\.codeblock\s*\{[^}]*page-break-inside:\s*avoid/);
    expect(PRINT_CSS).toMatch(/\.codeblock\.breakable\s*\{[^}]*page-break-inside:\s*auto/);
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

  it('gives blockquotes an accent left border (callout, not plain indent)', () => {
    expect(PRINT_CSS).toMatch(/blockquote\s*\{[^}]*border-left:\s*3pt\s+solid/);
  });

  it('implements the redesigned type scale (h1 25 / h2 16 / h3 13 / h4 11)', () => {
    expect(PRINT_CSS).toMatch(/h1\s*\{\s*font-size:\s*25pt/);
    expect(PRINT_CSS).toMatch(/h2\s*\{\s*font-size:\s*16pt/);
    expect(PRINT_CSS).toMatch(/h3\s*\{\s*font-size:\s*13pt/);
    expect(PRINT_CSS).toMatch(/h4\s*\{\s*font-size:\s*11pt/);
  });

  it('centers the document title (h1)', () => {
    expect(PRINT_CSS).toMatch(/h1\s*\{[^}]*text-align:\s*center/);
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

  // ---- measure / prose column: WIDE (near full content width), not the old
  //      narrow serif column that left a lopsided dead zone ----
  it('uses a wide em-relative measure that nearly fills the content box (≈44em)', () => {
    const doc = PRINT_CSS.match(/\.doc\s*\{[^}]*\}/);
    expect(doc).not.toBeNull();
    const m = doc![0].match(/max-width:\s*(\d+(?:\.\d+)?)em/);
    expect(m).not.toBeNull();
    const em = parseFloat(m![1]);
    // Deliberately wide (ChatGPT parity) — the old 34em cap is gone. Keep a
    // cap so the column never runs edge-to-edge beyond the content box.
    expect(em).toBeGreaterThanOrEqual(42);
    expect(em).toBeLessThanOrEqual(46);
  });

  it('centers the prose column with margin auto (not pinned left)', () => {
    const doc = PRINT_CSS.match(/\.doc\s*\{[^}]*\}/);
    expect(doc).not.toBeNull();
    expect(doc![0]).toMatch(/margin-left:\s*auto/);
    expect(doc![0]).toMatch(/margin-right:\s*auto/);
  });

  it('keeps prose text left-aligned / ragged-right — never justified (rivers)', () => {
    const doc = PRINT_CSS.match(/\.doc\s*\{[^}]*\}/);
    expect(doc![0]).toMatch(/text-align:\s*left/);
    expect(PRINT_CSS).not.toMatch(/text-align:\s*justify/);
  });

  it('keeps block content from overflowing the column (tables/code/img/math 100%)', () => {
    expect(PRINT_CSS).toMatch(/table\s*\{[^}]*width:\s*100%/);
    expect(PRINT_CSS).toMatch(/img\s*\{[^}]*max-width:\s*100%/);
    expect(PRINT_CSS).toMatch(/\.katex-display\s*\{[^}]*max-width:\s*100%/);
  });

  // ---- body typography: sans, 10.5pt, lh 1.5 ----
  it('sets the body size at 10.5pt with the roomier sans line-height 1.5', () => {
    const body = PRINT_CSS.match(/body\s*\{[^}]*\}/);
    expect(body).not.toBeNull();
    const size = parseFloat(body![0].match(/font-size:\s*(\d+(?:\.\d+)?)pt/)![1]);
    expect(size).toBeGreaterThanOrEqual(10);
    expect(size).toBeLessThanOrEqual(11);
    expect(body![0]).toMatch(/line-height:\s*1\.5\b/);
  });

  // ---- full type scale: line-heights + vertical rhythm margins ----
  it('locks the type-scale line-heights (h1 1.2 / h2 1.3 / h3 1.35)', () => {
    expect(PRINT_CSS).toMatch(/h1\s*\{[^}]*line-height:\s*1\.2\b/);
    expect(PRINT_CSS).toMatch(/h2\s*\{[^}]*line-height:\s*1\.3\b/);
    expect(PRINT_CSS).toMatch(/h3\s*\{[^}]*line-height:\s*1\.35/);
  });

  it('locks the type-scale spacing (h1 mb22 / h2 mt24 mb8 / h3 mt16 mb6 / h4 mt12 mb4 / p mb9)', () => {
    expect(PRINT_CSS).toMatch(/h1\s*\{[^}]*margin:\s*0 0 22pt/);
    expect(PRINT_CSS).toMatch(/h2\s*\{[^}]*margin:\s*24pt 0 8pt/);
    expect(PRINT_CSS).toMatch(/h3\s*\{[^}]*margin:\s*16pt 0 6pt/);
    expect(PRINT_CSS).toMatch(/h4\s*\{[^}]*margin:\s*12pt 0 4pt/);
    expect(PRINT_CSS).toMatch(/(^|[^-])p\s*\{[^}]*margin:\s*0 0 9pt/m);
  });

  it('makes headings bold weight 700 (not inherited from the reset)', () => {
    expect(PRINT_CSS).toMatch(/h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*font-weight:\s*700/);
  });

  it('uses the same sans stack for headings and body (unified, modern)', () => {
    expect(PRINT_CSS).toMatch(/h1,\s*h2,\s*h3,\s*h4\s*\{[^}]*font-family:\s*-apple-system[^}]*sans-serif/);
  });

  // ---- break-craft selector coverage ----
  it('lists li, blockquote and figure (not just headings/rows) in break-inside:avoid', () => {
    expect(PRINT_CSS).toMatch(
      /h1,\s*h2,\s*h3,\s*h4,\s*thead,\s*tr,\s*li,\s*blockquote,\s*figure\s*\{[^}]*break-inside:\s*avoid/,
    );
  });

  // ---- code cards: carded block, ~8.5pt JetBrains Mono body on a light fill ----
  it('sets the code body mono ~8.5pt on a light card fill', () => {
    const codeBody = PRINT_CSS.match(/\.codeblock-body code\s*\{[^}]*\}/);
    expect(codeBody).not.toBeNull();
    const size = parseFloat(codeBody![0].match(/font-size:\s*(\d+(?:\.\d+)?)pt/)![1]);
    expect(size).toBeGreaterThanOrEqual(8);
    expect(size).toBeLessThanOrEqual(9);
    expect(PRINT_CSS).toMatch(/\.codeblock-body\s*\{[^}]*background:\s*#f8f9fb/);
  });

  it('puts JetBrains Mono first in the shared mono stack, with a monospace fallback', () => {
    const mono = PRINT_CSS.match(/pre code, code\s*\{[^}]*\}/);
    expect(mono).not.toBeNull();
    expect(mono![0]).toMatch(/"JetBrains Mono"/);
    expect(mono![0]).toMatch(/monospace/);
  });

  it('disables code ligatures (a combined != or => glyph reads as a typo)', () => {
    const mono = PRINT_CSS.match(/pre code, code\s*\{[^}]*\}/);
    expect(mono![0]).toMatch(/font-variant-ligatures:\s*none/);
  });

  it('renders the code card as a bordered rounded block that clips its header', () => {
    const card = PRINT_CSS.match(/\.codeblock\s*\{[^}]*\}/);
    expect(card).not.toBeNull();
    expect(card![0]).toMatch(/border:\s*0\.75pt\s+solid/);
    expect(card![0]).toMatch(/border-radius:/);
    expect(card![0]).toMatch(/overflow:\s*hidden/);
  });

  it('lays the code header bar out with display:table (never flex/grid)', () => {
    expect(PRINT_CSS).toMatch(/\.codeblock-head\s*\{[^}]*display:\s*table\b/);
  });

  it('uses uniform mid-gray code dots — NOT semantic red/yellow/green', () => {
    const dots = PRINT_CSS.match(/\.codeblock-dots i\s*\{[^}]*\}/);
    expect(dots).not.toBeNull();
    // A single flat gray fill: grayscale-safe, no false status signal.
    expect(dots![0]).toMatch(/background:\s*#c8ccd1/);
    expect(dots![0]).not.toMatch(/#e?[0-9a-f]*(red|green)/i);
  });

  it('renders inline code as a hairline-bordered chip, not a full block', () => {
    const chip = PRINT_CSS.match(/:not\(pre\)\s*>\s*code\s*\{[^}]*\}/);
    expect(chip).not.toBeNull();
    expect(chip![0]).toMatch(/background:/);
    expect(chip![0]).toMatch(/border:\s*0\.5pt\s+solid/);
  });

  // ---- syntax highlighting: grayscale-safe (weight/italic carry meaning) ----
  it('keeps the syntax theme grayscale-safe: comments italic, keywords bold', () => {
    expect(PRINT_CSS).toMatch(/\.hljs-comment[^{]*\{[^}]*font-style:\s*italic/);
    expect(PRINT_CSS).toMatch(/\.hljs-keyword[^{]*\{[^}]*font-weight:\s*700/);
  });

  // ---- tables: sans header font + tinted header row ----
  it('uses a sans font for tables and tints the header row', () => {
    expect(PRINT_CSS).toMatch(/table\s*\{[^}]*font-family:\s*-apple-system[^}]*sans-serif/);
    expect(PRINT_CSS).toMatch(/th\s*\{[^}]*background:/);
  });

  // ---- blockquotes / callouts: finished bordered box (full border + tint) ----
  it('gives blockquotes a full border, tint and padding (bordered callout box)', () => {
    const bq = PRINT_CSS.match(/blockquote\s*\{[^}]*\}/);
    expect(bq).not.toBeNull();
    expect(bq![0]).toMatch(/border:\s*0\.75pt\s+solid/);
    expect(bq![0]).toMatch(/background:/);
    expect(bq![0]).toMatch(/padding:\s*9pt/);
  });

  // ---- horizontal rule: thin + generous, sparing ----
  it('draws a thin 0.5pt hr with generous 20pt vertical margins', () => {
    const hr = PRINT_CSS.match(/hr\s*\{[^}]*\}/);
    expect(hr).not.toBeNull();
    expect(hr![0]).toMatch(/border-top:\s*0\.5pt\s+solid/);
    const mt = parseFloat(hr![0].match(/margin:\s*(\d+(?:\.\d+)?)pt/)![1]);
    expect(mt).toBeGreaterThanOrEqual(18);
    expect(mt).toBeLessThanOrEqual(22);
  });

  // ---- images never overflow the page ----
  it('constrains images to the content width', () => {
    expect(PRINT_CSS).toMatch(/img\s*\{[^}]*max-width:\s*100%/);
  });
});
