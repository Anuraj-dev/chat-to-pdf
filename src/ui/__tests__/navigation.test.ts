import { navReducer, initialScreen, Screen } from '../navigation';

describe('navReducer', () => {
  it('starts on Home', () => {
    expect(initialScreen).toEqual({ name: 'home' });
  });

  it('Home → Make PDF → Processing (failures reset)', () => {
    expect(navReducer({ name: 'home' }, { type: 'START_PROCESSING' })).toEqual({
      name: 'processing',
      failures: 0,
    });
  });

  it('Processing success → Preview with home origin', () => {
    const s = navReducer(
      { name: 'processing', failures: 0 },
      { type: 'PROCESSING_SUCCEEDED', docId: 'doc1' },
    );
    expect(s).toEqual({ name: 'preview', docId: 'doc1', origin: 'home' });
  });

  it('Processing failure increments the failure counter', () => {
    const first = navReducer(
      { name: 'processing', failures: 0 },
      { type: 'PROCESSING_FAILED' },
    );
    expect(first).toEqual({ name: 'error', failures: 1 });

    const retry = navReducer(first, { type: 'RETRY' });
    expect(retry).toEqual({ name: 'processing', failures: 1 });

    const second = navReducer(retry, { type: 'PROCESSING_FAILED' });
    expect(second).toEqual({ name: 'error', failures: 2 });
  });

  it('Cancel and Back-to-text both return Home', () => {
    expect(
      navReducer({ name: 'processing', failures: 0 }, { type: 'CANCEL_PROCESSING' }),
    ).toEqual({ name: 'home' });
    expect(
      navReducer({ name: 'error', failures: 1 }, { type: 'BACK_TO_TEXT' }),
    ).toEqual({ name: 'home' });
  });

  it('Home → History → Preview (history origin) → back returns to History', () => {
    const history = navReducer({ name: 'home' }, { type: 'OPEN_HISTORY' });
    expect(history).toEqual({ name: 'history' });

    const preview = navReducer(history, {
      type: 'OPEN_PREVIEW_FROM_HISTORY',
      docId: 'd9',
    });
    expect(preview).toEqual({ name: 'preview', docId: 'd9', origin: 'history' });

    expect(navReducer(preview, { type: 'BACK' })).toEqual({ name: 'history' });
  });

  it('Preview opened from Home returns Home on back', () => {
    const preview: Screen = { name: 'preview', docId: 'x', origin: 'home' };
    expect(navReducer(preview, { type: 'BACK' })).toEqual({ name: 'home' });
  });

  it('History back returns Home', () => {
    expect(navReducer({ name: 'history' }, { type: 'BACK' })).toEqual({
      name: 'home',
    });
  });
});
