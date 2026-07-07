// [UI] Spec 0002 — the in-app update card, rendered as a bottom sheet. Mirrors
// HelperSheet's Modal/scrim/handle/theme structure and drives the update state
// machine: Idle → Checking → (UpToDate | Available | Failed) → Downloading →
// Installing. All network/fs/native work lives in `src/update`; this file only
// orchestrates those calls and renders the current step.

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nativeApplicationVersion } from 'expo-application';
import {
  InstallLaunchError,
  checkForUpdate,
  cleanupApk,
  launchInstaller,
  openUnknownSourcesSettings,
  runDownload,
  type UpdateCheckResult,
} from '../../update';
import { colors, radius, spacing, elevation } from '../theme';
import { SecondaryButton } from './Buttons';

/** Installed version reported by the native build (mirrors app.json version). */
const INSTALLED_VERSION = nativeApplicationVersion ?? '1.0.0';

/** The narrowed "update available" payload we carry between steps. */
type Available = Extract<UpdateCheckResult, { kind: 'UpdateAvailable' }>;

/** The sheet's finite state — one variant renders at a time. */
type Step =
  | { step: 'idle' }
  | { step: 'checking' }
  | { step: 'uptodate' }
  | { step: 'available'; update: Available }
  | { step: 'failed'; message: string }
  | { step: 'downloading'; update: Available; progress: number }
  | { step: 'installing'; fileUri: string; warning?: string }
  | { step: 'permission'; fileUri: string };

/** Human-readable copy for the non-success check results. */
function checkFailureMessage(result: UpdateCheckResult): string {
  switch (result.kind) {
    case 'Offline':
      return "Couldn't reach GitHub. Check your connection and try again.";
    case 'RateLimited':
      return 'Too many update checks right now. Try again in a little while.';
    case 'MissingAsset':
      return 'The latest release is missing its install files. Try again later.';
    case 'MalformedMetadata':
    default:
      return "Couldn't read the update details. Try again later.";
  }
}

export function UpdateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [state, setState] = useState<Step>({ step: 'idle' });
  // Guards against overlapping check/download/install taps.
  const busyRef = useRef(false);

  // Reset to idle each time the sheet is (re)opened.
  useEffect(() => {
    if (visible) setState({ step: 'idle' });
  }, [visible]);

  const handleCheck = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setState({ step: 'checking' });
    try {
      const result = await checkForUpdate(INSTALLED_VERSION);
      if (result.kind === 'UpdateAvailable') setState({ step: 'available', update: result });
      else if (result.kind === 'UpToDate') setState({ step: 'uptodate' });
      else setState({ step: 'failed', message: checkFailureMessage(result) });
    } finally {
      busyRef.current = false;
    }
  };

  const handleDownload = async (update: Available) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setState({ step: 'downloading', update, progress: 0 });
    try {
      const outcome = await runDownload(update, (progress) =>
        setState({ step: 'downloading', update, progress }),
      );
      switch (outcome.kind) {
        case 'Verified':
          setState({ step: 'installing', fileUri: outcome.fileUri });
          void handleInstall(outcome.fileUri);
          break;
        case 'Unverified':
          setState({ step: 'installing', fileUri: outcome.fileUri, warning: outcome.warning });
          void handleInstall(outcome.fileUri);
          break;
        case 'ChecksumMismatch':
          setState({
            step: 'failed',
            message: "The download didn't match its checksum and was discarded. Try again.",
          });
          break;
        case 'Failed':
          setState({ step: 'failed', message: outcome.message });
          break;
      }
    } finally {
      busyRef.current = false;
    }
  };

  // Install runs after a download resolves; it does NOT hold busyRef (the
  // download's finally already released it). Launch failure ⇒ permission step.
  const handleInstall = async (fileUri: string) => {
    try {
      await launchInstaller(fileUri);
    } catch (err) {
      if (err instanceof InstallLaunchError) {
        setState({ step: 'permission', fileUri });
      } else {
        setState({ step: 'failed', message: 'Could not start the installer. Try again.' });
      }
    }
  };

  const handleCancel = () => {
    // Drop any half-downloaded/verified apk on dismissal.
    if (state.step === 'installing' || state.step === 'permission') void cleanupApk(state.fileUri);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <Pressable
        style={styles.scrim}
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={handleCancel}
      />
      <View style={[styles.sheet, { maxHeight: windowHeight * 0.75 }]}>
        <View style={styles.handle} />
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          <Text style={styles.title}>App updates</Text>
          <Text style={styles.version}>Installed version {INSTALLED_VERSION}</Text>

          {renderBody(state, { onCheck: handleCheck, onDownload: handleDownload, onClose })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function renderBody(
  state: Step,
  actions: {
    onCheck: () => void;
    onDownload: (update: Available) => void;
    onClose: () => void;
  },
) {
  switch (state.step) {
    case 'idle':
      return (
        <View style={styles.actions}>
          <SecondaryButton
            label="Check for updates"
            variant="accent"
            onPress={actions.onCheck}
            accessibilityLabel="Check for updates"
          />
        </View>
      );

    case 'checking':
      return <Busy label="Checking for updates…" />;

    case 'uptodate':
      return (
        <>
          <Text style={styles.body}>You're on the latest version.</Text>
          <View style={styles.actions}>
            <SecondaryButton label="Close" variant="text" onPress={actions.onClose} />
          </View>
        </>
      );

    case 'available':
      return (
        <>
          <Text style={styles.body}>Version {state.update.version} is available.</Text>
          {state.update.notes.trim().length > 0 && (
            <Text style={styles.notes}>{state.update.notes.trim()}</Text>
          )}
          <View style={styles.actions}>
            <SecondaryButton
              label="Download & install"
              variant="accent"
              onPress={() => actions.onDownload(state.update)}
              accessibilityLabel={`Download and install version ${state.update.version}`}
            />
          </View>
        </>
      );

    case 'downloading':
      return (
        <>
          <Busy label={`Downloading… ${Math.round(state.progress * 100)}%`} />
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(state.progress * 100)}%` }]} />
          </View>
        </>
      );

    case 'installing':
      return (
        <>
          <Busy label="Opening the installer…" />
          {state.warning && (
            <Text style={styles.warn} accessibilityLiveRegion="polite">
              {state.warning}
            </Text>
          )}
        </>
      );

    case 'permission':
      return (
        <>
          <Text style={styles.warn}>
            Android blocked the install. Allow "install unknown apps" for chat-to-pdf, then tap
            Install again.
          </Text>
          <View style={styles.actions}>
            <SecondaryButton
              label="Open settings"
              variant="accent"
              onPress={() => void openUnknownSourcesSettings()}
            />
            <SecondaryButton
              label="Install again"
              onPress={() => void launchInstaller(state.fileUri)}
            />
          </View>
        </>
      );

    case 'failed':
      return (
        <>
          <Text style={styles.warn} accessibilityLiveRegion="polite">
            {state.message}
          </Text>
          <View style={styles.actions}>
            <SecondaryButton label="Try again" variant="accent" onPress={actions.onCheck} />
            <SecondaryButton label="Close" variant="text" onPress={actions.onClose} />
          </View>
        </>
      );
  }
}

/** A centered spinner + label used by the transient steps. */
function Busy({ label }: { label: string }) {
  return (
    <View style={styles.busy}>
      <ActivityIndicator color={colors.trustBlue} />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(31,41,51,0.45)',
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.bottomSheet,
    borderTopRightRadius: radius.bottomSheet,
    paddingTop: spacing.md,
    ...elevation.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondaryBorder,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  version: {
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.mutedIcon,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  body: {
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  notes: {
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.inkSoft,
    marginTop: spacing.md,
  },
  warn: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '500',
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  busy: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.trustBlue,
  },
});
