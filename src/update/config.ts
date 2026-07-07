// [UPDATE] Spec 0002 — where the self-updater looks for new APKs, and how it
// recognises the two required release assets. Source of truth = GitHub Releases
// on Anuraj-dev/chat-to-pdf (no custom backend). Kept in one place so the repo
// coordinates never leak into fetch/parse logic.

/** The GitHub repo whose Releases are the update source (spec §3). */
export const UPDATE_REPO = { owner: 'Anuraj-dev', name: 'chat-to-pdf' } as const;

/** GitHub REST API base (unauthenticated; 60 req/hr/IP is plenty for a button). */
export const GITHUB_API_BASE = 'https://api.github.com';

/** `/releases/latest` already excludes drafts and prereleases (spec §3). */
export function latestReleaseUrl(): string {
  return `${GITHUB_API_BASE}/repos/${UPDATE_REPO.owner}/${UPDATE_REPO.name}/releases/latest`;
}

/**
 * Release-asset matchers (spec §3 contract: exactly one `*.apk` + a companion
 * `*.apk.sha256`). `SHA256_ASSET` is tested first when picking the apk so the
 * `.apk.sha256` sibling is never mistaken for the binary.
 */
export const SHA256_ASSET = /\.apk\.sha256$/i;
export const APK_ASSET = /\.apk$/i;
