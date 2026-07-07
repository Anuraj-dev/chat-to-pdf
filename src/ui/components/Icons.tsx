// [UI] Geometric icons composed from plain Views (no react-native-svg dep). Per
// design/DESIGN-SPEC.md §4 icons are outlined, 2px stroke — approximated here
// with borders + rotation. Every icon is paired with a text label at the call
// site, so these are decorative (accessibilityElementsHidden).

import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

/** A chevron drawn as two adjacent borders on a rotated square. */
export function Chevron({
  size = 12,
  color = colors.ink,
  direction = 'left',
  thickness = 2.5,
}: {
  size?: number;
  color?: string;
  direction?: 'left' | 'right';
  thickness?: number;
}) {
  const rotate = direction === 'left' ? '45deg' : '-135deg';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderLeftWidth: thickness,
        borderBottomWidth: thickness,
        borderColor: color,
        transform: [{ rotate }],
      }}
    />
  );
}

/** A simple clock: outlined circle with an L-shaped hand. */
export function ClockIcon({ size = 18, color = colors.inkSoft }: { size?: number; color?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.28,
          height: size * 0.28,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          marginTop: -1,
          marginLeft: 1,
        }}
      />
    </View>
  );
}

/** An outlined info glyph: circle with a dot + stem (used for the About entry). */
export function InfoIcon({ size = 18, color = colors.inkSoft }: { size?: number; color?: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* dot */}
      <View
        style={{
          width: 2,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          marginTop: size * 0.12,
        }}
      />
      {/* stem */}
      <View
        style={{
          width: 2,
          height: size * 0.34,
          borderRadius: 1,
          backgroundColor: color,
          marginTop: size * 0.06,
        }}
      />
    </View>
  );
}

/** A check mark drawn as an L rotated 45° (short + long stroke). */
export function Check({ size = 14, color = colors.printGreen, thickness = 2.5 }: {
  size?: number;
  color?: string;
  thickness?: number;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size * 0.55,
        height: size,
        borderRightWidth: thickness,
        borderBottomWidth: thickness,
        borderColor: color,
        transform: [{ rotate: '45deg' }],
        marginTop: -size * 0.15,
      }}
    />
  );
}

/** A check inside a tinted circle (reassurance rows, Ready chip). */
export function CheckCircle({
  size = 26,
  circleColor = colors.greenTint,
  checkColor = colors.printGreen,
}: {
  size?: number;
  circleColor?: string;
  checkColor?: string;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: circleColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Check size={size * 0.5} color={checkColor} />
    </View>
  );
}

/** The recurring "PDF" document glyph: bordered card with a dog-ear + label. */
export function PdfGlyph({
  width = 40,
  height = 48,
  borderColor = colors.trustBlue,
  bg = colors.blueTint,
  labelColor = colors.trustBlue,
  labelSize = 11,
  style,
}: {
  width?: number;
  height?: number;
  borderColor?: string;
  bg?: string;
  labelColor?: string;
  labelSize?: number;
  style?: ViewStyle;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        {
          width,
          height,
          borderRadius: 4,
          borderWidth: 2,
          borderColor,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={[styles.pdfLabel, { color: labelColor, fontSize: labelSize }]}>PDF</Text>
    </View>
  );
}

/** Dashed empty-state document glyph. */
export function DashedDoc({
  width = 64,
  height = 78,
  color = colors.secondaryBorder,
}: {
  width?: number;
  height?: number;
  color?: string;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width,
        height,
        borderRadius: 6,
        borderWidth: 2.5,
        borderStyle: 'dashed',
        borderColor: color,
        padding: 10,
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.disabledBg }} />
      <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.disabledBg, width: '70%' }} />
      <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.disabledBg, width: '85%' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pdfLabel: { fontWeight: '700', letterSpacing: 0.5 },
});
