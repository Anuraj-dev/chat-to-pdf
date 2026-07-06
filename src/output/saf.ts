// [4] OUTPUT — Android Storage Access Framework directory grant, persisted.
//
// SAF is the only way a managed Expo app can write into a user-visible folder
// (e.g. Documents/) on modern Android — no WRITE_EXTERNAL_STORAGE. The user
// picks a folder ONCE via the system picker; Android persists the grant across
// launches, and we remember WHICH directory was granted in AsyncStorage so we
// never re-prompt. Issue #8 (storage/history) reuses this same pattern.
//
// NOTE: imported from `expo-file-system/legacy` — in SDK 54 the package's
// default export is the new File/Directory API, and StorageAccessFramework
// only exists on the legacy API surface.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAccessFramework } from 'expo-file-system/legacy';

/** Namespaced AsyncStorage key holding the granted SAF directory URI. */
export const SAF_DIRECTORY_KEY = 'chat-to-pdf:output:saf-directory-uri';

/** Thrown when the user dismisses/denies the system folder picker. */
export class SaveAccessDeniedError extends Error {
  constructor() {
    super('Folder access was denied. Pick a folder to save PDFs into.');
    this.name = 'SaveAccessDeniedError';
  }
}

/** The previously granted directory URI, or null if never granted. */
export async function getPersistedDirectoryUri(): Promise<string | null> {
  return AsyncStorage.getItem(SAF_DIRECTORY_KEY);
}

/** Forget a stale/revoked grant so the next save re-prompts. */
export async function clearDirectoryGrant(): Promise<void> {
  await AsyncStorage.removeItem(SAF_DIRECTORY_KEY);
}

/**
 * Show the system folder picker, persist the granted directory URI, return it.
 * @throws SaveAccessDeniedError when the user denies/dismisses the picker.
 */
export async function requestDirectoryGrant(): Promise<string> {
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    throw new SaveAccessDeniedError();
  }
  await AsyncStorage.setItem(SAF_DIRECTORY_KEY, permission.directoryUri);
  return permission.directoryUri;
}
