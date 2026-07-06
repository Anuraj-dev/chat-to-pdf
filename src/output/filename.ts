// [4] OUTPUT — suggest a SAF-safe PDF filename from the source markdown.

/** Longest slug (before the date suffix) we'll emit. */
const MAX_SLUG_LENGTH = 40;
const FALLBACK_BASE = 'chat-to-pdf';

/**
 * Derive a filename from the first markdown heading (preferred) or the first
 * words of the text: lowercased, kebab-cased, ASCII-only (diacritics folded,
 * emoji stripped), length-capped, suffixed with the local date.
 * Example: "quadratic-formula-2026-07-07.pdf".
 */
export function suggestFilename(sourceText: string, now: Date = new Date()): string {
  const lines = sourceText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const heading = lines.find((line) => /^#{1,6}\s+\S/.test(line));
  const candidate = heading
    ? heading.replace(/^#{1,6}\s+/, '')
    : (lines[0] ?? '').split(/\s+/).slice(0, 8).join(' ');

  const slug = candidate
    // drop markdown inline markers before slugging
    .replace(/[*_`~#>[\]()]/g, ' ')
    // fold diacritics into base letters, then drop everything non-ASCII
    // (combining marks, emoji, CJK — SAF providers choke on exotic names)
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');

  const base = slug.length > 0 ? slug : FALLBACK_BASE;
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${base}-${yyyy}-${mm}-${dd}.pdf`;
}
