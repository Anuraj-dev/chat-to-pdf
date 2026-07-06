// [1] CAPTURE — pure state logic for the clipboard suggestion. No React here so
// the transitions are trivially unit-testable; useCapture.ts just wires them to
// React state + AppState. See docs/specs/0001-architecture-foundation.md §4.

import { cleanCapturedText } from './cleanText';

export interface CaptureModel {
  /** Current paste-box contents. */
  text: string;
  /** Cleaned clipboard text currently offered to the user, or null when none. */
  suggestion: string | null;
  /** The exact suggestion the user last dismissed, so we don't re-offer it. */
  dismissed: string | null;
}

export const initialModel: CaptureModel = { text: '', suggestion: null, dismissed: null };

/**
 * Fold a fresh clipboard read into the model.
 *
 * A suggestion is offered ONLY when the paste box is EMPTY — once the user has
 * typed or pasted something, we never tempt an overwrite with a banner. The
 * cleaned clipboard must also be non-empty and not the value the user last
 * dismissed.
 *
 * The dismissed marker is CLEARED whenever the clipboard holds something
 * DIFFERENT from it: a dismissal applies to that one copy, so if the user later
 * re-copies the originally-dismissed text it IS offered again. An empty
 * clipboard read tells us nothing, so the marker survives it.
 */
export function applyClipboard(
  model: CaptureModel,
  rawClipboard: string | null,
): CaptureModel {
  const cleaned = cleanCapturedText(rawClipboard ?? '');

  const dismissed =
    cleaned !== '' && cleaned !== model.dismissed ? null : model.dismissed;

  const offerable = cleaned !== '' && model.text === '' && cleaned !== dismissed;
  const suggestion = offerable ? cleaned : null;

  if (suggestion === model.suggestion && dismissed === model.dismissed) return model;
  return { ...model, suggestion, dismissed };
}

/**
 * Update the paste-box text. A non-empty box withdraws any live suggestion —
 * the banner only ever shows over an empty box.
 */
export function updateText(model: CaptureModel, text: string): CaptureModel {
  return { ...model, text, suggestion: text === '' ? model.suggestion : null };
}

/** Accept the current suggestion: fill the paste box, clear the banner. */
export function accept(model: CaptureModel): CaptureModel {
  if (model.suggestion === null) return model;
  return { text: model.suggestion, suggestion: null, dismissed: model.dismissed };
}

/**
 * Dismiss the current suggestion: clear the banner and remember the value so it
 * isn't offered again (until the clipboard moves on to something different —
 * see applyClipboard). Does NOT touch the clipboard or the paste box.
 */
export function dismiss(model: CaptureModel): CaptureModel {
  if (model.suggestion === null) return model;
  return { text: model.text, suggestion: null, dismissed: model.suggestion };
}
