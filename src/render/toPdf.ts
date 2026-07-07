// [3] RENDER — expo-print wrapper. body HTML → saved PDF file URI.
// See docs/specs/0001-architecture-foundation.md §4–5.

import * as Print from 'expo-print';
import {
  EncodingType,
  getInfoAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';
import { buildDocument } from './template';
import { countPagesFromBase64 } from './pageCount';

// Above this file size we skip the parse and trust expo-print's count, rather
// than pull a huge PDF through a base64 round-trip in memory. Typical text PDFs
// are well under 1MB; this only guards pathological (image-heavy) documents.
const MAX_PARSE_BYTES = 20 * 1024 * 1024;

// A4 in PostScript points (72pt/in): 210mm×297mm ≈ 595×842pt.
//
// LOCKED FIX (spike/DEVICE-FINDINGS.md, spec 0001 §5): Android's print bridge
// IGNORES the CSS `@page { size: A4 }` rule and emits US Letter (612×792pt) at
// the device/locale default. Passing explicit width/height to printToFileAsync
// overrides both the CSS and the locale default, so the output is true A4.
// iOS honors the CSS size, but passing these is harmless there.
export const A4_WIDTH_PT = 595;
export const A4_HEIGHT_PT = 842;

/**
 * Result of a PDF render.
 * - `uri`: the expo-print cache file:// URI.
 * - `pageCount`: the TRUE page count, parsed from the produced PDF file (see
 *   pageCount.ts) — threaded into history metadata so Preview shows the real
 *   count (§1e). expo-print's `numberOfPages` is only a last-resort fallback:
 *   on Android it is computed against a pixel-scaled print viewport and can be
 *   wildly wrong (a real 17-page doc reported 282 on-device).
 * - `html`: the exact full document fed to expo-print, so the caller can persist
 *   it as the Preview snapshot (see HistoryDoc.htmlUri).
 */
export interface RenderResult {
  uri: string;
  pageCount: number;
  html: string;
}

/**
 * Render parsed body HTML to an on-device PDF file.
 *
 * Margins are NOT passed here: they come from `@page { margin: 20mm 18mm }` in
 * print.css. The spike proved Android WebView honors @page *margins* even
 * though it ignores @page *size* — so only the size needs the width/height
 * override above (spike/DEVICE-FINDINGS.md).
 */
export async function renderToPdf(bodyHtml: string): Promise<RenderResult> {
  const html = buildDocument(bodyHtml);
  const { uri, numberOfPages } = await Print.printToFileAsync({
    html,
    width: A4_WIDTH_PT,
    height: A4_HEIGHT_PT,
    base64: false,
  });
  return { uri, pageCount: await derivePageCount(uri, numberOfPages), html };
}

/**
 * Count the pages by parsing the produced PDF, falling back to expo-print's
 * `numberOfPages` if the file can't be read/parsed (or is too big to parse
 * safely). Never throws — a bad count must not break the render.
 */
async function derivePageCount(uri: string, numberOfPages: number): Promise<number> {
  try {
    const info = await getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number' && info.size > MAX_PARSE_BYTES) {
      return numberOfPages;
    }
    // Read as base64: deterministic for binary data (a raw UTF-8 read would
    // corrupt bytes and can drop the ASCII page-tree markers we scan for). We
    // read the whole file rather than a bounded window because the root
    // `/Type /Pages` object (whose `/Count` is authoritative) has no fixed
    // position — a windowed read could miss it and silently under/over-count.
    const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
    return countPagesFromBase64(base64, numberOfPages);
  } catch {
    return numberOfPages;
  }
}
