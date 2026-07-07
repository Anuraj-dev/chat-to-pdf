import {
  formatHistoryDate,
  estimatePageCount,
  pageEstimateLabel,
  pageCountLabel,
  previewSubtitle,
  pageIndicatorLabel,
  CHARS_PER_PAGE,
} from '../format';

describe('formatHistoryDate', () => {
  const now = new Date(2026, 6, 7, 15, 30); // 2026-07-07 3:30pm local

  it('labels same-day as Today with lowercase am/pm', () => {
    const t = new Date(2026, 6, 7, 9, 24).getTime();
    expect(formatHistoryDate(t, now)).toBe('Today, 9:24 am');
  });

  it('labels the previous calendar day as Yesterday', () => {
    const t = new Date(2026, 6, 6, 16, 12).getTime();
    expect(formatHistoryDate(t, now)).toBe('Yesterday, 4:12 pm');
  });

  it('shows day + month for older dates in the same year', () => {
    const t = new Date(2026, 2, 12, 16, 12).getTime();
    expect(formatHistoryDate(t, now)).toBe('12 Mar, 4:12 pm');
  });

  it('adds the year when it differs from now', () => {
    const t = new Date(2025, 11, 1, 8, 5).getTime();
    expect(formatHistoryDate(t, now)).toBe('1 Dec 2025, 8:05 am');
  });

  it('renders midnight as 12:xx am and noon as 12:xx pm', () => {
    expect(formatHistoryDate(new Date(2026, 6, 7, 0, 3).getTime(), now)).toBe(
      'Today, 12:03 am',
    );
    expect(formatHistoryDate(new Date(2026, 6, 7, 12, 0).getTime(), now)).toBe(
      'Today, 12:00 pm',
    );
  });
});

describe('estimatePageCount', () => {
  it('is 0 for empty/whitespace-only text', () => {
    expect(estimatePageCount('')).toBe(0);
    expect(estimatePageCount('   \n  ')).toBe(0);
  });

  it('is at least 1 for any non-empty text', () => {
    expect(estimatePageCount('hi')).toBe(1);
  });

  it('rounds up across the per-page boundary', () => {
    expect(estimatePageCount('a'.repeat(CHARS_PER_PAGE))).toBe(1);
    expect(estimatePageCount('a'.repeat(CHARS_PER_PAGE + 1))).toBe(2);
  });
});

describe('pageEstimateLabel', () => {
  it('is empty for empty text', () => {
    expect(pageEstimateLabel('')).toBe('');
  });

  it('singularizes one page', () => {
    expect(pageEstimateLabel('short')).toBe('About 1 page');
  });

  it('pluralizes multiple pages', () => {
    expect(pageEstimateLabel('a'.repeat(CHARS_PER_PAGE * 2 + 5))).toBe('About 3 pages');
  });
});

describe('pageCountLabel — real rendered page count', () => {
  it('is empty when the count is unknown or non-positive (legacy docs)', () => {
    expect(pageCountLabel(undefined)).toBe('');
    expect(pageCountLabel(0)).toBe('');
    expect(pageCountLabel(-1)).toBe('');
  });

  it('singularizes one page and pluralizes more', () => {
    expect(pageCountLabel(1)).toBe('1 page');
    expect(pageCountLabel(3)).toBe('3 pages');
  });
});

describe('previewSubtitle — §1e header subtitle', () => {
  it('prefixes the page count when known', () => {
    expect(previewSubtitle(2)).toBe('2 pages · A4 · saved on your phone');
    expect(previewSubtitle(1)).toBe('1 page · A4 · saved on your phone');
  });

  it('omits the count for legacy docs without one', () => {
    expect(previewSubtitle(undefined)).toBe('A4 · saved on your phone');
  });
});

describe('pageIndicatorLabel — §1e indicator below the sheet', () => {
  it('is empty when the count is unknown', () => {
    expect(pageIndicatorLabel(undefined)).toBe('');
  });

  it('shows just the count for a single page', () => {
    expect(pageIndicatorLabel(1)).toBe('1 page');
  });

  it('adds the scroll affordance for multi-page docs', () => {
    expect(pageIndicatorLabel(2)).toBe('2 pages · scroll to see all');
  });
});
