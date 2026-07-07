// [UI] First-run flag persistence. Onboarding shows once; the flag lives in
// AsyncStorage under its own namespaced key (separate from history). Reads
// tolerate storage errors by treating the user as already-onboarded is WRONG —
// on error we default to NOT seen so a first-run user still gets the intro.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_KEY = 'chat-to-pdf:onboarded:v1';

/** True if the onboarding screen has already been dismissed. */
export async function hasOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
  } catch {
    return false; // on error, prefer showing the intro over silently skipping it
  }
}

/** Persist that onboarding is done (best-effort — a failure just re-shows it). */
export async function markOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Non-fatal: worst case the intro shows again next launch.
  }
}
