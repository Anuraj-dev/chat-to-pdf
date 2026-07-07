// [UI] "Get the full answer" sheet — pure step logic (issue #11).
// Kept out of the component so the copy-outcome behavior unit-tests under plain
// jest (repo pattern: logic modules, not JSX). The clipboard write can FAIL
// (Android denies background writes, etc.) — a failed copy must never show the
// success step; it keeps the picker up with a plain-language retry line.

import type { AiId } from '../capture/helperPrompts';

/** Plain-language retry line shown on the picker after a failed copy. */
export const COPY_FAILED_MESSAGE = "Couldn't copy — try again.";

/**
 * Sheet state: `copied` = which AI's prompt is on the clipboard (null = still
 * picking); `failed` = the last copy attempt didn't reach the clipboard.
 */
export interface HelperSheetState {
  copied: AiId | null;
  failed: boolean;
}

/** Fresh picker state — used on every (re)open of the sheet. */
export const initialHelperSheetState: HelperSheetState = {
  copied: null,
  failed: false,
};

/**
 * Fold a copy attempt's outcome into the next sheet state. Success advances to
 * the instruction step; failure stays on the picker and raises the retry line.
 */
export function reduceCopyResult(id: AiId, ok: boolean): HelperSheetState {
  return ok ? { copied: id, failed: false } : { copied: null, failed: true };
}
