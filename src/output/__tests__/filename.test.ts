import { suggestFilename, sanitizeUserFilename } from '../filename';

// Pin the date so the suffix is deterministic.
const NOW = new Date(2026, 6, 7); // 2026-07-07 local
const SUFFIX = '2026-07-07.pdf';

describe('suggestFilename — derive a SAF-safe, date-suffixed name', () => {
  it('uses the first markdown heading when present', () => {
    const md = 'intro line\n\n## The Quadratic Formula\n\nbody text';
    expect(suggestFilename(md, NOW)).toBe(`the-quadratic-formula-${SUFFIX}`);
  });

  it('falls back to the first words of plain text', () => {
    const txt = 'Photosynthesis converts light energy into chemical energy stored in glucose molecules over time';
    const name = suggestFilename(txt, NOW);
    expect(name).toMatch(/^photosynthesis-converts-light-energy/);
    expect(name.endsWith(`-${SUFFIX}`)).toBe(true);
  });

  it('strips markdown inline markers from headings', () => {
    expect(suggestFilename('# **Bold** `code` _title_', NOW)).toBe(
      `bold-code-title-${SUFFIX}`,
    );
  });

  it('strips emoji and non-ASCII, keeping transliterable letters', () => {
    expect(suggestFilename('# Café notes 🚀🔥 résumé', NOW)).toBe(
      `cafe-notes-resume-${SUFFIX}`,
    );
  });

  it('caps the slug length', () => {
    const long = '# ' + 'verylongword '.repeat(20);
    const name = suggestFilename(long, NOW);
    const slug = name.replace(`-${SUFFIX}`, '');
    expect(slug.length).toBeLessThanOrEqual(40);
  });

  it('falls back to a default base for empty or all-symbol input', () => {
    expect(suggestFilename('', NOW)).toBe(`chat-to-pdf-${SUFFIX}`);
    expect(suggestFilename('🚀🔥 ✨', NOW)).toBe(`chat-to-pdf-${SUFFIX}`);
  });

  it('always ends in .pdf with a zero-padded YYYY-MM-DD suffix', () => {
    const name = suggestFilename('# Hi', new Date(2026, 0, 3));
    expect(name).toBe('hi-2026-01-03.pdf');
  });

  it('produces only SAF-safe characters (lowercase alnum, hyphen, dot)', () => {
    const name = suggestFilename('# A/B: <weird*name?> "quotes" | pipes\\slashes', NOW);
    expect(name).toMatch(/^[a-z0-9-]+\.pdf$/);
  });
});

describe('sanitizeUserFilename — user-typed name → filesystem-safe base', () => {
  it('preserves human casing, spaces and legal punctuation', () => {
    expect(sanitizeUserFilename('My Notes (2026) - Draft')).toBe('My Notes (2026) - Draft');
  });

  it('strips path separators and reserved chars, collapsing the gaps', () => {
    expect(sanitizeUserFilename('My Notes: Quadratic / Formula?')).toBe(
      'My Notes Quadratic Formula',
    );
  });

  it('drops a trailing .pdf the user typed (SAF re-appends it)', () => {
    expect(sanitizeUserFilename('report.pdf')).toBe('report');
  });

  it('trims leading/trailing dots and whitespace', () => {
    expect(sanitizeUserFilename('  ...hidden..  ')).toBe('hidden');
  });

  it('caps very long names to 80 chars', () => {
    const name = sanitizeUserFilename('x'.repeat(200));
    expect(name.length).toBe(80);
  });

  it('falls back to the provided title when the entry is empty/all-stripped', () => {
    expect(sanitizeUserFilename('   ', 'The Quadratic Formula')).toBe('The Quadratic Formula');
    expect(sanitizeUserFilename('///', 'The Quadratic Formula')).toBe('The Quadratic Formula');
  });

  it('falls back to a constant when both name and title are empty', () => {
    expect(sanitizeUserFilename('', '')).toBe('chat-to-pdf');
  });
});
