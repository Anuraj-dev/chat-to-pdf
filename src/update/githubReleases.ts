// [UPDATE] Spec 0002 — talk to the GitHub Releases API and reduce it to an
// UpdateCheckResult. The pure core (`resolveUpdate`, `parseSha256Line`) is
// unit-tested and never touches the network; `checkForUpdate` is the thin async
// shell that fetches, maps HTTP failure modes, and delegates to the pure core.

import { APK_ASSET, SHA256_ASSET, latestReleaseUrl } from './config';
import type { LatestRelease, ReleaseAsset, UpdateCheckResult } from './models';
import { isNewer, parseSemver } from './semver';

/** GitHub's raw release JSON shape (only the fields we read). */
interface GithubReleaseJson {
  tag_name?: unknown;
  body?: unknown;
  assets?: unknown;
}

/**
 * Pure decision core (spec §6.2): given the installed version, a release tag and
 * its assets, decide what the user should see. No I/O — this is the tested heart.
 *
 * - Unparseable version on either side ⇒ `MalformedMetadata` (fail-safe).
 * - Latest ≤ current ⇒ `UpToDate`.
 * - Missing `.apk` or `.apk.sha256` ⇒ `MissingAsset`.
 * - Otherwise ⇒ `UpdateAvailable`.
 */
export function resolveUpdate(
  current: string,
  tag: string,
  assets: ReleaseAsset[],
): UpdateCheckResult {
  const currentSem = parseSemver(current);
  const latestSem = parseSemver(tag);
  if (!currentSem) {
    return { kind: 'MalformedMetadata', reason: `installed version "${current}" is not semver` };
  }
  if (!latestSem) {
    return { kind: 'MalformedMetadata', reason: `release tag "${tag}" is not semver` };
  }

  if (!isNewer(latestSem, currentSem)) {
    return { kind: 'UpToDate', current };
  }

  // SHA256_ASSET is matched first so the `.apk.sha256` sibling can't be picked
  // as the binary.
  const sha256 = assets.find((a) => SHA256_ASSET.test(a.name));
  const apk = assets.find((a) => !SHA256_ASSET.test(a.name) && APK_ASSET.test(a.name));
  if (!apk || !sha256) {
    return {
      kind: 'MissingAsset',
      reason: `release ${tag} needs both a .apk and a .apk.sha256 asset`,
    };
  }

  // `notes` (release body) isn't part of the assets-only signature; the network
  // layer (`checkForUpdate`) attaches it. Pure core leaves it empty.
  return {
    kind: 'UpdateAvailable',
    version: tag.trim().replace(/^v/i, ''),
    apkUrl: apk.downloadUrl,
    sha256Url: sha256.downloadUrl,
    notes: '',
  };
}

/**
 * Pull the 64-char hex digest out of a `sha256sum` line — the hex before the
 * first whitespace (`<hex>  <filename>`). Returns null if it isn't a clean
 * SHA-256 hex string.
 */
export function parseSha256Line(text: string): string | null {
  const token = text.trim().split(/\s+/)[0] ?? '';
  return /^[0-9a-f]{64}$/i.test(token) ? token.toLowerCase() : null;
}

/** Normalise GitHub's assets JSON into our slim ReleaseAsset[]. */
function toAssets(raw: unknown): ReleaseAsset[] {
  if (!Array.isArray(raw)) return [];
  const out: ReleaseAsset[] = [];
  for (const item of raw) {
    const name = item?.name;
    const url = item?.browser_download_url;
    if (typeof name === 'string' && typeof url === 'string') {
      out.push({ name, downloadUrl: url });
    }
  }
  return out;
}

/** Parse the `/releases/latest` body into a LatestRelease, or null if unusable. */
export function parseLatestRelease(json: GithubReleaseJson): LatestRelease | null {
  if (typeof json?.tag_name !== 'string') return null;
  return {
    tag: json.tag_name,
    notes: typeof json.body === 'string' ? json.body : '',
    assets: toAssets(json.assets),
  };
}

/**
 * Fetch the latest release and reduce it to an UpdateCheckResult (spec §6.2).
 * Maps 403/429 → `RateLimited` and any thrown network error → `Offline`.
 */
export async function checkForUpdate(current: string): Promise<UpdateCheckResult> {
  let response: Response;
  try {
    response = await fetch(latestReleaseUrl(), {
      headers: { Accept: 'application/vnd.github+json' },
    });
  } catch (err) {
    return {
      kind: 'Offline',
      message: err instanceof Error ? err.message : 'No connection',
    };
  }

  if (response.status === 403 || response.status === 429) {
    return { kind: 'RateLimited' };
  }
  if (!response.ok) {
    return {
      kind: 'MalformedMetadata',
      reason: `GitHub returned HTTP ${response.status}`,
    };
  }

  let release: LatestRelease | null;
  try {
    release = parseLatestRelease((await response.json()) as GithubReleaseJson);
  } catch {
    release = null;
  }
  if (!release) {
    return { kind: 'MalformedMetadata', reason: 'release payload was not readable' };
  }

  const result = resolveUpdate(current, release.tag, release.assets);
  // `resolveUpdate` can't see the notes body (assets-only signature), so attach
  // it here when an update is actually available.
  return result.kind === 'UpdateAvailable'
    ? { ...result, notes: release.notes }
    : result;
}
