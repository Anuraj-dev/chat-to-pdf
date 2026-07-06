# Spec 0001 — Architecture Foundation (v0)

> The load-bearing shape of chat-to-pdf. Read `docs/decisions.md` for the *why* behind each choice; this is the *what* and *how it fits together*.

## 1. What we're building

A mobile-first, **Android-first** app that turns an AI chat answer (ChatGPT / Gemini markdown) into a clean, **printable** PDF — for phone-only, budget, low-connectivity students in India (A4 paper).

**One-line flow:** Student copies an AI answer → opens app → answer is there → one tap → clean PDF → print / save / share. Unlocking *print* is the prize.

**The market gap = the difficulty:** one-tap simplicity + clean math/code/table formatting. Android has effectively no real competitor.

## 2. The pipeline (the whole app)

```
[1] CAPTURE  →  [2] PARSE  →  [3] RENDER  →  [4] OUTPUT / STORE
 clipboard/     markdown-it   HTML+print     expo-print → PDF file,
 paste text     → HTML(+KaTeX) CSS document   print / save / share, save to history
```

Layer 3 (Render) is ~80% of the hard part. Everything else is plumbing.

## 3. Locked architecture (v0)

- **Everything on-device. No backend, no auth, no account, no network dependency.**
- **Render:** markdown → HTML + print CSS → `expo-print` (Android WebView + PrintManager) → PDF.
- **Stack:** React Native + Expo (managed) + TypeScript.
- **Capture (v1):** manual copy-paste. Share-sheet target deferred to v2.
- **Parse:** `markdown-it` + KaTeX plugin.
- **Math:** KaTeX, bundled offline.
- **Storage:** `expo-sqlite` (doc metadata + history) + `expo-file-system` (PDF bytes). No login.
- **Build/dev:** EAS Build cloud; local machine only Node + `eas-cli`; iterate via Expo Go on a physical phone.

## 4. Module map (target source layout)

```
app/                      # expo-router screens (UI — driver builds, low learning priority)
  index.tsx               # Home: paste box + "Make PDF" button
  preview.tsx             # PDF preview + print/save/share actions
  history.tsx             # saved documents list
src/
  capture/                # [1] clipboard read, paste handling, input cleanup
  parse/                  # [2] markdown-it setup, katex plugin, markdown → HTML
  render/                 # [3] HTML template + print CSS (THE hard part)
    template.ts           #     HTML skeleton, <style> injection
    print.css.ts          #     @page, page-break rules, A4, fonts (print-css.rocks)
    katex/                #     bundled KaTeX css/fonts
    toPdf.ts              #     expo-print wrapper (html → file uri)
  output/                 # [4] print / save-to-files / share via expo-sharing
  storage/                # expo-sqlite schema + expo-file-system helpers
  types/                  # shared TS types (Document, RenderResult, etc.)
assets/fonts/             # embedded fonts (math + monospace + body)
```

## 5. Known risks / hard edges (from research)

- **Android WebView print bugs** — trailing blank pages; content breaking mid-page even with `page-break-inside: avoid`; `overflow: scroll` cutting off instead of paginating; `position: absolute` disrupting breaks. **Prefer `display: block` over flex for print layout.**
- **CSS Paged Media** — `@page` margins work; broader spec support is inconsistent/OEM-dependent.
- **Math/code/table fidelity is officially undocumented** — must be empirically proven early (see Spike below), and re-tested per Android WebView update (version-sensitive).
- **Font embedding** — fonts must be embedded or print substitutes garbage math/monospace glyphs. Bundle + embed body, monospace, and KaTeX fonts.
- **EAS free tier** — 15 Android builds/mo, 1 concurrent, queue can be slow at peak. Minimize native rebuilds; stay in Expo Go while possible.

## 6. v0 build order (de-risk first)

1. **Spike (throwaway):** render one hard sample — a KaTeX equation + a syntax-highlighted code block + a multi-row table — to PDF on a real phone via expo-print; inspect page breaks and glyphs. **Go/no-go on the render decision.**
2. **Project scaffold:** `create-expo-app` (TS), add the four modules, expo-router, EAS config, one-time `eas login`/`EXPO_TOKEN`.
3. **Parse layer:** markdown-it + katex → HTML, unit-tested against sample AI answers.
4. **Render layer:** HTML template + print CSS (A4, page breaks, embedded fonts). The quality core.
5. **Capture layer:** paste box + clipboard read + cleanup.
6. **Output layer:** print / save / share via expo-print + expo-sharing.
7. **Storage/history:** sqlite + file-system, list + reopen.
8. **Preview screen + polish:** one-tap flow end to end.

## 7. Explicitly out of scope for v0

Server-side rendering, share-sheet capture, accounts/cloud sync, iOS, monetization/pricing, MathJax, hybrid render fallback. All revisitable post-v0.

## 8. Open items for Raja to confirm when back

- Any of the §3 defaults he wants to override (all are reversible except the on-device/render-engine pair he already confirmed).
- Monetization direction (₹ one-time vs ad-supported) — deferred, not blocking.
- App name / package id / branding for the Expo config.
