// [3] RENDER — robust PDF page counting.
//
// WHY THIS EXISTS (field bug, 2026-07-07): expo-print's `numberOfPages` is
// unreliable on Android — for a real 17-page document the phone reported 282.
// The value is computed against a pixel-scaled print viewport, NOT the true
// 595×842pt A4 page, so it balloons. The only trustworthy source is the PDF
// file expo-print actually produced. We parse the page count straight out of
// the PDF bytes and fall back to `numberOfPages` only when parsing fails.
//
// Parsing ladder (most→least authoritative):
//   1. The `/Count N` on the root `/Type /Pages` object. A PDF's page tree may
//      have intermediate `/Pages` nodes each with their own (partial) `/Count`;
//      the ROOT holds the total, which is the LARGEST such value. This is exact.
//   2. If no `/Count` is found (corrupt / unusual writer), count the leaf
//      `/Type /Page` objects (NOT `/Pages`).
//   3. If neither works, trust the caller's `numberOfPages`.
//
// This targets the classic, uncompressed object layout that Android's
// PdfDocument print path emits (`N 0 obj << … >> endobj`). If a producer buries
// the page tree inside a compressed object stream the structural scan yields
// nothing and we fall through the ladder — never a crash.

/** Largest `/Count` found on any `/Type /Pages` dictionary, or 0 if none. */
function maxPagesCount(pdf: string): number {
  let best = 0;

  // Primary: inspect each `N 0 obj … endobj` block and, for the ones that are
  // `/Type /Pages`, read their `/Count`. Scoping to the object block avoids
  // pairing a `/Count` with the wrong dictionary.
  const objRe = /\bobj\b([\s\S]*?)\bendobj\b/g;
  let m: RegExpExecArray | null;
  let sawObjBlocks = false;
  while ((m = objRe.exec(pdf)) !== null) {
    sawObjBlocks = true;
    const body = m[1];
    if (/\/Type\s*\/Pages\b/.test(body)) {
      const c = body.match(/\/Count\s+(\d+)/);
      if (c) best = Math.max(best, parseInt(c[1], 10));
    }
  }
  if (best > 0) return best;

  // Formatting fallback: some writers omit `endobj` or lay dicts out unusually.
  // `/Count` in a PDF is essentially only ever the page-tree count, so the
  // largest `/Count` anywhere is a safe proxy for the root total.
  if (!sawObjBlocks || best === 0) {
    const countRe = /\/Count\s+(\d+)/g;
    let cm: RegExpExecArray | null;
    while ((cm = countRe.exec(pdf)) !== null) {
      best = Math.max(best, parseInt(cm[1], 10));
    }
  }
  return best;
}

/** Number of leaf `/Type /Page` objects (excludes `/Type /Pages`). */
function countPageObjects(pdf: string): number {
  // `/Page` NOT followed by another letter/digit — so `/Pages` is excluded.
  const re = /\/Type\s*\/Page(?![a-zA-Z0-9])/g;
  let n = 0;
  while (re.exec(pdf) !== null) n += 1;
  return n;
}

/**
 * Derive the true page count from raw PDF bytes (as a binary/latin1 string).
 * Falls back to `fallback` (expo-print's numberOfPages) if the PDF can't be
 * parsed. Never throws.
 */
export function parsePdfPageCount(pdf: string, fallback: number): number {
  try {
    const byCount = maxPagesCount(pdf);
    if (byCount > 0) return byCount;

    const byLeaves = countPageObjects(pdf);
    if (byLeaves > 0) return byLeaves;
  } catch {
    // fall through to the caller's value
  }
  return fallback;
}

// ---------- base64 → binary string ----------
// expo-file-system reads the PDF as base64 (deterministic for binary data;
// a raw UTF-8 read would corrupt/merge bytes and can drop ASCII markers). We
// decode into a byte array, then a latin1 string, so the `/Count` / `/Page`
// markers become plain-text searchable. Uint8Array (not number[]) keeps peak
// memory ~1 byte/char rather than ~8, which matters for multi-MB PDFs.

const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const B64_LOOKUP: Int8Array = (() => {
  const t = new Int8Array(128).fill(-1);
  for (let i = 0; i < B64_ALPHABET.length; i += 1) {
    t[B64_ALPHABET.charCodeAt(i)] = i;
  }
  return t;
})();

/** Decode a base64 string (whitespace/padding tolerant) to a latin1 string. */
export function decodeBase64ToBinary(b64: string): string {
  // Strip anything that isn't a base64 alphabet char (newlines, `=` padding).
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = clean.length;
  const out = new Uint8Array(Math.floor((len * 3) / 4) + 3);
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const n0 = B64_LOOKUP[clean.charCodeAt(i)] ?? -1;
    const n1 = B64_LOOKUP[clean.charCodeAt(i + 1)] ?? -1;
    const n2 = i + 2 < len ? B64_LOOKUP[clean.charCodeAt(i + 2)] : -1;
    const n3 = i + 3 < len ? B64_LOOKUP[clean.charCodeAt(i + 3)] : -1;
    if (n0 < 0 || n1 < 0) break;
    out[o++] = (n0 << 2) | (n1 >> 4);
    if (n2 >= 0) out[o++] = ((n1 & 15) << 4) | (n2 >> 2);
    if (n3 >= 0) out[o++] = ((n2 & 3) << 6) | n3;
  }

  // Build the string in chunks — String.fromCharCode.apply on a huge array
  // blows the argument-count limit.
  let s = '';
  const CHUNK = 8192;
  for (let i = 0; i < o; i += CHUNK) {
    s += String.fromCharCode.apply(
      null,
      Array.from(out.subarray(i, Math.min(i + CHUNK, o))),
    );
  }
  return s;
}

/** Decode a base64 PDF then parse its page count (falls back to `fallback`). */
export function countPagesFromBase64(b64: string, fallback: number): number {
  try {
    return parsePdfPageCount(decodeBase64ToBinary(b64), fallback);
  } catch {
    return fallback;
  }
}
