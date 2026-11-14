<p align="center">
  <img src="assets/icon.png" alt="chat-to-pdf logo" width="88" height="88" />
</p>

<h1 align="center">chat-to-pdf</h1>

<p align="center">
  Turn an AI chat answer into a clean, printable A4 PDF on your Android phone.<br />
  Paste the answer, tap Make PDF, then print, share or save. The conversion runs on the phone, with no account and no server.
</p>

<p align="center">
  <a href="https://github.com/Anuraj-dev/chat-to-pdf/releases/latest">Download the APK</a>
  ·
  <a href="#installation">Installation</a>
  ·
  <a href="#run-from-source">Run from source</a>
  ·
  <a href="#documentation">Documentation</a>
</p>

chat-to-pdf takes the Markdown behind a ChatGPT or Gemini answer and produces a PDF with real headings, code cards, tables and math. It also works on a whole conversation. The app gives you a prompt to paste into your chat, and the AI replies with one compiled document that you paste back into the app.

It is an Expo app written in TypeScript on React Native, pinned to Expo SDK 54. Each PDF goes through four stages: capture the text, parse the Markdown to HTML with KaTeX and syntax highlighting, render that HTML with `expo-print`, then save a copy to your history. There is no backend and no API key. The only network calls are the update check and the APK download from GitHub Releases.

## What you get

- **Offer the clipboard on open.** When the app comes to the foreground, it reads the clipboard and offers the text in a banner. The banner shows only while the paste box is empty. A copy you dismiss stays dismissed until the clipboard changes.
- **Clean input before parsing.** Zero-width characters and the "Copy code" labels that chat UIs paste into code blocks are removed. Math written as `\(...\)` and `\[...\]` becomes `$` and `$$` delimiters, so the formulas render.
- **Math and code with no runtime.** KaTeX and highlight.js run at parse time, so the printed page is static HTML with no JavaScript. Highlighting covers about 36 common languages. Code prints as cards with a language label, and a block longer than 40 lines may split across pages.
- **A fixed A4 page.** The PDF is rendered at 595 by 842 points, because Android ignores the CSS page size. The KaTeX and JetBrains Mono fonts are embedded in the page, so printing never needs a network connection.
- **Page counts read from the file.** The page count comes from the PDF bytes. The number that expo-print reports is only a fallback, because on Android it can be far off.
- **History that outlives the cache.** Each PDF is copied into the app's document folder, along with an HTML snapshot for Preview. The history keeps the 100 most recent documents, and deleting one removes its files.
- **Print, share or save.** Print opens the system print dialog, and Share opens the share sheet. Save writes into a folder you choose once, and the picker opens at Documents when Android allows it. Files over 25 MB can be shared or printed, but not saved.
- **A prompt for the whole conversation.** "Get better results" copies a prompt for ChatGPT, Gemini or another app. It asks the AI to send every answer, with later corrections applied, as one Markdown document inside a single fenced block.

## Installation

| Method | Where |
| --- | --- |
| Release APK | [GitHub Releases](https://github.com/Anuraj-dev/chat-to-pdf/releases/latest) |
| From source | [Run from source](#run-from-source), with Expo Go on your phone |

### Install the APK

Open the latest release on your Android phone and download `chat-to-pdf-<version>.apk`. Android asks you to allow installs from the app you downloaded it with. Each release is signed with the same key, so a new version installs over the old one.

To update, tap the info button in the top bar, labeled About and updates, then tap Check for updates. The app downloads the new APK, checks it against the release's `.apk.sha256` file, and opens the Android installer. A checksum mismatch blocks the install and deletes the file. If the app cannot compute the checksum, it shows a warning and still lets you install. Updates are checked only when you ask, and only on Android.

### Run from source

You need Node, npm and Expo Go on an Android phone. The project pins Expo SDK 54, and the project docs name Expo Go 54.0.8 as the matching version. Keep `expo` on `~54` and run `npx expo-doctor` after any dependency change. Installing `expo-dev-client` switches `npx expo start` into dev-client mode, so leave it out.

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go. Over USB, with Android Platform Tools installed, you can skip the QR code:

```sh
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"
```

Check the installed Expo Go version:

```sh
adb shell dumpsys package host.exp.exponent | grep versionName
```

Run the tests and checks:

```sh
npm test
npm run typecheck
npx expo-doctor
```

No Android Studio, Android SDK or emulator is needed.

### Build an APK with EAS

EAS builds run in the cloud, so your machine needs only Node and the EAS CLI. Use `npx eas-cli`, because `npx eas` fails in this project.

```sh
npx eas-cli build -p android --profile preview --non-interactive
```

The profiles in `eas.json` are `preview` and `development`, which build internal APKs, and `production`, which builds an AAB. Sign in once with `npx eas-cli login`. For CI or other non-interactive runs, set `EXPO_TOKEN` to an access token from your Expo account settings. The EAS free tier allows 15 Android builds a month, with one build running at a time.

Each GitHub release needs exactly one `.apk` asset and one `.apk.sha256` asset, both built with the same EAS keystore. The in-app updater depends on that layout. Never regenerate the keystore, because installed copies would stop updating over the top.

## Documentation

- [Project state](docs/STATE.md) and [docs index](docs/INDEX.md)
- [Product requirements](docs/PRD-v0.md)
- [Architecture foundation](docs/specs/0001-architecture-foundation.md)
- [In-app update spec](docs/specs/0002-in-app-update.md)
- [Decisions](docs/decisions.md) and [conventions](docs/conventions.md)
- [UI design spec](design/DESIGN-SPEC.md)
- [Render spike](spike/FINDINGS.md) and [on-device spike](spike/DEVICE-FINDINGS.md)

## License

MIT. See [LICENSE](LICENSE).
