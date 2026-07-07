// [UPDATE] Spec 0002 — minimal semver for comparing the installed `version`
// (from app.json / expo-application) against a release `tag_name`. Deliberately
// tiny: we only ship `vMAJOR.MINOR.PATCH` tags. Anything we can't parse returns
// null so the caller can fail-safe to "up to date" (never a false update prompt,
// spec §3). A `-prerelease`/`+build` suffix is tolerated but ignored — release
// tags are plain, and ignoring the suffix keeps the compare total.

/** A parsed semantic version. Suffixes are dropped at parse time. */
export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

// v?  MAJOR . MINOR . PATCH  (optional -pre / +build we ignore)
const SEMVER_RE = /^[vV]?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

/** Parse `"v1.2.3"` / `"1.2.3"` → SemVer; anything malformed → null. */
export function parseSemver(input: string): SemVer | null {
  const match = SEMVER_RE.exec(input.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

/** Order two versions: -1 if a<b, 0 if equal, 1 if a>b. */
export function compareSemver(a: SemVer, b: SemVer): -1 | 0 | 1 {
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (a[key] < b[key]) return -1;
    if (a[key] > b[key]) return 1;
  }
  return 0;
}

/** True only when `candidate` is strictly newer than `current`. */
export function isNewer(candidate: SemVer, current: SemVer): boolean {
  return compareSemver(candidate, current) === 1;
}
