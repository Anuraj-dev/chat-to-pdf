// [UI] Processing — design/DESIGN-SPEC.md §1d. Brief progress state while
// parse+render+save runs (driven by App). Document illustration + progress bar +
// status copy + Cancel. After 10s the status adapts ("Almost there…", §7).

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { ProgressBar } from '../components/ProgressBar';
import { SecondaryButton } from '../components/Buttons';

const SLOW_AFTER_MS = 10_000;

export function ProcessingScreen({ onCancel }: { onCancel: () => void }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={{ flex: 1.3 }} />
        <DocIllustration />
        <View style={styles.progressWrap}>
          <ProgressBar />
        </View>
        <Text style={styles.status}>Making your PDF…</Text>
        <Text style={styles.sub}>
          {slow
            ? 'Almost there — long answers take a little longer.'
            : 'Tidying up the math, code and tables.'}
        </Text>
        <Text style={styles.caption}>Usually takes under 5 seconds.</Text>
        <View style={{ flex: 2 }} />
        <SecondaryButton
          label="Cancel"
          onPress={onCancel}
          variant="text"
          accessibilityLabel="Cancel making PDF"
        />
      </View>
    </SafeAreaView>
  );
}

/** 88×110 white card with a dog-ear + skeleton lines (§1d). */
function DocIllustration() {
  return (
    <View style={styles.doc} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.skelLine, { backgroundColor: '#C9D9EA', width: '60%' }]} />
      <View style={styles.skelLine} />
      <View style={styles.skelLine} />
      <View style={[styles.skelLine, { width: '80%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
  doc: {
    width: 88,
    height: 110,
    borderRadius: 6,
    borderWidth: 2.5,
    borderColor: colors.trustBlue,
    backgroundColor: colors.card,
    padding: 12,
    gap: 8,
  },
  skelLine: { height: 5, borderRadius: 2, backgroundColor: '#E3EBF4' },
  progressWrap: { marginTop: 28 },
  status: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 24,
    textAlign: 'center',
  },
  sub: {
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.inkSoft,
    marginTop: 8,
    textAlign: 'center',
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedIcon,
    marginTop: 8,
    textAlign: 'center',
  },
});
