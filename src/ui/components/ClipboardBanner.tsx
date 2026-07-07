// [UI] Clipboard offer banner — design/DESIGN-SPEC.md §5.6 / §1c. Shown only when
// the clipboard holds text. "Paste it" fills the paste box and enables the CTA.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export function ClipboardBanner({
  snippet,
  onPaste,
}: {
  snippet: string;
  onPaste: () => void;
}) {
  return (
    <View style={styles.banner}>
      <View style={styles.textCol}>
        <Text style={styles.title}>You copied something — use it?</Text>
        <Text style={styles.snippet} numberOfLines={1}>
          {snippet}
        </Text>
      </View>
      <Pressable
        onPress={onPaste}
        accessibilityRole="button"
        accessibilityLabel="Paste copied text"
        android_ripple={null}
        style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        hitSlop={6}
      >
        <Text style={styles.pillText}>Paste it</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.blueTint,
    borderWidth: 1.5,
    borderColor: colors.bannerBorder,
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 14, lineHeight: 19, fontWeight: '600', color: colors.trustBlue },
  snippet: { fontSize: 13.5, lineHeight: 18, color: colors.inkSoft },
  pill: {
    height: 40,
    borderRadius: radius.smallPill,
    backgroundColor: colors.trustBlue,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: { backgroundColor: colors.pressedBlue },
  pillText: { color: colors.card, fontSize: 14.5, fontWeight: '600' },
});
