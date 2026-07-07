// [UPDATE] Spec 0002 — stream the release APK into the app cache and verify it
// against the companion `.apk.sha256`. All fs work goes through
// `expo-file-system/legacy` (SDK 54's default export is the new File/Directory
// API; the legacy surface has the download + string-read calls we rely on).
//
// SHA-256 method (decided per task): `sha256sum` hashes RAW file bytes, and
// `expo-crypto.digestStringAsync` would hash a STRING's UTF-8 bytes — those
// don't match. So we read the APK as base64, decode it to the actual bytes, and
// feed those bytes to `expo-crypto.digest(SHA-256, bytes)` (which hashes a
// BufferSource natively). That digest matches standard `sha256sum` output, so CI
// must produce the `.apk.sha256` with plain `sha256sum` (spec §8).
//
// Non-blocking fallback: the base64 round-trip of a ~60MB APK is memory-heavy on
// budget phones. If HASHING itself throws (e.g. OOM), we DON'T block the update —
// we return `Unverified{warning}` and let the user install, matching the task's
// "verification is a non-blocking warning if not performantly reachable" call.
// A hash that computes but DISAGREES still blocks (`ChecksumMismatch`). Revisit
// if we ever get a native file-hash API. TODO(on-device): confirm the round-trip
// holds for a real ~60MB APK on the Motorola; if it OOMs often, chunk the read.

import { digest, CryptoDigestAlgorithm } from 'expo-crypto';
import {
  EncodingType,
  cacheDirectory,
  createDownloadResumable,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';
import type { DownloadOutcome, UpdateCheckResult } from './models';
import { parseSha256Line } from './githubReleases';

/** The narrowed "update available" variant `runDownload` operates on. */
type AvailableUpdate = Extract<UpdateCheckResult, { kind: 'UpdateAvailable' }>;

/** Subdirectory of the cache where update APKs land. */
const UPDATES_DIR = 'updates/';

/** Derive a safe on-disk filename from the asset URL, defaulting by version. */
function apkFilename(update: AvailableUpdate): string {
  const fromUrl = update.apkUrl.split('/').pop() ?? '';
  return /\.apk$/i.test(fromUrl) ? fromUrl : `chat-to-pdf-${update.version}.apk`;
}

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode a standard base64 string to raw bytes (pure, no atob dependency). */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const lookup = new Uint8Array(256);
  for (let i = 0; i < B64_ALPHABET.length; i++) lookup[B64_ALPHABET.charCodeAt(i)] = i;

  const clean = base64.replace(/[^A-Za-z0-9+/]/g, ''); // drop newlines / padding
  const byteLength = Math.floor((clean.length * 3) / 4);
  // Allocate over a concrete ArrayBuffer so the view is a valid BufferSource for
  // expo-crypto's digest() (a bare `new Uint8Array(n)` widens to ArrayBufferLike).
  const bytes = new Uint8Array(new ArrayBuffer(byteLength));

  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    const d = lookup[clean.charCodeAt(i + 3)];
    if (p < byteLength) bytes[p++] = (a << 2) | (b >> 4);
    if (p < byteLength) bytes[p++] = ((b & 15) << 4) | (c >> 2);
    if (p < byteLength) bytes[p++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

/** Render an ArrayBuffer as lowercase hex. */
function toHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < view.length; i++) hex += view[i].toString(16).padStart(2, '0');
  return hex;
}

/**
 * Compute the SHA-256 of the file at `fileUri` (matching `sha256sum`). Throws if
 * the read/decode/hash fails — the caller decides whether that's blocking.
 */
export async function sha256OfFile(fileUri: string): Promise<string> {
  const base64 = await readAsStringAsync(fileUri, { encoding: EncodingType.Base64 });
  const bytes = base64ToBytes(base64);
  const buffer = await digest(CryptoDigestAlgorithm.SHA256, bytes);
  return toHex(buffer);
}

/**
 * Download the APK with progress, then verify its checksum (spec §6.4).
 * `onProgress` receives 0..1. Mismatch deletes the file and blocks; a hashing
 * failure degrades to a non-blocking `Unverified` warning.
 */
export async function runDownload(
  update: AvailableUpdate,
  onProgress: (fraction: number) => void,
): Promise<DownloadOutcome> {
  if (!cacheDirectory) {
    return { kind: 'Failed', message: 'No cache directory available on this device.' };
  }

  const dir = cacheDirectory + UPDATES_DIR;
  const fileUri = dir + apkFilename(update);

  try {
    // makeDirectoryAsync with intermediates is idempotent — safe to re-run.
    await makeDirectoryAsync(dir, { intermediates: true });

    const task = createDownloadResumable(update.apkUrl, fileUri, {}, (p) => {
      const total = p.totalBytesExpectedToWrite;
      if (total > 0) onProgress(p.totalBytesWritten / total);
    });
    const result = await task.downloadAsync();
    if (!result) {
      return { kind: 'Failed', message: 'Download was interrupted.' };
    }
  } catch (err) {
    return {
      kind: 'Failed',
      message: err instanceof Error ? err.message : 'Download failed.',
    };
  }

  // Fetch and parse the expected checksum.
  let expected: string | null;
  try {
    const shaText = await (await fetch(update.sha256Url)).text();
    expected = parseSha256Line(shaText);
  } catch {
    expected = null;
  }
  if (!expected) {
    return {
      kind: 'Unverified',
      fileUri,
      warning: "Couldn't read the checksum file — the download wasn't verified.",
    };
  }

  // Compute the file hash. A COMPUTED mismatch blocks; a hashing FAILURE warns.
  let actual: string;
  try {
    actual = await sha256OfFile(fileUri);
  } catch (err) {
    console.warn('[update] sha256 verification skipped:', err);
    return {
      kind: 'Unverified',
      fileUri,
      warning: "Couldn't verify the download on this device — install with caution.",
    };
  }

  if (actual !== expected) {
    try {
      await deleteAsync(fileUri, { idempotent: true });
    } catch {
      // Best-effort cleanup; the mismatch is what matters.
    }
    return { kind: 'ChecksumMismatch' };
  }

  return { kind: 'Verified', fileUri };
}

/** Delete a leftover cached APK (e.g. after a mismatch or a successful install). */
export async function cleanupApk(fileUri: string): Promise<void> {
  try {
    const info = await getInfoAsync(fileUri);
    if (info.exists) await deleteAsync(fileUri, { idempotent: true });
  } catch {
    // Non-fatal.
  }
}
