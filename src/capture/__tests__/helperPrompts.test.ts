// Tests for the "Get the full answer" helper prompts (issue #11).
// These prompts must ship VERBATIM and stay updatable as pure data.

import {
  AI_OPTIONS,
  HELPER_INSTRUCTION,
  HELPER_PROMPTS,
  getHelperPrompt,
  type AiId,
} from '../helperPrompts';

describe('AI_OPTIONS (picker)', () => {
  it('lists the four AIs in ChatGPT / Gemini / Claude / Other order', () => {
    expect(AI_OPTIONS.map((o) => o.id)).toEqual([
      'chatgpt',
      'gemini',
      'claude',
      'other',
    ]);
    expect(AI_OPTIONS.map((o) => o.label)).toEqual([
      'ChatGPT',
      'Gemini',
      'Claude',
      'Other',
    ]);
  });

  it('has a prompt for every option', () => {
    for (const opt of AI_OPTIONS) {
      expect(getHelperPrompt(opt.id)).toBe(HELPER_PROMPTS[opt.id]);
      expect(getHelperPrompt(opt.id).length).toBeGreaterThan(0);
    }
  });
});

describe('HELPER_INSTRUCTION (plain-language next step)', () => {
  it('tells the user to paste then copy the reply back', () => {
    expect(HELPER_INSTRUCTION).toBe(
      "Paste this into your chat, then copy the AI's reply back here.",
    );
  });
});

describe('HELPER_PROMPTS — v2 whole-conversation compilation', () => {
  const ids: AiId[] = ['chatgpt', 'gemini', 'claude', 'other'];

  it('every prompt compiles the WHOLE conversation, not just the last answer', () => {
    for (const id of ids) {
      expect(HELPER_PROMPTS[id]).toContain('ENTIRE conversation');
      expect(HELPER_PROMPTS[id].toLowerCase()).toContain('across all turns');
    }
  });

  it('every prompt demands heading structure (# title, ## topics, ### subsections)', () => {
    for (const id of ids) {
      expect(HELPER_PROMPTS[id]).toContain('# title');
      expect(HELPER_PROMPTS[id]).toContain('##');
      expect(HELPER_PROMPTS[id]).toContain('###');
    }
  });

  it('every prompt keeps only the final version of corrected answers', () => {
    for (const id of ids) {
      expect(HELPER_PROMPTS[id].toLowerCase()).toMatch(/final (correct )?version/);
    }
  });

  it('every prompt excludes chat filler and the user\'s own messages', () => {
    for (const id of ids) {
      expect(HELPER_PROMPTS[id].toLowerCase()).toMatch(/filler|chat noise/);
      expect(HELPER_PROMPTS[id].toLowerCase()).toContain('my');
    }
  });

  it('every prompt forbids summarizing / omissions', () => {
    for (const id of ids) {
      expect(HELPER_PROMPTS[id].toLowerCase()).toMatch(
        /do not summarize|no summarizing|nothing summarized|nothing condensed/,
      );
    }
  });
});

describe('HELPER_PROMPTS — structural invariants (the fence tricks are load-bearing)', () => {
  const ids: AiId[] = ['chatgpt', 'gemini', 'claude', 'other'];

  it('the ChatGPT prompt keeps literal backslash-escaped delimiters (not dropped)', () => {
    // Guards against the JS "\( → (" escape footgun — the backslashes MUST survive.
    expect(HELPER_PROMPTS.chatgpt).toContain('\\( \\)');
    expect(HELPER_PROMPTS.chatgpt).toContain('\\[ \\]');
  });

  it('ChatGPT / Gemini / Other ask for a four-tilde outer fence', () => {
    for (const id of ['chatgpt', 'gemini', 'other'] as AiId[]) {
      expect(HELPER_PROMPTS[id]).toContain('~~~~');
    }
  });

  it('Claude asks for a four-backtick fence and no artifact', () => {
    expect(HELPER_PROMPTS.claude).toContain('````');
    expect(HELPER_PROMPTS.claude).toContain('NOT as an artifact');
  });

  it('every prompt insists on full/complete content', () => {
    for (const id of ids) {
      expect(HELPER_PROMPTS[id].toLowerCase()).toMatch(
        /in full|complete|unabridged|full substance|full content/,
      );
    }
  });
});
