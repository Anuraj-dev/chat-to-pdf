// Tests for the pure clipboard-suggestion state logic — issue #6.
// Semantics: a suggestion is only offered over an EMPTY paste box, and a
// dismissal only suppresses that exact copy until the clipboard moves on.

import {
  CaptureModel,
  accept,
  applyClipboard,
  dismiss,
  initialModel,
  updateText,
} from '../suggestion';

const empty = (over: Partial<CaptureModel> = {}): CaptureModel => ({
  ...initialModel,
  ...over,
});

describe('applyClipboard — offering', () => {
  it('offers cleaned clipboard text when the box is empty', () => {
    expect(applyClipboard(empty(), '  hello  ').suggestion).toBe('hello');
  });

  it('offers nothing for empty / whitespace-only / null clipboard', () => {
    expect(applyClipboard(empty(), '').suggestion).toBeNull();
    expect(applyClipboard(empty(), '   \n').suggestion).toBeNull();
    expect(applyClipboard(empty(), null).suggestion).toBeNull();
  });

  it('offers NOTHING when the paste box already has text (no overwrite temptation)', () => {
    const model = empty({ text: 'already typed' });
    expect(applyClipboard(model, 'something new').suggestion).toBeNull();
  });

  it('offers nothing when the box holds the same text as the clipboard', () => {
    expect(applyClipboard(empty({ text: 'same' }), 'same').suggestion).toBeNull();
  });

  it('offers the CLEANED clipboard, not the raw value', () => {
    const out = applyClipboard(empty(), 'Copy code\nconst x = 1;');
    expect(out.suggestion).toBe('const x = 1;');
  });

  it('returns the same model instance when nothing changes (no re-render churn)', () => {
    const model = empty();
    expect(applyClipboard(model, null)).toBe(model);
  });
});

describe('applyClipboard — dismissed marker lifecycle', () => {
  it('does not re-offer the exact dismissed value', () => {
    const model = empty({ dismissed: 'dismissed' });
    const out = applyClipboard(model, 'dismissed');
    expect(out.suggestion).toBeNull();
    expect(out.dismissed).toBe('dismissed');
  });

  it('clears the dismissed marker when the clipboard changes to something different', () => {
    const model = empty({ dismissed: 'old' });
    const out = applyClipboard(model, 'fresh');
    expect(out.suggestion).toBe('fresh');
    expect(out.dismissed).toBeNull();
  });

  it('keeps the dismissed marker across an empty clipboard read', () => {
    const model = empty({ dismissed: 'old' });
    expect(applyClipboard(model, null).dismissed).toBe('old');
  });

  it('re-offers an originally-dismissed value after the clipboard changed in between', () => {
    // dismiss "A" → clipboard becomes "B" (marker cleared) → user re-copies "A"
    let model = dismiss(empty({ suggestion: 'A' }));
    expect(model.dismissed).toBe('A');

    model = applyClipboard(model, 'B');
    expect(model.suggestion).toBe('B');
    expect(model.dismissed).toBeNull();

    model = dismiss(model); // dismiss B too, box still empty
    model = applyClipboard(model, 'A');
    expect(model.suggestion).toBe('A');
  });
});

describe('updateText', () => {
  it('withdraws a live suggestion when the box becomes non-empty', () => {
    const model = empty({ suggestion: 'offer' });
    const out = updateText(model, 'typing…');
    expect(out.text).toBe('typing…');
    expect(out.suggestion).toBeNull();
  });

  it('keeps the suggestion when the box stays empty', () => {
    const model = empty({ suggestion: 'offer' });
    expect(updateText(model, '').suggestion).toBe('offer');
  });
});

describe('accept', () => {
  it('fills text with the suggestion and clears the banner', () => {
    const model = empty({ suggestion: 'pasted' });
    expect(accept(model)).toEqual({ text: 'pasted', suggestion: null, dismissed: null });
  });

  it('is a no-op when there is no suggestion', () => {
    const model = empty({ text: 'x', dismissed: 'y' });
    expect(accept(model)).toBe(model);
  });
});

describe('dismiss', () => {
  it('clears the banner and remembers the dismissed value; leaves text untouched', () => {
    const model: CaptureModel = { text: '', suggestion: 'offer', dismissed: null };
    expect(dismiss(model)).toEqual({ text: '', suggestion: null, dismissed: 'offer' });
  });

  it('is a no-op when there is no suggestion', () => {
    const model = empty({ text: 'x' });
    expect(dismiss(model)).toBe(model);
  });

  it('a dismissed value is not immediately re-offered by applyClipboard', () => {
    const after = dismiss(empty({ suggestion: 'clip' }));
    expect(applyClipboard(after, 'clip').suggestion).toBeNull();
  });
});
