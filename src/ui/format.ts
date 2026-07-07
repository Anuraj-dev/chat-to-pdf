// [UI] Pure formatting helpers for the screens. No RN/React imports so they
// unit-test under plain jest. Used by History (dates) and Home (page estimate).

/** Format a clock time like "9:24 am" (lowercase am/pm, no leading zero hour). */
function formatClock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'am' : 'pm';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** True if two dates fall on the same calendar day (local time). */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * History subtitle date: "Today, 9:24 am" · "Yesterday, 4:12 pm" · older →
 * "12 Mar, 4:12 pm" (adds the year only when it differs from `now`).
 * `now` is injectable for deterministic tests.
 */
export function formatHistoryDate(createdAt: number, now: Date = new Date()): string {
  const d = new Date(createdAt);
  const clock = formatClock(d);

  if (sameDay(d, now)) return `Today, ${clock}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `Yesterday, ${clock}`;

  const datePart =
    d.getFullYear() === now.getFullYear()
      ? `${d.getDate()} ${MONTHS[d.getMonth()]}`
      : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return `${datePart}, ${clock}`;
}

/**
 * Rough characters-per-A4-page for the page-estimate chip. This is a cheap
 * pre-render guess (real page count needs a rendered PDF, which expo-print does
 * not expose) — good enough for the "About N page(s)" affordance on Home.
 */
export const CHARS_PER_PAGE = 1800;

/** Estimate page count from raw pasted text (never less than 1). */
export function estimatePageCount(text: string, charsPerPage = CHARS_PER_PAGE): number {
  const len = text.trim().length;
  if (len === 0) return 0;
  return Math.max(1, Math.ceil(len / charsPerPage));
}

/** "About 1 page" / "About 3 pages" — empty text yields an empty string. */
export function pageEstimateLabel(text: string): string {
  const pages = estimatePageCount(text);
  if (pages === 0) return '';
  return `About ${pages} ${pages === 1 ? 'page' : 'pages'}`;
}

/**
 * "1 page" / "2 pages" from a REAL rendered page count (expo-print's
 * numberOfPages). Empty string when the count is unknown (legacy records) — the
 * UI omits it rather than guessing a wrong number.
 */
export function pageCountLabel(pageCount?: number): string {
  if (pageCount === undefined || pageCount <= 0) return '';
  return `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;
}

/**
 * Preview header subtitle (design/DESIGN-SPEC.md §1e): "2 pages · A4 · saved on
 * your phone". The page count is dropped when unknown → "A4 · saved on your
 * phone".
 */
export function previewSubtitle(pageCount?: number): string {
  const pages = pageCountLabel(pageCount);
  return pages ? `${pages} · A4 · saved on your phone` : 'A4 · saved on your phone';
}

/**
 * Page indicator shown below the A4 sheet (§1e). The spec's "swipe to see page
 * 2" affordance is adapted to the Expo Go preview, which is a single scrollable
 * WebView (no real PDF pagination), so a multi-page doc reads "2 pages · scroll
 * to see all". Empty string when the count is unknown.
 */
export function pageIndicatorLabel(pageCount?: number): string {
  const pages = pageCountLabel(pageCount);
  if (!pages) return '';
  return pageCount === 1 ? pages : `${pages} · scroll to see all`;
}
