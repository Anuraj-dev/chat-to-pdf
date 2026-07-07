import { theme, colors, spacing, radius, type, touch } from '../theme';

describe('theme tokens', () => {
  it('exposes the exact spec palette hexes (§2)', () => {
    expect(colors.paper).toBe('#F7F5F0');
    expect(colors.card).toBe('#FFFFFF');
    expect(colors.ink).toBe('#1F2933');
    expect(colors.trustBlue).toBe('#1A5C9C');
    expect(colors.printGreen).toBe('#0E7B47');
    expect(colors.error).toBe('#B3362B');
  });

  it('uses the 4-base spacing scale (§4)', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32]);
  });

  it('defines the spec radii (§4): chip 8, button/card 12, sheet/paste 16', () => {
    expect(radius.chip).toBe(8);
    expect(radius.button).toBe(12);
    expect(radius.card).toBe(12);
    expect(radius.sheet).toBe(16);
    expect(radius.pasteBox).toBe(16);
  });

  it('sets body copy to 17px (§3 sunlight readability)', () => {
    expect(type.body.fontSize).toBe(17);
  });

  it('sets the primary CTA target to 56dp and the min target to 48dp (§4)', () => {
    expect(touch.cta).toBe(56);
    expect(touch.min).toBe(48);
  });

  it('bundles every group under the default export', () => {
    expect(theme.colors).toBe(colors);
    expect(theme.spacing).toBe(spacing);
    expect(theme.radius).toBe(radius);
    expect(theme.type).toBe(type);
    expect(theme.touch).toBe(touch);
  });
});
