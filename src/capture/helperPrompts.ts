// [1] CAPTURE — "Get the full answer" helper prompts (issue #11).
//
// Data-only module: the four per-AI prompts the user copies to their clipboard,
// paste into their AI chat, and get their complete answer re-output as clean,
// copy-ready markdown. Kept as DATA (not baked into screen code) so the wording
// can be tuned without touching the UI layer. Ship texts are VERBATIM from the
// issue #11 spec.
//
// Pure — no React / native / expo imports; unit-testable under plain jest.
//
// NOTE on backslashes: the ChatGPT prompt literally contains `\( \)` and `\[ \]`.
// A lone `\(` in a JS string is a no-op escape that DROPS the backslash, so those
// must be written as `\\(` / `\\)` etc. to survive to the clipboard verbatim.

/** The AI the user is pasting back into — drives which prompt gets copied. */
export type AiId = 'chatgpt' | 'gemini' | 'claude' | 'other';

/** One picker row: a stable id + the human-facing label shown in the sheet. */
export interface AiOption {
  id: AiId;
  label: string;
}

/** Picker order shown in the AI-picker sheet (design/DESIGN-SPEC.md §5.10). */
export const AI_OPTIONS: readonly AiOption[] = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'claude', label: 'Claude' },
  { id: 'other', label: 'Other' },
] as const;

/**
 * The plain-language instruction shown after a one-tap copy — tells the sister
 * exactly what to do next, zero jargon (issue #11 UX).
 */
export const HELPER_INSTRUCTION =
  "Paste this into your chat, then copy the AI's reply back here.";

/** The four prompts, VERBATIM from the issue #11 spec. */
export const HELPER_PROMPTS: Readonly<Record<AiId, string>> = {
  chatgpt:
    'Reproduce your previous answer in full, word for word — every section, list item, code block, table, and equation. Do not summarize, shorten, or omit anything. Output it as raw GitHub-flavored Markdown inside ONE code block fenced with four tildes (~~~~) so inner ``` fences survive. Rules: math must use $...$ and $$...$$ LaTeX delimiters — never \\( \\), \\[ \\], or Unicode symbols like ² or √; code stays in fenced blocks with language tags; tables as Markdown tables. Output only the fenced block — no text before or after it.',
  gemini:
    'Take your previous answer and output it again, complete and unabridged — nothing summarized or dropped. Format it as plain GitHub-flavored Markdown source text (not rendered), wrapped in a single code block fenced with four tildes (~~~~). Keep all inner code blocks as ``` fences with language tags, all math as $...$ / $$...$$ LaTeX, all tables as Markdown pipe tables. Print nothing outside the tilde fence.',
  claude:
    'Please repeat your previous answer in its entirety — verbatim content, nothing condensed or left out. Respond directly in the chat as a normal message, NOT as an artifact or document. Wrap the whole thing in one code block using a four-backtick fence (````) so inner triple-backtick code blocks stay intact. Use GitHub-flavored Markdown throughout: $...$ / $$...$$ for math, fenced code with language tags, pipe tables. No introduction or closing remark — the fenced block only.',
  other:
    'Repeat your previous answer in full — verbatim, no summarizing, no omissions. Output it as raw GitHub-flavored Markdown inside a single code block fenced with four tildes (~~~~). Requirements: math in $...$ / $$...$$ LaTeX (no Unicode math symbols), code in ``` fenced blocks with language tags, tables as Markdown tables. Nothing before or after the fence.',
} as const;

/** Get the copy-ready prompt text for a given AI. */
export function getHelperPrompt(id: AiId): string {
  return HELPER_PROMPTS[id];
}
