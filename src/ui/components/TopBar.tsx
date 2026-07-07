// [UI] Top bars — design/DESIGN-SPEC.md §5.11. Height 56, paper bg, optional
// bottom border. Home variant: wordmark + History button. Sub-screen variant:
// back chevron + title (+ optional subtitle / right slot).

import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, touch } from '../theme';
import { Chevron, ClockIcon } from './Icons';

/** Home top bar: "CDF" wordmark left, "History" text-icon button right. */
export function HomeTopBar({ onHistory }: { onHistory: () => void }) {
  return (
    <View style={styles.bar}>
      <Text style={styles.wordmark}>CDF</Text>
      <Pressable
        onPress={onHistory}
        accessibilityRole="button"
        accessibilityLabel="Open history"
        android_ripple={null}
        style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}
        hitSlop={8}
      >
        <ClockIcon size={18} color={colors.inkSoft} />
        <Text style={styles.historyLabel}>History</Text>
      </Pressable>
    </View>
  );
}

/** Sub-screen top bar: back chevron + title (+ subtitle / right slot). */
export function ScreenTopBar({
  title,
  subtitle,
  onBack,
  right,
  bordered = false,
  titleSize = 17,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
  bordered?: boolean;
  titleSize?: number;
}) {
  return (
    <View style={[styles.bar, bordered && styles.bordered]}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        android_ripple={null}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Chevron size={13} color={colors.ink} direction="left" />
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : <View style={styles.rightSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paper,
    paddingHorizontal: 4,
  },
  bordered: { borderBottomWidth: 1, borderBottomColor: colors.line },
  wordmark: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.2,
    marginLeft: 16,
    flex: 1,
  },
  historyBtn: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  historyLabel: { fontSize: 15, fontWeight: '600', color: colors.inkSoft },
  backBtn: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  titleWrap: { flex: 1, justifyContent: 'center' },
  title: { fontWeight: '600', color: colors.ink },
  subtitle: { fontSize: 12.5, lineHeight: 16, color: colors.mutedIcon },
  right: { marginRight: 16, marginLeft: 8 },
  rightSpacer: { width: touch.min },
  pressed: { opacity: 0.6 },
});
