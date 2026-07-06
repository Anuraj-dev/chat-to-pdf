# chat-to-pdf

Android-first Expo app that turns an AI-chat answer (ChatGPT / Gemini markdown) into a
clean, printable PDF — entirely **on-device** (no backend, no auth, no network).

Pipeline: **Capture → Parse → Render → Output/Store**. See `docs/specs/0001-architecture-foundation.md`
for the architecture and `docs/STATE.md` for current status.

- **Stack:** React Native + Expo (managed) + TypeScript, **pinned to Expo SDK 54**.
- **Render:** markdown → `markdown-it` (+ `@vscode/markdown-it-katex`) → HTML + print CSS → `expo-print` → PDF.
- **Storage (v0):** `@react-native-async-storage/async-storage` (metadata/history) + `expo-file-system` (PDF bytes).
- **Navigation:** hand-rolled (no `expo-router`).

> ⚠️ **SDK is pinned to 54** because the target phone runs **Expo Go 54.0.8**. Do not let any tool
> upgrade `expo` past `~54`. Run `npx expo-doctor` after any dependency change.

## Source layout

```
App.tsx                 # minimal home screen (plain RN, no router)
index.ts                # Expo entry (registerRootComponent)
src/
  capture/              # [1] clipboard read, paste handling, input cleanup
  parse/                # [2] markdown-it + KaTeX → HTML  (unit tests: src/parse/__tests__)
  render/               # [3] HTML template + print CSS + expo-print wrapper (the hard part)
  output/               # [4] print / save / share
  storage/              # AsyncStorage + expo-file-system helpers
  types/                # shared TS types
```

## Develop without Android Studio

You only need **Node**, **`eas-cli`**, and **`adb`** (Android Platform Tools, for the USB device
workflow) — no full Android SDK, no Android Studio, no emulator.
Development happens against **Expo Go** on a physical Android phone.

```bash
npm install
npx expo start          # starts Metro; press `a` or scan the QR from Expo Go
```

Launching on a USB-connected device via `adb` (no Wi-Fi / QR needed):

```bash
# forward Metro to the phone, then open the app in Expo Go
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"
```

> The phone must run **Expo Go 54.0.8** (SDK 54). Verify with:
> `adb shell dumpsys package host.exp.exponent | grep versionName`

## Tests & checks

```bash
npm test                # jest + jest-expo
npm run typecheck       # tsc --noEmit
npx expo-doctor         # verify SDK 54 project health
```

## Building a shareable APK (EAS)

No local Android toolchain is required — builds run in the EAS cloud.

```bash
eas build -p android --profile preview --non-interactive   # internal-distribution APK, sideloadable
```

Profiles (`eas.json`): `development` (internal APK), `preview` (internal APK), `production` (AAB).
We develop in **Expo Go**, not a dev client — `expo-dev-client` is deliberately not installed
(it would flip `npx expo start` into dev-client mode and break the Expo Go flow).

### CI / Claude Code auth (EXPO_TOKEN)

EAS needs Expo auth. Either run `eas login` once locally, or — for CI / headless / Claude Code
runs — set an access token generated at <https://expo.dev/accounts/[account]/settings/access-tokens>:

```bash
export EXPO_TOKEN=xxxxxxxx      # eas-cli reads this automatically; no interactive login
```

> EAS free tier: 15 Android builds/month, 1 concurrent. Stay in Expo Go while iterating.
