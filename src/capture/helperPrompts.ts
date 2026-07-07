// [1] CAPTURE — "Get the full answer" helper prompts (issue #11).
//
// Data-only module: the four per-AI prompts the user copies to their clipboard,
// paste into their AI chat, and get the WHOLE conversation's answers compiled
// into one clean, heading-structured markdown document. Kept as DATA (not baked
// into screen code) so the wording can be tuned without touching the UI layer.
//
// v2 (2026-07-07): rewritten from "repeat your previous answer" to
// whole-conversation compilation — students go back and forth over many turns,
// so grabbing only the last message dropped most of the content and produced
// heading-less output.
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

/** The four prompts — whole-conversation compilation (v2). */
export const HELPER_PROMPTS: Readonly<Record<AiId, string>> = {
  chatgpt:
    'Go through our ENTIRE conversation above — every answer you gave me, across all turns — and compile all of it into ONE complete, well-organized document. Include every explanation, list, step, code block, table, and equation from your answers in full; do not summarize, shorten, or omit anything. If you corrected or improved an answer in a later turn, keep only the final correct version. Leave out chat filler (greetings, "great question", apologies, offers to help) and my own messages — organize the content by topic as a standalone document, not a transcript. Structure it with Markdown headings: one # title naming the overall topic, a ## section for each major topic or question we covered (in the order we covered them), and ### for subsections. Output the result as raw GitHub-flavored Markdown inside ONE code block fenced with four tildes (~~~~) so inner ``` fences survive. Rules: math must use $...$ and $$...$$ LaTeX delimiters — never \\( \\), \\[ \\], or Unicode symbols like ² or √; code stays in fenced blocks with language tags; tables as Markdown tables. Output only the fenced block — no text before or after it.',
  gemini:
    'Review our ENTIRE conversation — every answer you gave me across all turns — and compile it into ONE complete, well-organized document, unabridged: every explanation, list, code block, table, and equation, with nothing summarized or dropped. If a later turn corrected an earlier answer, keep only the final version. Skip greetings, filler, and my messages — organize by topic under Markdown headings: one # title, ## per major topic in the order we covered them, ### for subsections. Format everything as plain GitHub-flavored Markdown source text (not rendered), wrapped in a single code block fenced with four tildes (~~~~). Keep all inner code blocks as ``` fences with language tags, all math as $...$ / $$...$$ LaTeX, all tables as Markdown pipe tables. Print nothing outside the tilde fence.',
  claude:
    'Please go through our ENTIRE conversation — every answer you gave me across all turns — and compile it into ONE complete, well-organized document. Keep the full substance: every explanation, list, code block, table, and equation, nothing condensed or left out; where a later turn corrected an earlier answer, keep only the final version. Drop the chat filler and my messages — organize by topic with Markdown headings: one # title, ## per major topic in the order we covered them, ### for subsections. Respond directly in the chat as a normal message, NOT as an artifact or document. Wrap the whole thing in one code block using a four-backtick fence (````) so inner triple-backtick code blocks stay intact. Use GitHub-flavored Markdown throughout: $...$ / $$...$$ for math, fenced code with language tags, pipe tables. No introduction or closing remark — the fenced block only.',
  other:
    'Go through our ENTIRE conversation — every answer you gave me across all turns — and compile it into ONE complete, well-organized document. Include the full content of your answers (explanations, lists, code, tables, equations) with no summarizing and no omissions; keep only the final version where you corrected yourself. Exclude greetings, filler, and my messages — organize by topic with Markdown headings (# title, ## major topics in order, ### subsections). Output it as raw GitHub-flavored Markdown inside a single code block fenced with four tildes (~~~~). Requirements: math in $...$ / $$...$$ LaTeX (no Unicode math symbols), code in ``` fenced blocks with language tags, tables as Markdown tables. Nothing before or after the fence.',
} as const;

/** Get the copy-ready prompt text for a given AI. */
export function getHelperPrompt(id: AiId): string {
  return HELPER_PROMPTS[id];
}
