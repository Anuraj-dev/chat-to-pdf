// [UI] Button primitives per design/DESIGN-SPEC.md §5.1–5.3. Pressed feedback is
// an INSTANT color swap (no Android ripple) — the spec calls out that ripple
// smears on budget 60Hz panels. All are ≥48dp; the primary CTA is 56dp.

import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, touch } from '../theme';

interface BaseProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
  /** Optional leading icon (already sized/colored by caller). */
  icon?: ReactNode;
}

/** §5.1 — Primary CTA. 56dp, full-width, trust-blue; disabled + loading states. */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  loadingLabel,
  onDisabledPress,
  accessibilityLabel,
  style,
}: BaseProps & {
  loading?: boolean;
  loadingLabel?: string;
  /** When `disabled`, keep the button tappable to surface a hint (spec §1c/§1g:
   *  the goal is never a mystery — a disabled Make PDF explains itself). */
  onDisabledPress?: () => void;
}) {
  const isDisabled = disabled || loading;
  // Stay pressable while visually disabled only when a hint handler is given.
  const blockPress = loading || (disabled && !onDisabledPress);
  return (
    <Pressable
      onPress={isDisabled ? onDisabledPress : onPress}
      disabled={blockPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={null}
      style={({ pressed }) => [
        styles.primary,
        pressed && !isDisabled && styles.primaryPressed,
        disabled && !loading && styles.primaryDisabled,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.card} />
          <Text style={styles.primaryText}>{loadingLabel ?? label}</Text>
        </View>
      ) : (
        <Text style={[styles.primaryText, disabled && styles.disabledText]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** §5.2 — Print button. Green = "ready to go" (Preview only). */
export function PrintButton({ label, onPress, icon, accessibilityLabel, style }: BaseProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      android_ripple={null}
      style={({ pressed }) => [styles.print, pressed && styles.printPressed, style]}
    >
      {icon}
      <Text style={styles.printText}>{label}</Text>
    </Pressable>
  );
}

/** §5.3 — Secondary (white + border). `accent`/`text` variants per spec. */
export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  icon,
  accessibilityLabel,
  style,
  variant = 'default',
}: BaseProps & { variant?: 'default' | 'accent' | 'text' | 'danger' }) {
  const textColor =
    variant === 'accent'
      ? colors.trustBlue
      : variant === 'text'
        ? colors.inkSoft
        : variant === 'danger'
          ? colors.error
          : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      android_ripple={null}
      style={({ pressed }) => [
        styles.secondaryBase,
        variant !== 'text' && styles.secondaryBoxed,
        variant === 'accent' && styles.secondaryAccentBorder,
        pressed && styles.secondaryPressed,
        style,
      ]}
    >
      {icon}
      <Text style={[styles.secondaryText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  primary: {
    height: touch.cta,
    borderRadius: radius.button,
    backgroundColor: colors.trustBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: { backgroundColor: colors.pressedBlue },
  primaryDisabled: { backgroundColor: colors.disabledBg },
  primaryText: { fontSize: 17, fontWeight: '600', color: colors.card },
  disabledText: { color: colors.disabledText },

  print: {
    height: touch.cta,
    borderRadius: radius.button,
    backgroundColor: colors.printGreen,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printPressed: { opacity: 0.85 },
  printText: { fontSize: 17, fontWeight: '600', color: colors.card },

  secondaryBase: {
    minHeight: touch.min,
    borderRadius: radius.button,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBoxed: {
    height: touch.cta,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.secondaryBorder,
  },
  secondaryAccentBorder: { borderColor: colors.trustBlue },
  secondaryPressed: { opacity: 0.7 },
  secondaryText: { fontSize: 16, fontWeight: '600' },
});
