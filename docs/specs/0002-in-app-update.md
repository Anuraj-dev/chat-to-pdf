# Spec 0002 — In-App Update (GitHub-Releases self-updater)

> Let a sideloaded chat-to-pdf install check for, download, verify, and install a newer APK from GitHub
> Releases — no Play Store, no `expo-updates`. Inspired by `Snehit70/pomo`'s native Kotlin updater,
> re-implemented for managed Expo (SDK 54). Read `docs/decisions.md` for the *why*; this is the *what/how*.

## 1. What we're building

chat-to-pdf ships as a sideloaded APK (EAS `preview`/`production` APK, not on Play Store). There is no
built-in update path today — a user with v1.0.0 stays on v1.0.0 forever. This feature adds a **manual
"Check for updates"** action that:

1. Queries the GitHub Releases API for the latest release of the app's repo.
2. Compares the release tag (`vX.Y.Z`) to the installed `version` via semver.
3. If newer → downloads the release's `.apk` asset, verifies it against a companion `.apk.sha256`,
   then hands the file to Android's system package installer.

Scope: **manual check only** (button, not background polling), **Android only**, **v0 of the feature**.

## 2. Why pomo's approach fits (and where it doesn't)

- pomo is a **bare Kotlin/Compose** app; its updater is hand-rolled around GitHub Releases + a system
  install intent. That mechanism (whole-APK replacement) is exactly right for a **sideloaded** app.
- `expo-updates` is **not** the answer here: it swaps the JS bundle OTA, cannot ship native/binary changes,
  and can't move someone off an old APK. We deliberately do **not** use it.
- The reusable ~80% of pomo (semver, releases fetch/parse, UI state machine, sha256 verify) ports 1:1 to
  TypeScript. The ~20% that's native — launching the OS installer via a `FileProvider` content URI +
  `REQUEST_INSTALL_PACKAGES` — is the only part needing Expo native config.

## 3. Locked decisions

- **Source of truth = GitHub Releases** on `Anuraj-dev/chat-to-pdf`. No custom backend/server.
- **Release contract (every published release):** tag `vMAJOR.MINOR.PATCH`; exactly one `*.apk` asset and a
  companion `*.apk.sha256` asset (plain `sha256sum` output). Draft/prerelease excluded (the `/latest`
  endpoint already skips them).
- **Signing continuity is non-negotiable:** every release APK must be signed with the **same** Android
  keystore, or in-place install is rejected by the OS. EAS already manages one keystore per project
  (`Build Credentials WcDeRw6Z45`) — we must keep using it and never regenerate.
- **Version compare** on `expo-application` `nativeApplicationVersion` (mirrors `app.json` `version`) vs the
  release tag. Unparseable on either side ⇒ fail-safe to "up to date" (never a false update prompt).
- **Manual trigger only** in v0. No background job, no auto-download, no nag.
- **No new heavy deps**: reuse `expo-file-system` (already in) for download/hash-input; add only
  `expo-intent-launcher` (install intent) and `expo-application` (installed version). SHA-256 via
  `expo-crypto` (small, first-party) — decided over a JS impl.

## 4. Placement (UX)

There is no Settings screen today (screens: Home, Processing, Preview, History, Onboarding, Error). Options:
- **(Recommended)** Add an "About / Updates" row reachable from the Home `TopBar` overflow, rendered as a
  bottom sheet (`HelperSheet` pattern already exists) — smallest new surface, no nav changes.
- Alternative: a dedicated `SettingsScreen` + nav entry (more scaffolding; defer unless we add other settings).

The update UI is a self-contained state machine card inside that sheet — mirrors pomo's `UpdateSection`.

## 5. Module map (new/changed)

```
src/update/                         # NEW — all update logic, pure TS + thin native calls
  semver.ts                         # parse/compare "vMAJOR.MINOR.PATCH" (strip "v"/suffix; bad ⇒ null)
  githubReleases.ts                 # fetch /repos/{owner}/{repo}/releases/latest; -> UpdateCheckResult
  models.ts                         # LatestRelease, UpdateCheckResult, DownloadOutcome sealed unions
  download.ts                       # stream apk -> cacheDir/updates/, sha256 verify (expo-file-system+crypto)
  installer.ts                      # content URI (getContentUriAsync) + IntentLauncher install intent
  config.ts                         # REPO owner/name, API base, asset-name matchers
  index.ts                          # barrel
  __tests__/                        # semver + resolveUpdate + sha-parse are pure ⇒ unit-tested
src/ui/components/
  UpdateSheet.tsx                   # NEW — the state-machine card (Idle→Checking→Available→Downloading→…)
src/ui/screens/HomeScreen.tsx       # CHANGED — TopBar overflow entry that opens UpdateSheet
plugins/withAndroidInstaller.js     # NEW — config plugin: REQUEST_INSTALL_PACKAGES (+ FileProvider if needed)
app.json                            # CHANGED — register plugin; keep version as the semver source
.github/workflows/release.yml       # NEW — tag vX.Y.Z ⇒ EAS build APK ⇒ sha256 ⇒ attach to GH Release
```

## 6. Mechanism end-to-end

1. **Trigger** — user opens the About/Updates sheet, taps "Check for updates" → state `Checking`.
2. **Check** — `githubReleases.check(currentVersion)`:
   - `GET https://api.github.com/repos/Anuraj-dev/chat-to-pdf/releases/latest` (no auth; unauthenticated
     rate limit 60/hr/IP is plenty for a manual button — handle 403/429 as a distinct "rate limited" state).
   - Parse `tag_name`, `body` (release notes), `assets[]`.
   - `resolveUpdate(current, tag, assets)` (pure, tested): bad semver ⇒ `MalformedMetadata`; `latest <= current`
     ⇒ `UpToDate`; missing `.apk` or `.apk.sha256` ⇒ `MissingAsset`; else `UpdateAvailable{version, apkUrl,
     sha256Url, notes}`.
   - Network error ⇒ `Offline`.
3. **Show** — `Available` renders version + notes + "Download & install"; other results render their message.
4. **Download + verify** — `download.run(release, onProgress)`:
   - Stream the apk into `${cacheDirectory}updates/<name>.apk` with progress callbacks.
   - Fetch the `.sha256` text, take the hex before the first space, compute the file's SHA-256 via
     `expo-crypto`/file hash, compare case-insensitively. Mismatch ⇒ delete file, `Failed("checksum")`.
5. **Install** — `installer.launch(fileUri)`:
   - If `!canRequestPackageInstalls` (Android O+) → open `ACTION_MANAGE_UNKNOWN_APP_SOURCES` for our package,
     tell the user to allow, and let them retry.
   - Else get a `content://` URI (`FileSystem.getContentUriAsync`, backed by Expo's FileProvider) and
     `IntentLauncher.startActivityAsync('android.intent.action.VIEW' / INSTALL_PACKAGE)` with MIME
     `application/vnd.android.package-archive` + `FLAG_GRANT_READ_URI_PERMISSION`. OS installer takes over.

## 7. Deps & config

- Add: `expo-intent-launcher`, `expo-application`, `expo-crypto` (all first-party, `expo install`).
- Manifest via config plugin `plugins/withAndroidInstaller.js`:
  - `<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>` (add through
    `app.json` `android.permissions` if the plugin route proves unnecessary).
  - **FileProvider:** first verify whether `FileSystem.getContentUriAsync` (Expo's built-in FileProvider)
    yields a URI the package installer accepts. If yes → no custom provider needed (simplest). If the
    installer rejects it, the plugin must inject our own `FileProvider` (authority `${applicationId}.provider`)
    + `res/xml/provider_paths.xml` with `<cache-path name="updates" path="updates/"/>`. **This is the #1
    thing to verify on-device before considering the feature done.**
- `app.json` `version` stays the single semver source (already `1.0.0`); bump it per release.

## 8. Release / CI contract

`.github/workflows/release.yml`, triggered on pushing a `v*` tag:
1. `eas build --platform android --profile preview --non-interactive --wait` (same keystore).
2. Download the APK artifact, rename to `chat-to-pdf-<version>.apk`, `sha256sum > chat-to-pdf-<version>.apk.sha256`.
3. `softprops/action-gh-release` (or `gh release create`) uploads both assets under the `vX.Y.Z` tag.
   Requires `EXPO_TOKEN` secret for headless EAS. Manual first release is acceptable if CI slips.

## 9. Risks / hard edges

- **FileProvider acceptance** (see §7) — the install intent silently no-ops if the content URI or grant is
  wrong. Verify with a real newer APK on the Motorola before calling it done.
- **Signing drift** — if EAS ever regenerates the keystore, every installed user is stranded (must uninstall
  to update). Guard: never regenerate; document the credential id.
- **`REQUEST_INSTALL_PACKAGES` + Play** — this permission is fine for sideloaded but is a Play policy flag; if
  we ever list on Play, gate the whole feature off for the Play flavor.
- **Rate limit** — unauthenticated 60/hr/IP; a manual button won't hit it, but surface 403/429 cleanly.
- **`expo-file-system` v19 API** — uses the new File/Directory API; download-to-file + hashing must be written
  against v19 (not the legacy `downloadAsync` signatures) — confirm the exact call shape at build time.
- **First update is untestable until two releases exist** — bootstrap by tagging `v1.0.0` now (current
  build) so a future `v1.0.1` has something to update *from*.

## 10. Out of scope (this spec)

Background/auto update checks, delta updates, iOS, Play In-App Updates API, changelog history browser,
staged rollouts, signature pinning beyond sha256. All revisitable later.

## 11. Build order

1. `expo install` the three deps; write `plugins/withAndroidInstaller.js`; register in `app.json`.
2. Pure core first (TDD-friendly): `semver.ts`, `models.ts`, `githubReleases.ts` (`resolveUpdate`), sha-parse
   — unit tests mirror pomo's.
3. `download.ts` + `installer.ts` against the real expo-file-system v19 / IntentLauncher APIs.
4. `UpdateSheet.tsx` state machine + Home `TopBar` entry.
5. Config plugin + **on-device FileProvider verification** with a hand-built newer APK.
6. `.github/workflows/release.yml`; tag `v1.0.0` as the baseline release.
7. `npm run typecheck` + `npm test` green; then a real EAS rebuild carrying the feature.
