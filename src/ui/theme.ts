// [UI] Design tokens — the single source of truth for colors, spacing, radius,
// typography and elevation used across every screen/component. Values are quoted
// EXACTLY from design/DESIGN-SPEC.md (§2 palette, §3 typography, §4 spacing/radius/
// elevation). Keep this file pure (no RN imports beyond types) so it unit-tests
// under plain jest and stays the one place a token can change.

/** §2 — Light palette (primary theme). Dark is out of scope for v0. */
export const colors = {
  // Core
  paper: '#F7F5F0', // app background
  card: '#FFFFFF', // cards, paste box, list items
  ink: '#1F2933', // primary text
  inkSoft: '#55606B', // secondary text
  trustBlue: '#1A5C9C', // accent, primary buttons, links, focus borders
  printGreen: '#0E7B47', // ONLY when a PDF is ready to print
  success: '#218358',
  error: '#B3362B', // errors, Delete
  // Tints
  blueTint: '#E9F1F9', // icon tiles, chips, PDF thumb bg, clipboard banner
  greenTint: '#E7F4EC', // check circles, Ready chip bg
  errorTint: '#FBEBE9', // error icon circle
  warnTint: '#FBF3E2', // no-printer sheet icon circle
  warnInk: '#8A6116',
  line: '#E3DFD6', // borders, dividers, progress track
  // Supporting
  pressedBlue: '#124577',
  disabledBg: '#DDD9D0',
  disabledText: '#9AA2AB',
  mutedIcon: '#8A94A0', // captions, muted icons
  secondaryBorder: '#C9CFD6',
  pressedListItem: '#EFECE5',
  bannerBorder: '#BDD5EC',
  toastBg: '#2B333B',
  previewCanvas: '#EBE8E1',
} as const;

/** §4 — Spacing scale (4-base). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** §4 — Corner radii. */
export const radius = {
  chip: 8,
  button: 12,
  card: 12,
  sheet: 16,
  pasteBox: 16,
  thumb: 4,
  smallPill: 10,
  bottomSheet: 20,
  pill: 100,
} as const;

/**
 * §3 — Type ramp. Family is the system stack (Roboto on Android) — RN resolves
 * the platform default, so we omit fontFamily and rely on the OS. Weights are
 * strings to satisfy RN's TextStyle.fontWeight. Body is deliberately 17px.
 */
export const type = {
  display: { fontSize: 30, lineHeight: 37, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 26, fontWeight: '400' },
  bodySmall: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  button: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 12.5, lineHeight: 18, fontWeight: '400' },
  // In-comp intermediates
  statusTitle: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  statusSub: { fontSize: 15.5, lineHeight: 23, fontWeight: '400' },
  listTitle: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  listSub: { fontSize: 13.5, lineHeight: 18, fontWeight: '400' },
} as const;

/** §4 — Elevation. Borders over shadows on budget panels; only sheets float. */
export const elevation = {
  // e1 — card
  card: {
    shadowColor: '#1F2933',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  // e2 — sheet
  sheet: {
    shadowColor: '#1F2933',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

/** §4 — Tap targets. */
export const touch = {
  min: 48, // minimum tap target everywhere
  cta: 56, // primary full-width button
} as const;

export const theme = { colors, spacing, radius, type, elevation, touch } as const;
export type Theme = typeof theme;
