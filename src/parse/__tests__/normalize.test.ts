// Tests for input normalization — issue #4 + issue #11 "Parser hardening" checklist.
// normalizeInput is a pure string→string pre-pass applied before markdown-it.

import { normalizeInput } from '../normalize';

describe('normalizeInput — CRLF + trailing whitespace', () => {
  it('normalizes CRLF to LF', () => {
    expect(normalizeInput('a\r\nb\r\nc')).toBe('a\nb\nc');
  });

  it('trims trailing whitespace-only lines', () => {
    expect(normalizeInput('hello\n\n   \n\t\n')).toBe('hello');
  });

  it('leaves interior blank lines intact', () => {
    expect(normalizeInput('a\n\nb')).toBe('a\n\nb');
  });
});

describe('normalizeInput — outer fence unwrapping (issue #11)', () => {
  it('unwraps a four-tilde outer fence', () => {
    const input = '~~~~\n# Title\n\nbody\n~~~~';
    expect(normalizeInput(input)).toBe('# Title\n\nbody');
  });

  it('unwraps a four-backtick outer fence (Claude)', () => {
    const input = '````\n# Title\nbody\n````';
    expect(normalizeInput(input)).toBe('# Title\nbody');
  });

  it('preserves inner triple-backtick code fences when unwrapping', () => {
    const input = '~~~~\n```python\nprint(1)\n```\n~~~~';
    expect(normalizeInput(input)).toBe('```python\nprint(1)\n```');
  });

  it('tolerates stray preamble/postamble lines outside the fence', () => {
    const input = 'Here is your answer:\n~~~~\n# Title\nbody\n~~~~\nHope that helps!';
    expect(normalizeInput(input)).toBe('# Title\nbody');
  });

  it('does NOT unwrap ordinary triple-backtick code blocks', () => {
    const input = '```python\nprint(1)\n```';
    expect(normalizeInput(input)).toBe('```python\nprint(1)\n```');
  });

  it('leaves content unchanged when an outer opener has no matching closer', () => {
    const input = '~~~~\n# Title\nbody';
    expect(normalizeInput(input)).toBe('~~~~\n# Title\nbody');
  });

  it('does NOT unwrap a legitimate mid-document 4+ fence (content before/after survives)', () => {
    const input = [
      '# Intro',
      'Some prose here.',
      'More prose.',
      'Even more prose.',
      '````',
      'raw block content',
      '````',
      'Closing prose line 1.',
      'Closing prose line 2.',
      'Closing prose line 3.',
      'Closing prose line 4.',
    ].join('\n');
    expect(normalizeInput(input)).toBe(input);
  });

  it('does NOT unwrap when the opener is at the top but the closer is mid-document', () => {
    const input = [
      '~~~~',
      'block content',
      '~~~~',
      'prose after 1',
      'prose after 2',
      'prose after 3',
      'prose after 4',
    ].join('\n');
    expect(normalizeInput(input)).toBe(input);
  });
});

describe('normalizeInput — code regions protected from delimiter rewrites', () => {
  it('leaves \\$ inside inline code untouched', () => {
    const input = 'Run `echo \\$HOME` to print it.';
    expect(normalizeInput(input)).toBe('Run `echo \\$HOME` to print it.');
  });

  it('leaves \\$, \\( and \\[ inside fenced code untouched', () => {
    const input = '```bash\necho \\$HOME\nif \\( true \\); then arr=\\[1\\]; fi\n```';
    expect(normalizeInput(input)).toBe(input);
  });

  it('converts \\( \\) in prose while leaving it untouched in inline code on the same line', () => {
    const input = 'Math \\(x^2\\) but code `\\(not math\\)` stays.';
    expect(normalizeInput(input)).toBe('Math $x^2$ but code `\\(not math\\)` stays.');
  });

  it('does not let a rewrite span from prose into a fenced code block', () => {
    const input = 'open \\[ prose\n```\ncode \\] here\n```';
    // The \[ has no closing \] in prose (the one inside code must not count), so nothing rewrites.
    expect(normalizeInput(input)).toBe(input);
  });
});

describe('normalizeInput — ChatGPT quirks (issue #11)', () => {
  it('strips \\$ escapes back to $', () => {
    expect(normalizeInput('cost is \\$5 and \\$x^2\\$')).toBe('cost is $5 and $x^2$');
  });

  it('converts \\( \\) inline delimiters to $...$', () => {
    expect(normalizeInput('an equation \\(a^2 + b^2\\) here')).toBe('an equation $a^2 + b^2$ here');
  });

  it('converts \\[ \\] block delimiters to $$...$$', () => {
    expect(normalizeInput('\\[E = mc^2\\]')).toBe('$$E = mc^2$$');
  });

  it('handles multiline \\[ \\] blocks', () => {
    const input = '\\[\nE = mc^2\n\\]';
    expect(normalizeInput(input)).toBe('$$\nE = mc^2\n$$');
  });
});

// End-to-end fixtures: a realistic full paste from each AI after the user runs
// the issue #11 helper prompt, exercising that AI's known quirks together.
describe('normalizeInput — per-AI fixture pastes (issue #11 helper flow)', () => {
  it('ChatGPT: four-tilde wrapper + stray pre/postamble + \\$ escapes + \\( \\) math + inner ``` fence', () => {
    const input = [
      'Sure! Here is the full answer:', // stray preamble
      '~~~~',
      '# Roots',
      '',
      'The cost was \\$5. The formula is \\(x^2 + 1\\).',
      '',
      '$$',
      'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
      '$$',
      '',
      '```python',
      'print("$5")',
      '```',
      '~~~~',
      'Hope this helps!', // stray postamble
    ].join('\n');
    const expected = [
      '# Roots',
      '',
      'The cost was $5. The formula is $x^2 + 1$.',
      '',
      '$$',
      'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
      '$$',
      '',
      '```python',
      'print("$5")', // inner code fence untouched
      '```',
    ].join('\n');
    expect(normalizeInput(input)).toBe(expected);
  });

  it('Gemini: four-tilde wrapper with an inner fenced table survives', () => {
    const input = [
      '~~~~',
      '## Data',
      '',
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '```js',
      'const x = 1;',
      '```',
      '~~~~',
    ].join('\n');
    const expected = [
      '## Data',
      '',
      '| a | b |',
      '| - | - |',
      '| 1 | 2 |',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n');
    expect(normalizeInput(input)).toBe(expected);
  });

  it('Claude: four-backtick wrapper preserves inner triple-backtick blocks', () => {
    const input = [
      '````',
      '# Answer',
      '',
      'Inline math $a^2$ and a block:',
      '',
      '```ts',
      'type T = number;',
      '```',
      '````',
    ].join('\n');
    const expected = [
      '# Answer',
      '',
      'Inline math $a^2$ and a block:',
      '',
      '```ts',
      'type T = number;',
      '```',
    ].join('\n');
    expect(normalizeInput(input)).toBe(expected);
  });

  it('Other/Generic: no wrapper at all, delimiters still normalized', () => {
    const input = 'Given \\[E = mc^2\\], the energy \\(E\\) is large.';
    expect(normalizeInput(input)).toBe(
      'Given $$E = mc^2$$, the energy $E$ is large.',
    );
  });
});
