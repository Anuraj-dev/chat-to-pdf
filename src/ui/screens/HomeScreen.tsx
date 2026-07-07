// [UI] Home / Capture — design/DESIGN-SPEC.md §1c. Wordmark + History, clipboard
// offer banner (when the clipboard holds text), the paste box (empty prompt vs
// filled), and the always-visible Make PDF CTA (disabled until there's text —
// tapping it while disabled surfaces the helper toast, §1g #1).

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { HomeTopBar } from '../components/TopBar';
import { ClipboardBanner } from '../components/ClipboardBanner';
import { PasteBox } from '../components/PasteBox';
import { PrimaryButton } from '../components/Buttons';
import { Toast } from '../components/Toast';
import { pageEstimateLabel } from '../format';

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
}: {
  text: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
  clipboardSuggestion: string | null;
  onAcceptSuggestion: () => void;
  onMakePdf: () => void;
  onOpenHistory: () => void;
}) {
  const [toast, setToast] = useState(false);
  const canMake = text.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <HomeTopBar onHistory={onOpenHistory} />
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
});
