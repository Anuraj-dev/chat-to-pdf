import { parseSemver, compareSemver, isNewer } from '../semver';

describe('parseSemver — vMAJOR.MINOR.PATCH → SemVer | null', () => {
  it('parses a plain version', () => {
    expect(parseSemver('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('strips a leading v (either case)', () => {
    expect(parseSemver('v1.0.0')).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parseSemver('V2.5.9')).toEqual({ major: 2, minor: 5, patch: 9 });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseSemver('  v1.0.1  ')).toEqual({ major: 1, minor: 0, patch: 1 });
  });

  it('ignores a -prerelease / +build suffix', () => {
    expect(parseSemver('1.2.3-beta.1')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseSemver('v1.2.3+ci.42')).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it('returns null for malformed input', () => {
    expect(parseSemver('')).toBeNull();
    expect(parseSemver('1.2')).toBeNull();
    expect(parseSemver('1.2.3.4')).toBeNull();
    expect(parseSemver('latest')).toBeNull();
    expect(parseSemver('v1.x.0')).toBeNull();
  });
});

describe('compareSemver / isNewer', () => {
  const v = (s: string) => parseSemver(s)!;

  it('orders by major, then minor, then patch', () => {
    expect(compareSemver(v('1.0.0'), v('2.0.0'))).toBe(-1);
    expect(compareSemver(v('1.2.0'), v('1.1.9'))).toBe(1);
    expect(compareSemver(v('1.1.1'), v('1.1.2'))).toBe(-1);
    expect(compareSemver(v('3.4.5'), v('3.4.5'))).toBe(0);
  });

  it('isNewer is strict (equal is not newer)', () => {
    expect(isNewer(v('1.0.1'), v('1.0.0'))).toBe(true);
    expect(isNewer(v('1.0.0'), v('1.0.0'))).toBe(false);
    expect(isNewer(v('1.0.0'), v('1.0.1'))).toBe(false);
  });
});
