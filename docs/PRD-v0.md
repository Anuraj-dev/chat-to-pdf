# PRD — chat-to-pdf v0

> Android-first Expo app that turns AI chat answers into clean, printable PDFs, entirely on-device. Foundation locked in `docs/specs/0001-architecture-foundation.md` and `docs/decisions.md`.

## Problem Statement

Phone-only, budget students (India) get great answers from ChatGPT/Gemini but can't turn them into something they can **print or hand in**. Every existing path is painful: screenshots that clip, markdown that pastes broken into Google Docs, or desktop-only browser extensions they can't run on a phone. Math, code, and tables — exactly the content that matters for schoolwork — break worst. On Android there is effectively no real solution.

## Solution

A dead-simple Android app: the student copies an AI answer, opens the app, the answer is already there, and one tap produces a clean, A4, print-ready PDF they can print, save, or share. Everything happens on-device — no account, no internet, no cost. The differentiator is **one-tap simplicity** plus **clean math/code/table formatting** that survives all the way to paper.

## User Stories

1. As a phone-only student, I want to paste a copied AI answer into the app, so that I don't have to retype or reformat anything.
2. As a student, I want the app to auto-fill from my clipboard when I open it, so that the flow feels like "one tap."
3. As a student, I want to tap one button and get a PDF, so that I don't have to learn any settings.
4. As a student, I want math equations (`$$...$$`) to render as real formatted math, so that my science/math homework looks correct.
5. As a student, I want code blocks to keep their formatting and monospacing, so that programming answers are readable.
6. As a student, I want tables to render as real tables, so that comparison answers are legible on paper.
7. As a student, I want the PDF sized for A4, so that it prints correctly on Indian printers.
8. As a student, I want code blocks and tables to not split awkwardly across page breaks, so that the printout is clean.
9. As a student, I want to preview the PDF before printing, so that I can confirm it looks right.
10. As a student, I want to print directly from the app, so that I can get a hard copy at home or a print shop.
11. As a student, I want to save the PDF to my phone's files, so that I can find it later.
12. As a student, I want to share the PDF (WhatsApp, email, print-shop), so that I can send it where I need it.
13. As a student, I want a history of documents I've made, so that I can re-open or re-print without redoing the work.
14. As a student, I want to re-open a past document and regenerate its PDF, so that I can reprint after losing the file.
15. As a student, I want the app to work fully offline, so that patchy data or no data doesn't stop me.
16. As a privacy-conscious student, I want my answers to never leave my phone, so that my schoolwork stays private.
17. As a student with a budget phone, I want the app to be fast and small, so that it runs on cheap hardware.
18. As a student, I want fonts to look right when printed (math symbols, monospace), so that the printout isn't garbled.
19. As a student, I want to delete documents from history, so that I can keep the app tidy.
20. As a first-time user, I want an obvious empty state that tells me to paste an answer, so that I know what to do.

## Implementation Decisions

- **On-device only. No backend, auth, account, or network dependency.** (confirmed)
- **Pipeline:** Capture → Parse → Render → Output/Store, as four `src/` modules.
- **Render engine:** markdown → `markdown-it` (+ KaTeX plugin) → HTML + print CSS → `expo-print` (Android WebView + PrintManager) → PDF. Not direct PDF drawing. (confirmed)
- **Stack:** React Native + Expo (managed) + TypeScript; expo-router for screens.
- **Capture v1:** manual copy-paste + clipboard read. Share-sheet target is v2/out of scope.
- **Math:** KaTeX, bundled offline (CSS + fonts embedded), not CDN.
- **Storage:** `expo-sqlite` (document metadata + history) + `expo-file-system` (PDF bytes). No login.
- **Print CSS:** `@page` for A4 margins; prefer `display: block` over flex (WebView print reliability); `page-break-inside: avoid` on code/tables (verify on device); embed all fonts (body, monospace, KaTeX).
- **Build/dev:** EAS Build cloud; local machine only Node + `eas-cli`; iterate via Expo Go on a physical Android phone (LAN or `--tunnel`); shareable test APK via `eas build --profile preview`; auth via `EXPO_TOKEN`.
- **Module seams (test boundaries):** `parse` (markdown string → HTML string) is a pure function — the highest, cheapest seam. `render` (HTML → PDF file URI) is an integration seam that needs a device/WebView. `storage` (CRUD over sqlite) is a data seam. UI screens sit above these and are thin.

## Testing Decisions

- **What makes a good test:** exercise external behavior at a seam, not implementation details. The `parse` module is the primary unit-test target because it's a pure `string → string` function — feed representative AI answers (with math, code, tables, mixed markdown), assert on the produced HTML structure. This is the highest-value seam and needs no device.
- **`storage`** gets data-layer tests (create/list/get/delete round-trips) against an in-memory/temp sqlite.
- **`render`** (expo-print) cannot be meaningfully unit-tested — its correctness is *visual* and device-dependent. It is validated by the **render spike** and manual on-device PDF inspection, not automated tests. This is a deliberate, documented gap.
- **Prior art:** none yet (greenfield). Establish a jest + `ts-jest`/`jest-expo` setup during scaffold as the pattern for all future tests.

## Out of Scope (v0)

Server-side rendering; share-sheet capture; accounts / cloud sync; iOS; monetization / pricing; MathJax; hybrid render fallback; multi-answer stitching; theming/branding beyond a clean default. All revisitable post-v0.

## Further Notes

- **Highest risk, tackled first:** Android WebView's *print* engine has documented bugs (trailing blank pages, mid-page breaks, flex unreliable, `position:absolute` disrupts breaks) and its math/code/table print fidelity is officially undocumented. The **first work item is a throwaway spike** proving expo-print can clear the quality bar on a real phone. If it can't, the render decision is revisited before any UI is built.
- Fidelity is version-sensitive to the Android WebView — retest after WebView updates.
- Full rationale for every decision: `docs/decisions.md`. Architecture detail: `docs/specs/0001-architecture-foundation.md`.
