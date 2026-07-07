// Tests for the helper-sheet copy-outcome logic (issue #11 + codex review fix):
// a failed clipboard write must NEVER show the "Copied" success step.

import {
  COPY_FAILED_MESSAGE,
  initialHelperSheetState,
  reduceCopyResult,
} from '../helperSheet';

describe('helper sheet step logic', () => {
  it('starts on the picker with no failure line', () => {
    expect(initialHelperSheetState).toEqual({ copied: null, failed: false });
  });

  it('a successful copy advances to the instruction step for that AI', () => {
    expect(reduceCopyResult('chatgpt', true)).toEqual({
      copied: 'chatgpt',
      failed: false,
    });
    expect(reduceCopyResult('claude', true)).toEqual({
      copied: 'claude',
      failed: false,
    });
  });

  it('a failed copy stays on the picker and raises the retry line', () => {
    expect(reduceCopyResult('gemini', false)).toEqual({
      copied: null,
      failed: true,
    });
  });

  it('a success after a failure clears the retry line', () => {
    // failure → retry visible; the next successful tap must land on success
    // with no stale failure flag.
    const afterFail = reduceCopyResult('other', false);
    expect(afterFail.failed).toBe(true);
    expect(reduceCopyResult('other', true)).toEqual({
      copied: 'other',
      failed: false,
    });
  });

  it('the retry message is plain language (no jargon)', () => {
    expect(COPY_FAILED_MESSAGE).toBe("Couldn't copy — try again.");
  });
});
