# CDF — Design Spec (from `CDF App Design.dc.html`)

Implementation-oriented spec for React Native. All values are quoted exactly from the design file (section `t1`, options `1a`–`1g`). Aesthetic intent, per the design: "calm government-grade utility — warm paper neutrals, one trust-blue accent, a green reserved for 'ready to print'. Everything offline, no account, nothing implying data leaves the phone."

Frames are designed at 392 × 830 dp (Android portrait).

---

## 1. Screens

Total app surface is **5 screens** (the design says so explicitly) plus edge/error states.

### 1b — Onboarding (first-run, one screen, no carousel)
- Background `#F7F5F0`, padding `24px 24px 20px`, vertical flex with spacers (`flex:1.2` above content, `flex:2` below).
- App icon tile: 76×76, radius 20, bg `#E9F1F9`, containing a PDF-document glyph (white doc, `2.5px solid #1A5C9C` border, "PDF" label `700 10px`, dog-ear corner).
- Headline: `700 30px/37px Roboto` `#1F2933` — "Copy an answer.<br>Get a clean PDF."
- Sub: `400 17px/26px` `#55606B` — "Paste anything you copied from ChatGPT or Gemini. CDF turns it into a neat A4 page you can print or hand in."
- 3 reassurance rows (gap 14, `margin-top:28px`): 26×26 circle bg `#E7F4EC` with green check (`2.5px #0E7B47`), text `400 16px/22px` `#1F2933`:
  1. "Works without internet"
  2. "No account, no sign-in"
  3. "Math, code and tables come out right"
- Footer caption: `400 13px/18px` `#8A94A0`, centered — "Everything stays on your phone. Nothing is uploaded."
- Primary button: 56dp, radius 12, bg `#1A5C9C`, label "Start" `600 17px` white.
- **Interaction:** shown once. "Start" cross-fades straight into Home (200 ms). No permissions asked, no skip needed.

### 1c — Home / Capture
Two states shown:

**Empty / first-run**
- Bg `#F7F5F0`, padding `8px 20px 20px`.
- Top bar (height 56): wordmark "CDF" `700 22px` `#1F2933` `letter-spacing:-.01em` left; right a 48dp-tall "History" text button — clock icon (18×18, `2px solid #55606B` circle + hands) + label `600 15px` `#55606B`.
- **Clipboard offer banner** (appears only when the clipboard holds text): bg `#E9F1F9`, border `1.5px solid #BDD5EC`, radius 12, padding `12px 14px`. Title "You copied something — use it?" `600 14px/19px` `#1A5C9C`; one-line ellipsized snippet `400 13.5px/18px` `#55606B`. Right-aligned pill button "Paste it": height 40, radius 10, bg `#1A5C9C`, white `600 14.5px`. One tap fills the paste box and enables the CTA.
- **Paste box** (fills remaining height): bg `#fff`, border `1.5px solid #E3DFD6`, radius 16. Centered dashed-doc glyph (`2px dashed #C9CFD6`), prompt "Paste an answer you copied from ChatGPT or Gemini" `400 17px/25px` `#55606B`, helper "Tap here, hold for a second, then tap Paste" `400 13px/18px` `#8A94A0`.
- **Make PDF** button: 56dp, radius 12, `margin-top:16px`. Disabled here: bg `#DDD9D0`, text `#9AA2AB`. Always visible even when disabled "so the goal is never a mystery".

**Filled / ready**
- Paste box border becomes `2px solid #1A5C9C`; content `400 15px/23px` `#1F2933`; bottom fade-out gradient (72px, transparent→`#fff`).
- Overlaid bottom row inside the box: page-estimate chip "About 1 page" — `500 13px/18px` `#1A5C9C` on `#E9F1F9`, radius 100, padding `5px 12px`; and "Clear" secondary chip — height 40, radius 10, border `1.5px solid #C9CFD6`, bg `#fff`, `600 14px` `#55606B`.
- Make PDF enabled: bg `#1A5C9C`, white text. One tap → Processing (1d); "no options, no settings".

### 1d — Processing
- Bg `#F7F5F0`, centered column, padding 24 (spacers `flex:1.3` / `flex:2`).
- Document illustration: 88×110 white card, `2.5px solid #1A5C9C`, radius 6, dog-ear corner, skeleton lines (`#C9D9EA` first line, `#E3EBF4` rest).
- **Progress bar**: 200×8, radius 4, track `#E3DFD6`, fill `#1A5C9C` animated with `cdfbar` (`2.2s ease-out forwards`; keyframes `0%{width:8%} 60%{width:74%} 100%{width:92%}`). Bar animates to ~90% and snaps to done when render completes — "fast-feeling, never stuck at 99%".
- Status: "Making your PDF…" `600 20px/28px` `#1F2933`; sub "Tidying up the math, code and tables." `400 15.5px/23px` `#55606B`; caption "Usually takes under 5 seconds." `400 13px/18px` `#8A94A0`.
- "Cancel" text button at bottom: height 48, `600 15px` `#55606B`.
- If rendering takes > 10 s the status line changes to "Almost there — long answers take a little longer."

### 1e — PDF Preview (hero screen)
- Page-viewer background `#EBE8E1` (darker than app bg so the white A4 page pops).
- **Header** (56dp, bg `#F7F5F0`, bottom border `1px solid #E3DFD6`): 48×48 back chevron (`2.5px #1F2933`); title `600 17px/22px` `#1F2933` ellipsized ("Quadratic equations — roots"); subtitle `400 12.5px/16px` `#8A94A0` ("2 pages · A4 · saved on your phone"); right **Ready chip**: bg `#E7F4EC`, radius 100, padding `5px 11px`, green check + "Ready" `600 12.5px` `#0E7B47`.
- **A4 page**: white sheet 330×466 (A4 ratio), `box-shadow:0 2px 10px rgba(31,41,51,.16)`, padding `26px 28px`. Document typography is `Georgia,'Times New Roman',serif` in `#1B222A` — the real render: block equation with true fraction bar, inline italic math, ruled table (borders `0.5px solid #9AA2AB`, header bg `#F1F0EC`), syntax-highlighted code block (bg `#F6F6F4`, border `0.5px solid #DDDBD4`, radius 3, monospace, colors: keyword `#8250DF`, name/number `#0550AE`, comment `#6E7781`, body `#24292F`), footer rule + "Page 1 of 2".
- Page indicator below sheet: "Page 1 of 2 · swipe to see page 2" `500 13px/18px` `#55606B`.
- **Action bar** (bg `#F7F5F0`, top border `1px solid #E3DFD6`, padding `10px 20px 16px`, gap 10):
  - **Print** (flex 1.5): 56dp, radius 12, bg `#0E7B47`, white `600 17px`, printer icon. Green = "ready to go"; opens Android's print dialog.
  - **Save** (flex 1): 56dp, bg `#fff`, border `1.5px solid #C9CFD6`, `600 16px` `#1F2933`. Writes to Downloads.
  - **Share** (flex 1): same secondary style. Opens the system share sheet ("WhatsApp → print shop is the common path").
- Pinch to zoom; swipe between pages. The file is already saved to History **before** this screen appears — nothing can be lost.

### 1f — History
- Bg `#F7F5F0`, padding `8px 20px 20px`. Header: back chevron + "History" `600 22px` `#1F2933`. Sub-caption: "Saved on your phone. Open any of these without internet." `400 13.5px/19px` `#8A94A0`.
- List of history items (gap 10) — see component spec §5.5.
- **Interactions:** tap reopens the doc in Preview (1e) — no separate detail screen. Long-press reveals an inline action row on the item (see §5.5). Delete confirms once: "Delete this PDF? You can't undo this." No FAB — PDFs are made from Home.

**Empty state**
- Centered: 64×78 dashed-doc glyph (`2.5px dashed #C9CFD6`, radius 6, lines `#DDD9D0`); "No PDFs yet" `600 19px/26px` `#1F2933`; "Your PDFs will appear here, saved on your phone — no internet needed to open them." `400 15.5px/23px` `#55606B`; outline button "Make your first PDF" — height 48, radius 12, border `1.5px solid #1A5C9C`, `600 15.5px` `#1A5C9C`.

### 1g — Edge & error states ("calm, blame-free, always a way out")
1. **Clipboard empty (toast)** — dark toast over Home: bg `#2B333B`, radius 12, padding `14px 16px`, shadow `0 6px 20px rgba(31,41,51,.25)`, positioned above the CTA (bottom 92). Text `500 14.5px/21px` white: "Nothing on your clipboard yet. Copy an answer first, then come back — we'll spot it." Empty paste never becomes an error — Make PDF just stays disabled (with the helper string from 1a if tapped: "Paste some text first — tap and hold the box, then tap Paste.").
2. **Render failed (full screen)** — 72×72 circle bg `#FBEBE9` with `#B3362B` exclamation; "That didn't work" `600 20px/28px` `#1F2933`; "Don't worry — your text is safe and still in the box. This is our fault, not yours." `400 15.5px/23px` `#55606B`. Buttons: primary "Try again" (56dp blue) + text button "Go back to my text" (48, `600 15px` `#55606B`). After 2 failures the sub-line adds: "Still stuck? Try making the PDF from a smaller part of the answer."
3. **No printer found (bottom sheet)** — scrim `rgba(31,41,51,.45)`; sheet bg `#F7F5F0`, radius `20px 20px 0 0`, shadow `0 -6px 24px rgba(31,41,51,.2)`, grab handle 36×4 `#C9CFD6`. Warm icon circle bg `#FBF3E2`, printer glyph `#8A6116`. Title "No printer found nearby"; body "Your PDF is safe and saved. You can print it later at a print shop — just save it or share it on WhatsApp." Actions: "Save PDF to my phone" (56dp blue primary), "Share on WhatsApp instead" (56dp white secondary, border `1.5px solid #C9CFD6`), "Look for printers again" (48dp text button `#55606B`).

---

## 2. Color palette (exact hex)

### Light (primary theme)
| Token | Hex | Use |
|---|---|---|
| Paper | `#F7F5F0` | App background |
| Card | `#FFFFFF` | Cards, paste box, list items |
| Ink | `#1F2933` | Primary text |
| Ink-soft | `#55606B` | Secondary text |
| Trust blue | `#1A5C9C` | Accent, primary buttons, links, focus borders |
| Print green | `#0E7B47` | **Only** when a PDF is ready to print (Print button, Ready chip) |
| Success | `#218358` | Success |
| Error | `#B3362B` | Errors, Delete |
| Blue tint | `#E9F1F9` | Icon tiles, chips, PDF thumb bg, clipboard banner |
| Green tint | `#E7F4EC` | Check circles, Ready chip bg |
| Error tint | `#FBEBE9` | Error icon circle |
| Line | `#E3DFD6` | Borders, dividers, progress track |

Supporting values used in comps: pressed blue `#124577`; disabled button bg `#DDD9D0` / disabled text `#9AA2AB`; muted icon/caption gray `#8A94A0`; secondary-button border `#C9CFD6`; pressed list-item fill `#EFECE5`; clipboard-banner border `#BDD5EC`; toast bg `#2B333B`; warning tint `#FBF3E2` / warning ink `#8A6116`; preview canvas `#EBE8E1`; PDF-page ink `#1B222A`.

Rule: "green is used **only** when a PDF is ready to print — the user learns green = go. Saturated colors never fill large areas."

### Dark variant (quick)
`bg #15191E · card #1E242B · blue #5E96CC · green #4CAF7E`

---

## 3. Typography

Family: **system stack `Roboto, system-ui, sans-serif`** ("zero download, renders instantly on any Android"). Only two weights in practice (400 / 600–700). Body is deliberately large (17px) for sunlight readability on low-density screens.

| Style | Size/Line · Weight | Example use |
|---|---|---|
| Display | 30/36 · 700 | Onboarding headline |
| Title | 22/28 · 600 | Screen titles ("Your PDF is ready") |
| Body | 17/26 · 400 | Body copy, paste-box prompt |
| Body-small | 15/22 · 400 | List metadata ("2 pages · Yesterday, 4:12 pm") |
| Button | 17/24 · 600 | Primary buttons |
| Caption | 12.5/18 · 400 | "Everything stays on your phone" |

In-comp intermediate sizes also used: 500 16/22 (list titles), 400 13.5/18 (list subtitles), 600 20/28 (status/sheet titles), 400 15.5/23 (status sub-copy), 600 14.5–15px (small buttons).

**PDF document itself** (preview render, not UI): `Georgia, 'Times New Roman', serif`; code in `ui-monospace, Menlo, Consolas, monospace`.

---

## 4. Spacing / radius / elevation / iconography

- **Spacing (4-base):** `4 · 8 · 12 · 16 · 24 · 32`
- **Radius:** `8` chips · `12` buttons/cards · `16` sheets & paste box. (Also seen: 4 for PDF-thumb, 10 for small pills, 20 for bottom sheet top corners, 100 for pill chips.)
- **Elevation:**
  - `e0` — border only (`1px solid #E3DFD6`)
  - `e1` — card: `box-shadow: 0 1px 3px rgba(31,41,51,.12)`
  - `e2` — sheet: `box-shadow: 0 6px 20px rgba(31,41,51,.18)`
  - Rationale: "Borders over shadows: heavy shadows band and smear on budget LCD panels. Only floating sheets get real depth."
- **Icons:** outlined, **2px stroke**, geometric. Every icon ships with a text label — never an unlabeled symbol.
- **Tap targets:** minimum **48 dp** everywhere; the primary button is **56 dp**, full-width, always in the bottom third of the screen (right-thumb reachable).

---

## 5. Reusable components (states/variants)

### 5.1 Primary button (56 dp, radius 12, full-width)
- Default: bg `#1A5C9C`, text white `600 17px Roboto`
- Pressed: bg `#124577`
- Disabled: bg `#DDD9D0`, text `#9AA2AB`
- Loading: default bg + 18px spinner (`2.5px solid rgba(255,255,255,.35)`, top color `#fff`, `animation: cdfspin 1s linear infinite`) + label "Making PDF…"

### 5.2 Print button (green, Preview only)
56 dp, radius 12, bg `#0E7B47`, white `600 17px`, printer icon.

### 5.3 Secondary button
56 dp, radius 12, bg `#fff`, border `1.5px solid #C9CFD6`, text `#1F2933` `600 16–17px`. Smaller variant: 40–48 dp (e.g. "Clear"). Outline-accent variant: border `1.5px solid #1A5C9C`, text `#1A5C9C` ("Make your first PDF"). Text-button variant: no border/bg, `600 15px` `#55606B` (Cancel, "Go back to my text").

### 5.4 Paste box (multiline input, radius 16, bg `#fff`)
- Default: border `1.5px solid #E3DFD6`, placeholder `400 15px/22px` `#8A94A0`, padding `14px 16px`
- Focused/filled: border `2px solid #1A5C9C`, text `#1F2933`, caret `#1A5C9C`; bottom fade gradient + "About N page(s)" chip + "Clear" chip
- Error: border `2px solid #B3362B`, helper below `400 12.5px/18px` `#B3362B`: "Paste some text first — tap and hold the box, then tap Paste."

### 5.5 History list item (card, radius 12, border `1px solid #E3DFD6`, min-height 56, padding `14px 16px`, gap 14)
- Leading PDF thumb: 40×48, border `2px solid #1A5C9C`, radius 4, bg `#E9F1F9`, "PDF" `700 11px` `#1A5C9C`
- Title `500 16px/22px` `#1F2933` ellipsized; subtitle `400 13.5px/18px` `#55606B` ("2 pages · Today, 9:24 am")
- Trailing chevron: 10×10, `2px #8A94A0`, rotated
- Pressed: bg `#EFECE5` — "darker fill, no ripple animation — instant feedback that still reads on a slow 60 Hz panel"
- Long-pressed (expanded): card border becomes `2px solid #1A5C9C`; inline action row appears under a `1px solid #E3DFD6` divider — three 48dp cells `600 14.5px`: "Print again" `#0E7B47` · "Share" `#1A5C9C` · "Delete" `#B3362B`, separated by `1px solid #E3DFD6`

### 5.6 Clipboard offer banner
Bg `#E9F1F9`, border `1.5px solid #BDD5EC`, radius 12, padding `12px 14px`; title `600 14px/19px` `#1A5C9C`, snippet `400 13.5px/18px` `#55606B` ellipsized; "Paste it" pill (40dp, radius 10, bg `#1A5C9C`). Shown automatically only when the clipboard holds text.

### 5.7 Chips / status pills
- Page-estimate chip: `#E9F1F9` bg, `#1A5C9C` `500 13px`, radius 100, padding `5px 12px`
- Ready chip: `#E7F4EC` bg, `#0E7B47` `600 12.5px`, radius 100, padding `5px 11px`, green check

### 5.8 Empty states (paste box, history)
Dashed-outline document glyph (`#C9CFD6` dashed border, `#DDD9D0`/`#C9CFD6` lines) + title (`600 19px/26px #1F2933` in History) + reassuring body `#55606B` + a single exit action.

### 5.9 Toast
Bg `#2B333B`, radius 12, padding `14px 16px`, shadow `0 6px 20px rgba(31,41,51,.25)`, text white `500 14.5px/21px`. Anchored above the bottom CTA.

### 5.10 Bottom sheet
Bg `#F7F5F0`, top radius 20, shadow `0 -6px 24px rgba(31,41,51,.2)`, 36×4 `#C9CFD6` grab handle, scrim `rgba(31,41,51,.45)`; centered 64dp tinted icon circle; title `600 20px/28px`; stacked actions (primary/secondary/text).

### 5.11 Top bars
Home: "CDF" wordmark left + "History" text-icon button right (48dp target). Sub-screens: 48×48 back chevron + `600 17–22px` title (+ optional subtitle / right chip). Height 56, bg `#F7F5F0`, optional bottom border `#E3DFD6`.

### 5.12 Progress bar
200×8, radius 4, track `#E3DFD6`, fill `#1A5C9C`.

---

## 6. Navigation structure

No tab bar, no drawer, no FAB. Flat stack, 5 screens:

```
Onboarding (once) ── cross-fade 200ms ──► Home/Capture
Home ── "Make PDF" ──► Processing ──► PDF Preview
Home ── "History" ──► History ── tap item ──► PDF Preview (same screen reused)
Processing ── "Cancel" ──► back to Home (text preserved)
Render-failed ── "Try again" / "Go back to my text"
Preview ── back chevron ──► Home (or History if opened from there)
```

- History items reopen Preview directly — there is deliberately **no** document-detail screen.
- The PDF is persisted to History before Preview is shown.
- Modals: delete confirm dialog; "No printer" bottom sheet (from Print).

## 7. Animation & interaction inventory

| Name | Definition | Where |
|---|---|---|
| `cdfspin` | `@keyframes cdfspin{to{transform:rotate(360deg)}}` — `1s linear infinite` | Button loading spinner ("Making PDF…") |
| `cdfbar` | `@keyframes cdfbar{0%{width:8%}60%{width:74%}100%{width:92%}}` — `2.2s ease-out forwards` | Processing progress bar; snaps from ~92% to done on completion |
| Cross-fade | 200 ms | Onboarding → Home |
| Pressed states | Instant color swap (no ripple) | Buttons (`#124577`), list items (`#EFECE5`) |
| Clipboard offer | Appears automatically when clipboard has text | Home |
| Pinch-zoom + horizontal page swipe | Native gestures | PDF Preview |
| Long-press | Reveals inline action row | History item |
| Toast | Appears above CTA on empty-clipboard paste | Home |
| Bottom sheet | Slides up with scrim | No-printer state |
| Adaptive copy | >10 s render → "Almost there…"; 2 failures → "try a smaller part" hint | Processing / error |

---

## 8. Notes for RN implementation

- Design frame: 392×830; use dp values as-is.
- Primary CTA is always full-width, 56dp, bottom third of screen.
- Suppress Android ripple (use plain pressed-color feedback) per the design's explicit "no ripple" note.
- Dark theme exists only as a 4-token sketch (`#15191E / #1E242B / #5E96CC / #4CAF7E`) — full dark palette needs design follow-up.
