// [4] OUTPUT — share the finished PDF via the system share sheet.
// See docs/specs/0001-architecture-foundation.md §4 (issue #7).

import * as Sharing from 'expo-sharing';

/** Thrown when the platform has no share sheet (e.g. some emulators/web). */
export class SharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device.');
    this.name = 'SharingUnavailableError';
  }
}

/** Open the system share sheet for a rendered PDF file URI. */
export async function sharePdf(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new SharingUnavailableError();
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share PDF',
    UTI: 'com.adobe.pdf', // iOS only; ignored on Android
  });
}
