// [UPDATE] Spec 0002 — hand a downloaded APK to Android's package installer.
//
// Flow (spec §6.5): turn the cache `file://` URI into a `content://` URI via
// `FileSystem.getContentUriAsync` (backed by Expo's BUILT-IN FileProvider), then
// fire an INSTALL intent with the apk MIME type and a read-URI grant. The OS
// installer takes over.
//
// Unknown-sources gate: this Expo/SDK-54 build of `expo-application` exposes no
// `canRequestPackageInstalls` check, so we can't pre-detect the permission. We
// attempt the intent; if it throws, the caller shows a "allow install unknown
// apps" message with a button that calls `openUnknownSourcesSettings`.
//
// TODO(on-device, spec §7): verify the package installer ACCEPTS Expo's built-in
// FileProvider content URI. If it silently no-ops, add a config plugin that
// injects our own FileProvider (authority `${applicationId}.provider` +
// res/xml/provider_paths.xml `<cache-path name="updates" path="updates/"/>`).

import { applicationId } from 'expo-application';
import { getContentUriAsync } from 'expo-file-system/legacy';
import { startActivityAsync } from 'expo-intent-launcher';

/** Android `Intent.FLAG_GRANT_READ_URI_PERMISSION` — lets the installer read the URI. */
const FLAG_GRANT_READ_URI_PERMISSION = 1;

const APK_MIME = 'application/vnd.android.package-archive';

/** Thrown when neither install intent could be launched. */
export class InstallLaunchError extends Error {
  constructor(cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    super(`Couldn't open the installer: ${detail}`);
    this.name = 'InstallLaunchError';
  }
}

/**
 * Launch the system package installer for the APK at `fileUri`.
 * @throws InstallLaunchError if the install intent can't be started (commonly
 *         because "install unknown apps" isn't allowed for this app).
 */
export async function launchInstaller(fileUri: string): Promise<void> {
  const contentUri = await getContentUriAsync(fileUri);
  const params = {
    data: contentUri,
    type: APK_MIME,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  };

  try {
    // INSTALL_PACKAGE is the direct action; some OEM ROMs only honour VIEW.
    await startActivityAsync('android.intent.action.INSTALL_PACKAGE', params);
  } catch (installErr) {
    try {
      await startActivityAsync('android.intent.action.VIEW', params);
    } catch {
      throw new InstallLaunchError(installErr);
    }
  }
}

/**
 * Open Android's "install unknown apps" screen for THIS app so the user can
 * grant the permission, then retry the install.
 */
export async function openUnknownSourcesSettings(): Promise<void> {
  await startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
    data: `package:${applicationId}`,
  });
}
