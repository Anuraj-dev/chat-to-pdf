// [UI] Home / Capture — design/DESIGN-SPEC.md §1c. Wordmark + History, clipboard
// offer banner (when the clipboard holds text), the paste box (empty prompt vs
// filled), and the always-visible Make PDF CTA (disabled until there's text —
// tapping it while disabled surfaces the helper toast, §1g #1).

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { HomeTopBar } from '../components/TopBar';
import { ClipboardBanner } from '../components/ClipboardBanner';
import { PasteBox } from '../components/PasteBox';
import { PrimaryButton } from '../components/Buttons';
import { Toast } from '../components/Toast';
import { HelperSheet } from '../components/HelperSheet';
import { UpdateSheet } from '../components/UpdateSheet';
import { pageEstimateLabel } from '../format';
import type { AiId } from '../../capture/helperPrompts';

const EMPTY_HELPER =
  'Paste some text first — tap and hold the box, then tap Paste.';

export function HomeScreen({
  text,
  onChangeText,
  onClear,
  clipboardSuggestion,
  onAcceptSuggestion,
  onMakePdf,
  onOpenHistory,
  onCopyHelperPrompt,
}: {
  text: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
  clipboardSuggestion: string | null;
  onAcceptSuggestion: () => void;
  onMakePdf: () => void;
  onOpenHistory: () => void;
  /** Copy the "get the full answer" prompt for the picked AI (issue #11).
   *  Resolves false when the clipboard write fails — the sheet shows a retry. */
  onCopyHelperPrompt: (id: AiId) => Promise<boolean>;
}) {
  const [toast, setToast] = useState(false);
  const [helperOpen, setHelperOpen] = useState(false);
  // Self-contained update sheet (spec 0002) — local state, no App.tsx changes,
  // mirroring the helper sheet above.
  const [updateOpen, setUpdateOpen] = useState(false);
  const canMake = text.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <HomeTopBar onHistory={onOpenHistory} onAbout={() => setUpdateOpen(true)} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          {clipboardSuggestion !== null && (
            <ClipboardBanner snippet={clipboardSuggestion} onPaste={onAcceptSuggestion} />
          )}
          <PasteBox
            value={text}
            onChangeText={onChangeText}
            onClear={onClear}
            pageLabel={pageEstimateLabel(text)}
          />
          <Pressable
            onPress={() => setHelperOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Get better results"
            android_ripple={null}
            hitSlop={8}
            style={({ pressed }) => [styles.helperLink, pressed && styles.helperLinkPressed]}
          >
            <Text style={styles.helperLinkText}>Get better results</Text>
          </Pressable>
          <PrimaryButton
            label="Make PDF"
            onPress={onMakePdf}
            disabled={!canMake}
            onDisabledPress={() => setToast(true)}
            accessibilityLabel="Make PDF"
            style={styles.cta}
          />
        </View>
      </KeyboardAvoidingView>
      <Toast message={EMPTY_HELPER} visible={toast} onHide={() => setToast(false)} />
      <HelperSheet
        visible={helperOpen}
        onClose={() => setHelperOpen(false)}
        onCopy={onCopyHelperPrompt}
      />
      <UpdateSheet visible={updateOpen} onClose={() => setUpdateOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  cta: { marginTop: 0 },
  helperLink: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  helperLinkPressed: { opacity: 0.6 },
  helperLinkText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.trustBlue,
    textAlign: 'center',
  },
});
