// [4] OUTPUT — persist the rendered PDF out of the app cache into a
// user-visible folder via SAF (see ./saf.ts for the grant lifecycle).

import {
  EncodingType,
  getInfoAsync,
  readAsStringAsync,
  StorageAccessFramework,
} from 'expo-file-system/legacy';
import {
  clearDirectoryGrant,
  getPersistedDirectoryUri,
  requestDirectoryGrant,
} from './saf';

// SAF writes go through a base64 string round-trip (no native file:// →
// content:// copy), so a 25MB PDF becomes a ~33MB JS string plus copies while
// bridging. 25MB is a safe ceiling for low-RAM devices.
export const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Thrown when the rendered PDF is too big to round-trip through base64. */
export class PdfTooLargeError extends Error {
  constructor(sizeBytes: number) {
    super(
      `This PDF is too large to save (${Math.round(sizeBytes / (1024 * 1024))}MB, ` +
        `limit ${MAX_PDF_BYTES / (1024 * 1024)}MB). Try Share or Print instead.`,
    );
    this.name = 'PdfTooLargeError';
  }
}

/** Thrown when the SAF create/write itself fails on a healthy grant. */
export class SaveFailedError extends Error {
  constructor(cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Couldn't save the PDF: ${detail}`);
    this.name = 'SaveFailedError';
  }
}

/**
 * Copy the PDF at `uri` (expo-print cache output) into the user's granted SAF
 * directory as `filename`. Prompts for a directory only on first use, or when
 * the persisted grant no longer works (folder deleted / permission revoked).
 * Returns the SAF content:// URI of the saved file.
 *
 * @throws PdfTooLargeError      if the PDF exceeds MAX_PDF_BYTES.
 * @throws SaveAccessDeniedError if the user denies the folder picker.
 * @throws SaveFailedError       if the write fails on a healthy grant.
 */
export async function savePdf(uri: string, filename: string): Promise<string> {
  // Size guard BEFORE anything else — don't even prompt if we can't save it.
  const info = await getInfoAsync(uri);
  if (info.exists && typeof info.size === 'number' && info.size > MAX_PDF_BYTES) {
    throw new PdfTooLargeError(info.size);
  }

  // SAF's createFileAsync wants the name WITHOUT extension — it appends one
  // derived from the MIME type.
  const baseName = filename.replace(/\.pdf$/i, '');

  // Staleness is decided HERE, by an explicit preflight — never inferred from
  // create/write failures (those can be disk-full or provider errors that must
  // surface, not silently re-prompt).
  const dirUri = await resolveWritableDirectory();

  // SAF has no native copy from file:// — round-trip the bytes as base64.
  const base64 = await readAsStringAsync(uri, {
    encoding: EncodingType.Base64,
  });

  try {
    const fileUri = await StorageAccessFramework.createFileAsync(
      dirUri,
      baseName,
      'application/pdf',
    );
    await StorageAccessFramework.writeAsStringAsync(fileUri, base64, {
      encoding: EncodingType.Base64,
    });
    return fileUri;
  } catch (err) {
    throw new SaveFailedError(err);
  }
}

/**
 * Return a directory URI we can actually write into: reuse the persisted
 * grant if it still answers a readDirectoryAsync preflight; otherwise clear
 * it and re-prompt once. No cached grant → prompt.
 */
async function resolveWritableDirectory(): Promise<string> {
  const cached = await getPersistedDirectoryUri();
  if (cached !== null) {
    try {
      await StorageAccessFramework.readDirectoryAsync(cached);
      return cached;
    } catch {
      // Grant went stale — forget it and fall through to a fresh prompt.
      await clearDirectoryGrant();
    }
  }
  return requestDirectoryGrant(); // throws SaveAccessDeniedError on denial
}
