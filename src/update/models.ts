// [UPDATE] Spec 0002 — sealed-union result types for the update flow. Every step
// returns a `kind`-tagged variant so the UI state machine (UpdateSheet) can
// exhaustively switch and never guess. No behaviour here — pure data shapes.

/** One downloadable file attached to a GitHub release. */
export interface ReleaseAsset {
  name: string;
  downloadUrl: string;
}

/** The parsed `/releases/latest` payload we care about. */
export interface LatestRelease {
  tag: string;
  notes: string;
  assets: ReleaseAsset[];
}

/**
 * Outcome of checking GitHub for a newer release (spec §6). `resolveUpdate`
 * produces the pure variants; the network layer adds `RateLimited` / `Offline`.
 */
export type UpdateCheckResult =
  | { kind: 'UpToDate'; current: string }
  | {
      kind: 'UpdateAvailable';
      version: string;
      apkUrl: string;
      sha256Url: string;
      notes: string;
    }
  // Tag or installed version wasn't parseable → fail-safe, don't offer an update.
  | { kind: 'MalformedMetadata'; reason: string }
  // Newer release exists but is missing the `.apk` and/or `.apk.sha256` asset.
  | { kind: 'MissingAsset'; reason: string }
  | { kind: 'RateLimited' }
  | { kind: 'Offline'; message: string };

/**
 * Outcome of downloading + verifying the APK (spec §6.4). `Unverified` is the
 * deliberate non-blocking fallback: the hash couldn't be COMPUTED (e.g. the
 * ~60MB base64 round-trip OOM'd), so we surface a warning but still allow the
 * install. A `ChecksumMismatch` — a hash that computed but disagreed — always
 * blocks and deletes the file.
 */
export type DownloadOutcome =
  | { kind: 'Verified'; fileUri: string }
  | { kind: 'Unverified'; fileUri: string; warning: string }
  | { kind: 'ChecksumMismatch' }
  | { kind: 'Failed'; message: string };
