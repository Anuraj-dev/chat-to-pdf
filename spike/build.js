// Throwaway build script: pre-render KaTeX math + highlight.js code,
// inline KaTeX CSS with only-used woff2 fonts embedded as base64 data URIs,
// and emit a fully self-contained spike/sample.html (no network refs).
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const hljs = require('highlight.js');

const DIST = path.join(__dirname, 'node_modules', 'katex', 'dist');
const FONTS = path.join(DIST, 'fonts');

// ---- 1. Render math ------------------------------------------------------
const displayMatrix = katex.renderToString(
  String.raw`A^{-1} = \frac{1}{\det(A)}\begin{bmatrix} d & -b \\ -c & a \end{bmatrix}`,
  { displayMode: true, throwOnError: true }
);
const displayIntegral = katex.renderToString(
  String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi} \qquad \sum_{n=1}^{\infty}\frac{1}{n^2} = \frac{\pi^2}{6}`,
  { displayMode: true, throwOnError: true }
);
const inline1 = katex.renderToString(String.raw`\mathcal{O}(n \log n)`, { throwOnError: true });
const inline2 = katex.renderToString(String.raw`\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}`, { throwOnError: true });
const inline3 = katex.renderToString(String.raw`\alpha,\beta,\gamma \in \mathbb{R}`, { throwOnError: true });

// ---- 2. Render code (80+ lines) -----------------------------------------
const codeSource = fs.readFileSync(path.join(__dirname, 'code-sample.py'), 'utf8');
const highlighted = hljs.highlight(codeSource, { language: 'python' }).value;
// number the lines for realism
const codeHtml = highlighted;

// ---- 3. Inline KaTeX CSS, embedding only used woff2 fonts ----------------
let css = fs.readFileSync(path.join(DIST, 'katex.min.css'), 'utf8');

// Fonts our content actually needs (matrix, integral, sqrt, sums, greek,
// blackboard-bold, calligraphic, bold, italic). Keep the list tight to
// keep sample.html small for expo-print.
const USED = new Set([
  'KaTeX_Main-Regular', 'KaTeX_Main-Bold', 'KaTeX_Main-Italic',
  'KaTeX_Math-Italic', 'KaTeX_Math-BoldItalic',
  'KaTeX_Size1-Regular', 'KaTeX_Size2-Regular', 'KaTeX_Size3-Regular', 'KaTeX_Size4-Regular',
  'KaTeX_AMS-Regular',
  'KaTeX_Caligraphic-Regular',
  'KaTeX_Main-BoldItalic',
]);

function fontDataUri(name) {
  const file = path.join(FONTS, name + '.woff2');
  const b64 = fs.readFileSync(file).toString('base64');
  return `url(data:font/woff2;base64,${b64}) format("woff2")`;
}

// Rewrite every @font-face block: drop unused families, replace src with
// a single embedded woff2 data URI for used ones.
let dropped = 0, kept = 0;
css = css.replace(/@font-face\s*\{[^}]*\}/g, (block) => {
  const m = block.match(/font-family:\s*["']?(KaTeX_[A-Za-z]+)["']?/);
  if (!m) return block;
  const fam = m[1];
  // find the specific font file referenced (family + weight/style variant)
  const urlMatch = block.match(/url\(fonts\/([A-Za-z0-9_-]+)\.(?:woff2|woff|ttf)\)/);
  const fileBase = urlMatch ? urlMatch[1] : null;
  if (!fileBase || !USED.has(fileBase)) { dropped++; return ''; }
  kept++;
  const newSrc = `src:${fontDataUri(fileBase)}`;
  return block.replace(/src:[^;}]+/, newSrc);
});
console.error(`fonts embedded: ${kept}, font-faces dropped: ${dropped}`);

// ---- 4. hljs theme (inline a light theme, trimmed) -----------------------
const hljsCss = fs.readFileSync(
  path.join(__dirname, 'node_modules', 'highlight.js', 'styles', 'github.css'), 'utf8');

// ---- 5. Assemble the page -----------------------------------------------
const page = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8')
  .replace('/*__KATEX_CSS__*/', css)
  .replace('/*__HLJS_CSS__*/', hljsCss)
  .replace('<!--__DISPLAY_MATRIX__-->', displayMatrix)
  .replace('<!--__DISPLAY_INTEGRAL__-->', displayIntegral)
  .replace('<!--__INLINE1__-->', inline1)
  .replace('<!--__INLINE2__-->', inline2)
  .replace('<!--__INLINE3__-->', inline3)
  .replace('<!--__CODE__-->', codeHtml);

fs.writeFileSync(path.join(__dirname, 'sample.html'), page);
const kb = (fs.statSync(path.join(__dirname, 'sample.html')).size / 1024).toFixed(1);
console.error(`sample.html written: ${kb} KB`);
