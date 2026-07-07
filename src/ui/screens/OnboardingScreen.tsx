// [UI] Onboarding — design/DESIGN-SPEC.md §1b. First-run only, one screen, no
// carousel. "Start" persists the flag and cross-fades into Home (handled by App).

import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { PrimaryButton } from '../components/Buttons';
import { CheckCircle, PdfGlyph } from '../components/Icons';

const REASSURANCES = [
  'Works without internet',
  'No account, no sign-in',
  'Math, code and tables come out right',
];

export function OnboardingScreen({ onStart }: { onStart: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={{ flex: 1.2 }} />
        <View style={styles.iconTile}>
          <PdfGlyph
            width={44}
            height={54}
            bg={colors.card}
            borderColor={colors.trustBlue}
            labelColor={colors.trustBlue}
            labelSize={10}
          />
        </View>
        <Text style={styles.headline}>Copy an answer.{'\n'}Get a clean PDF.</Text>
        <Text style={styles.sub}>
          Paste anything you copied from ChatGPT or Gemini. CDF turns it into a neat A4 page
          you can print or hand in.
        </Text>
        <View style={styles.reassureList}>
          {REASSURANCES.map((line) => (
            <View key={line} style={styles.reassureRow}>
              <CheckCircle size={26} />
              <Text style={styles.reassureText}>{line}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footerCaption}>
          Everything stays on your phone. Nothing is uploaded.
        </Text>
        <View style={{ flex: 2 }} />
        <PrimaryButton label="Start" onPress={onStart} accessibilityLabel="Start using CDF" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  iconTile: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 24,
  },
  sub: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.inkSoft,
    marginTop: 12,
  },
  reassureList: { marginTop: 28, gap: 14 },
  reassureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  reassureText: { fontSize: 16, lineHeight: 22, color: colors.ink, flex: 1 },
  footerCaption: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedIcon,
    textAlign: 'center',
    marginTop: 24,
  },
});
