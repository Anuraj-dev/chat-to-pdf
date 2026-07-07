// [UI] Render-failed — design/DESIGN-SPEC.md §1g #2. Calm, blame-free, always a
// way out. The user's text is preserved (App keeps it in the capture hook), so
// "Go back to my text" returns to Home with the paste box intact. After 2
// failures a smaller-part hint is added (§7 adaptive copy).

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { PrimaryButton, SecondaryButton } from '../components/Buttons';

export function ErrorScreen({
  failures,
  onRetry,
  onBackToText,
}: {
  failures: number;
  onRetry: () => void;
  onBackToText: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={{ flex: 1.2 }} />
        <View style={styles.iconCircle}>
          <Text style={styles.bang}>!</Text>
        </View>
        <Text style={styles.title}>That didn&apos;t work</Text>
        <Text style={styles.body}>
          Don&apos;t worry — your text is safe and still in the box. This is our fault, not
          yours.
          {failures >= 2
            ? ' Still stuck? Try making the PDF from a smaller part of the answer.'
            : ''}
        </Text>
        <View style={{ flex: 2 }} />
        <PrimaryButton label="Try again" onPress={onRetry} />
        <SecondaryButton
          label="Go back to my text"
          onPress={onBackToText}
          variant="text"
          style={styles.textBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 20, alignItems: 'center' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.errorTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bang: { fontSize: 40, fontWeight: '700', color: colors.error, lineHeight: 46 },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 20,
  },
  body: {
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.inkSoft,
    marginTop: 8,
    textAlign: 'center',
  },
  textBtn: { marginTop: 4, alignSelf: 'stretch' },
});
