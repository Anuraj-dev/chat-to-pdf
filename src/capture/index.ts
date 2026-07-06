// [1] CAPTURE — public API. Clipboard read, paste-box cleanup, suggestion state.
// See docs/specs/0001-architecture-foundation.md §4. Issue #6 (UI polish in #9).

export { cleanCapturedText, looksLikeMarkdown } from './cleanText';
export {
  readClipboard,
  readClipboardWithRetry,
  CLIPBOARD_READ_DELAY_MS,
  CLIPBOARD_RETRY_DELAY_MS,
} from './clipboard';
export { useCapture } from './useCapture';
export type { UseCapture } from './useCapture';
export {
  applyClipboard,
  updateText,
  accept,
  dismiss,
  initialModel,
} from './suggestion';
export type { CaptureModel } from './suggestion';
