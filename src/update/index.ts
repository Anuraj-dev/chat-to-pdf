// [UPDATE] Spec 0002 — GitHub-Releases self-updater. Barrel for the update
// module: check → download+verify → install. See docs/specs/0002-in-app-update.md.

export { UPDATE_REPO, GITHUB_API_BASE, latestReleaseUrl, APK_ASSET, SHA256_ASSET } from './config';
export { parseSemver, compareSemver, isNewer, type SemVer } from './semver';
export type { ReleaseAsset, LatestRelease, UpdateCheckResult, DownloadOutcome } from './models';
export {
  resolveUpdate,
  parseSha256Line,
  parseLatestRelease,
  checkForUpdate,
} from './githubReleases';
export { runDownload, sha256OfFile, base64ToBytes, cleanupApk } from './download';
export { launchInstaller, openUnknownSourcesSettings, InstallLaunchError } from './installer';
