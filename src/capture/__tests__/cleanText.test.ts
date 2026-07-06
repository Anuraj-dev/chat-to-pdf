// Tests for capture-layer text cleanup + markdown heuristic — issue #6.

import { cleanCapturedText, looksLikeMarkdown } from '../cleanText';

describe('cleanCapturedText — artifacts (position-anchored)', () => {
  it('strips a leading "Copy code" line', () => {
    expect(cleanCapturedText('Copy code\nconst x = 1;')).toBe('const x = 1;');
  });

  it('strips an artifact line within the first 2 lines', () => {
    expect(cleanCapturedText('title\ncopy\nbody')).toBe('title\nbody');
  });

  it('strips a "Copy code" line immediately before a fence opener', () => {
    const input = 'intro\nsome prose\nCopy code\n```js\nconst x = 1;\n```';
    expect(cleanCapturedText(input)).toBe('intro\nsome prose\n```js\nconst x = 1;\n```');
  });

  it('strips case-insensitively before a tilde fence too', () => {
    const input = 'a\nb\nCOPY\n~~~\ncode\n~~~';
    expect(cleanCapturedText(input)).toBe('a\nb\n~~~\ncode\n~~~');
  });

  it('a standalone "Copy" line mid-prose (no fence after) SURVIVES', () => {
    const input = 'intro\nmore\nCopy\ntail';
    expect(cleanCapturedText(input)).toBe('intro\nmore\nCopy\ntail');
  });

  it('a standalone "Copy code" line mid-prose survives as well', () => {
    const input = 'line1\nline2\nCopy code\nline4';
    expect(cleanCapturedText(input)).toBe('line1\nline2\nCopy code\nline4');
  });

  it('does NOT strip "copy code" when it is part of a real line', () => {
    expect(cleanCapturedText('Please copy code from the repo')).toBe(
      'Please copy code from the repo',
    );
  });
});

describe('cleanCapturedText — zero-width + BOM', () => {
  it('strips a leading BOM', () => {
    expect(cleanCapturedText('﻿hello')).toBe('hello');
  });

  it('strips interior zero-width characters', () => {
    expect(cleanCapturedText('a​b‌c‍⁠d')).toBe('abcd');
  });
});

describe('cleanCapturedText — blank-line collapse', () => {
  it('collapses 3+ blank lines down to 2', () => {
    expect(cleanCapturedText('a\n\n\n\n\nb')).toBe('a\n\n\nb');
  });

  it('leaves a single blank line intact', () => {
    expect(cleanCapturedText('a\n\nb')).toBe('a\n\nb');
  });

  it('treats whitespace-only lines as blank when collapsing', () => {
    expect(cleanCapturedText('a\n   \n\t\n\nb')).toBe('a\n\n\nb');
  });
});

describe('cleanCapturedText — trimming + line endings', () => {
  it('trims leading/trailing whitespace', () => {
    expect(cleanCapturedText('  \n\nhello\n\n  ')).toBe('hello');
  });

  it('normalizes CRLF to LF', () => {
    expect(cleanCapturedText('a\r\nb')).toBe('a\nb');
  });

  it('returns empty string for empty / whitespace-only input', () => {
    expect(cleanCapturedText('')).toBe('');
    expect(cleanCapturedText('   \n\t')).toBe('');
  });
});

describe('looksLikeMarkdown — positives', () => {
  it.each([
    ['heading', '# Title\nbody'],
    ['fenced code', '```js\nconst x=1;\n```'],
    ['table', '| a | b |\n| --- | --- |\n| 1 | 2 |'],
    ['block math', 'result: $$x^2 + y^2$$'],
    ['inline math', 'the value $x = 3$ holds'],
    ['latex inline', 'the value \\(x = 3\\) holds'],
    ['bullet list', '- one\n- two'],
    ['ordered list', '1. one\n2. two'],
    ['inline code', 'run `npm test` now'],
    ['link', 'see [docs](https://example.com)'],
    ['bold', 'this is **important**'],
  ])('detects %s', (_label, input) => {
    expect(looksLikeMarkdown(input)).toBe(true);
  });
});

describe('looksLikeMarkdown — negatives', () => {
  it.each([
    ['plain prose', 'This is a normal sentence with no markdown at all.'],
    ['empty', ''],
    ['whitespace', '   \n\t'],
    ['prose with a price', 'It costs 5 dollars and change.'],
    ['hyphenated word', 'A well-known fact about state-of-the-art tools.'],
  ])('rejects %s', (_label, input) => {
    expect(looksLikeMarkdown(input)).toBe(false);
  });
});
