// [UI] "Get the full answer" helper sheet — issue #11 / design/DESIGN-SPEC.md §5.10.
//
// A bottom sheet with an AI picker (ChatGPT / Gemini / Claude / Other). One tap
// on an AI copies its matching prompt to the clipboard (side effect owned by the
// caller via `onCopy`) and — only if the copy actually landed — swaps the sheet
// to a plain-language instruction: "Paste this into your chat, then copy the
// AI's reply back here." A failed copy keeps the picker up with a retry line.
// Sister-usable: zero typing, two taps, plain words.
//
// The prompt TEXTS live in src/capture/helperPrompts.ts (data); the copy-outcome
// step logic lives in src/ui/helperSheet.ts (pure, unit-tested). This file only
// renders. The interior scrolls inside a capped-height sheet so every option
// stays reachable at large accessibility font sizes.

import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AI_OPTIONS, HELPER_INSTRUCTION, type AiId } from '../../capture/helperPrompts';
import {
  COPY_FAILED_MESSAGE,
  initialHelperSheetState,
  reduceCopyResult,
  type HelperSheetState,
} from '../helperSheet';
import { colors, radius, spacing, elevation } from '../theme';
import { CheckCircle } from './Icons';
import { SecondaryButton } from './Buttons';

export function HelperSheet({
  visible,
  onClose,
  onCopy,
}: {
  visible: boolean;
  onClose: () => void;
  /** Copy the matching prompt to the clipboard; resolves false when the write
   *  fails (the sheet then stays on the picker and shows a retry line). */
  onCopy: (id: AiId) => Promise<boolean>;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [state, setState] = useState<HelperSheetState>(initialHelperSheetState);
  // Serialize copy attempts — a fast double-tap must not race two writes.
  const copyingRef = useRef(false);

  // Reset to the picker step each time the sheet is (re)opened.
  useEffect(() => {
    if (visible) setState(initialHelperSheetState);
  }, [visible]);

  const handlePick = async (id: AiId) => {
    if (copyingRef.current) return;
    copyingRef.current = true;
    try {
      const ok = await onCopy(id);
      setState(reduceCopyResult(id, ok));
    } catch {
      setState(reduceCopyResult(id, false));
    } finally {
      copyingRef.current = false;
    }
  };

  const copiedLabel = AI_OPTIONS.find((o) => o.id === state.copied)?.label;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Scrim — tap outside to dismiss. */}
      <Pressable
        style={styles.scrim}
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={onClose}
      />
      <View style={[styles.sheet, { maxHeight: windowHeight * 0.7 }]}>
        <View style={styles.handle} />
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          {state.copied === null ? (
            <>
              <Text style={styles.title}>Get a better copy</Text>
              <Text style={styles.body}>
                Ask your AI to re-send its full answer as clean text. Which app are
                you using?
              </Text>
              {state.failed && (
                <Text style={styles.retry} accessibilityLiveRegion="polite">
                  {COPY_FAILED_MESSAGE}
                </Text>
              )}
              <View style={styles.options}>
                {AI_OPTIONS.map((opt) => (
                  <SecondaryButton
                    key={opt.id}
                    label={opt.label}
                    onPress={() => void handlePick(opt.id)}
                    accessibilityLabel={`Copy the ${opt.label} prompt`}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.confirmIcon}>
                <CheckCircle size={64} />
              </View>
              <Text style={styles.title}>
                {copiedLabel ? `Copied for ${copiedLabel}` : 'Copied'}
              </Text>
              <Text style={styles.body}>{HELPER_INSTRUCTION}</Text>
              <View style={styles.options}>
                <SecondaryButton
                  label="Got it"
                  variant="accent"
                  onPress={onClose}
                  accessibilityLabel="Close"
                />
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(31,41,51,0.45)', // §5.10 scrim
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
    backgroundColor: colors.secondaryBorder, // §5.10 grab handle
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  confirmIcon: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retry: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '500',
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  options: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
});
