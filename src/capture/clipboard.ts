// [1] CAPTURE — thin wrapper over expo-clipboard reads.
// See docs/specs/0001-architecture-foundation.md §4. Issue #6.

import * as Clipboard from 'expo-clipboard';

/**
 * Read the clipboard's plain-text contents.
 *
 * Returns `null` when the clipboard is empty, holds only whitespace, or the read
 * is denied/fails — so callers get a single "nothing usable" signal instead of
 * having to distinguish empty string from error.
 */
export async function readClipboard(): Promise<string | null> {
  try {
    const text = await Clipboard.getStringAsync();
    if (!text || text.trim() === '') return null;
    return text;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Default delay before the first read after a foreground transition (ms). */
export const CLIPBOARD_READ_DELAY_MS = 300;
/** Default delay before the single empty-read retry (ms). */
export const CLIPBOARD_RETRY_DELAY_MS = 500;

/**
 * Focus-aware clipboard read for Android 10+: clipboard access is only granted
 * to the focused app, and window focus can lag the AppState 'active' event.
 * Waits `initialDelayMs`, reads, and if that comes back empty waits
 * `retryDelayMs` and reads once more.
 */
export async function readClipboardWithRetry(
  initialDelayMs: number = CLIPBOARD_READ_DELAY_MS,
  retryDelayMs: number = CLIPBOARD_RETRY_DELAY_MS,
): Promise<string | null> {
  await sleep(initialDelayMs);
  const first = await readClipboard();
  if (first !== null) return first;
  await sleep(retryDelayMs);
  return readClipboard();
}
