// [3] RENDER — expo-print wrapper. body HTML → saved PDF file URI.
// See docs/specs/0001-architecture-foundation.md §4–5.

import * as Print from 'expo-print';
import { buildDocument } from './template';

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
 * - `pageCount`: expo-print's `numberOfPages` — threaded into history metadata
 *   so Preview can show the real page count (§1e), not a pre-render guess.
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
  return { uri, pageCount: numberOfPages, html };
}
