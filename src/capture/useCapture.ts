// [1] CAPTURE — React hook wiring clipboard reads + suggestion state into the UI.
// All non-trivial logic lives in ./suggestion and ./clipboard (pure/unit-tested);
// this file is just the React/AppState glue.
// See docs/specs/0001-architecture-foundation.md §4.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { readClipboardWithRetry } from './clipboard';
import {
  CaptureModel,
  accept,
  applyClipboard,
  dismiss,
  initialModel,
  updateText,
} from './suggestion';

export interface UseCapture {
  /** Current paste-box text. */
  text: string;
  /** Cleaned clipboard text offered to the user, or null when there's nothing to offer. */
  clipboardSuggestion: string | null;
  /** Update the paste-box text (from the TextInput). */
  setText: (text: string) => void;
  /** Accept the suggestion → fills the paste box, clears the banner. */
  acceptSuggestion: () => void;
  /** Dismiss the suggestion → clears the banner, won't re-offer that copy. Clipboard untouched. */
  dismissSuggestion: () => void;
  /** Clear the paste box. */
  clearText: () => void;
  /** Manually re-read the clipboard (also runs on mount + app foreground). */
  checkClipboard: () => Promise<void>;
}

/**
 * Owns the capture-screen state: paste-box text and a clipboard suggestion that
 * appears on mount and whenever the app returns to the foreground.
 *
 * Foreground reads are focus-aware (Android 10+ only grants clipboard access to
 * the focused window, which can lag AppState 'active'): each read is delayed and
 * retried once if empty via readClipboardWithRetry, and guarded by a request id
 * so a stale earlier read can never overwrite a later result or clear a fresher
 * suggestion.
 */
export function useCapture(): UseCapture {
  const [model, setModel] = useState<CaptureModel>(initialModel);
  // Monotonic id of the latest clipboard request; stale reads bail out.
  const requestIdRef = useRef(0);

  const checkClipboard = useCallback(async () => {
    const id = ++requestIdRef.current;
    const raw = await readClipboardWithRetry();
    if (id !== requestIdRef.current) return; // superseded by a newer read
    setModel((m) => applyClipboard(m, raw));
  }, []);

  useEffect(() => {
    void checkClipboard();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void checkClipboard();
    });
    return () => {
      // Invalidate any in-flight read so it can't set state after unmount.
      requestIdRef.current++;
      sub.remove();
    };
  }, [checkClipboard]);

  const setText = useCallback((text: string) => {
    setModel((m) => updateText(m, text));
  }, []);

  const acceptSuggestion = useCallback(() => setModel(accept), []);
  const dismissSuggestion = useCallback(() => setModel(dismiss), []);
  const clearText = useCallback(() => setModel((m) => updateText(m, '')), []);

  return {
    text: model.text,
    clipboardSuggestion: model.suggestion,
    setText,
    acceptSuggestion,
    dismissSuggestion,
    clearText,
    checkClipboard,
  };
}
