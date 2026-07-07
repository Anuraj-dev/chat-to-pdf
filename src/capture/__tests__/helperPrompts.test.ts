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

describe('HELPER_PROMPTS — verbatim ship texts', () => {
  it('ChatGPT prompt is exact (incl. four-tilde fence + \\( \\) / \\[ \\] ban + Unicode ban)', () => {
    expect(HELPER_PROMPTS.chatgpt).toBe(
      'Reproduce your previous answer in full, word for word — every section, list item, code block, table, and equation. Do not summarize, shorten, or omit anything. Output it as raw GitHub-flavored Markdown inside ONE code block fenced with four tildes (~~~~) so inner ``` fences survive. Rules: math must use $...$ and $$...$$ LaTeX delimiters — never \\( \\), \\[ \\], or Unicode symbols like ² or √; code stays in fenced blocks with language tags; tables as Markdown tables. Output only the fenced block — no text before or after it.',
    );
  });

  it('Gemini prompt is exact', () => {
    expect(HELPER_PROMPTS.gemini).toBe(
      'Take your previous answer and output it again, complete and unabridged — nothing summarized or dropped. Format it as plain GitHub-flavored Markdown source text (not rendered), wrapped in a single code block fenced with four tildes (~~~~). Keep all inner code blocks as ``` fences with language tags, all math as $...$ / $$...$$ LaTeX, all tables as Markdown pipe tables. Print nothing outside the tilde fence.',
    );
  });

  it('Claude prompt is exact (incl. four-backtick fence + NOT as an artifact)', () => {
    expect(HELPER_PROMPTS.claude).toBe(
      'Please repeat your previous answer in its entirety — verbatim content, nothing condensed or left out. Respond directly in the chat as a normal message, NOT as an artifact or document. Wrap the whole thing in one code block using a four-backtick fence (````) so inner triple-backtick code blocks stay intact. Use GitHub-flavored Markdown throughout: $...$ / $$...$$ for math, fenced code with language tags, pipe tables. No introduction or closing remark — the fenced block only.',
    );
  });

  it('Other/Generic prompt is exact', () => {
    expect(HELPER_PROMPTS.other).toBe(
      'Repeat your previous answer in full — verbatim, no summarizing, no omissions. Output it as raw GitHub-flavored Markdown inside a single code block fenced with four tildes (~~~~). Requirements: math in $...$ / $$...$$ LaTeX (no Unicode math symbols), code in ``` fenced blocks with language tags, tables as Markdown tables. Nothing before or after the fence.',
    );
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

  it('every prompt insists on full/verbatim re-output', () => {
    for (const id of ids) {
      expect(HELPER_PROMPTS[id].toLowerCase()).toMatch(
        /verbatim|word for word|in full|complete/,
      );
    }
  });
});
