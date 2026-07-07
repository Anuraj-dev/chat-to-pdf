// [UI] Paste box — design/DESIGN-SPEC.md §5.4 / §1c. Multiline input that fills
// the remaining height. Empty state shows a dashed-doc glyph + prompt; filled
// state switches to a blue border and overlays a page-estimate chip + Clear chip.

import { StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { colors, radius } from '../theme';
import { DashedDoc } from './Icons';
import { PageChip } from './Chips';

export function PasteBox({
  value,
  onChangeText,
  onClear,
  pageLabel,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onClear: () => void;
  pageLabel: string;
}) {
  const filled = value.trim().length > 0;

  return (
    <View style={[styles.box, filled && styles.boxFilled]}>
      {!filled && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <DashedDoc width={54} height={66} color={colors.secondaryBorder} />
          <Text style={styles.prompt}>
            Paste an answer you copied from ChatGPT or Gemini
          </Text>
          <Text style={styles.helper}>Tap here, hold for a second, then tap Paste</Text>
        </View>
      )}

      <TextInput
        style={[styles.input, filled ? styles.inputFilled : styles.inputEmpty]}
        value={value}
        onChangeText={onChangeText}
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.mutedIcon}
        selectionColor={colors.trustBlue}
        accessibilityLabel="Paste box"
      />

      {filled && (
        <View style={styles.footerRow} pointerEvents="box-none">
          {pageLabel ? <PageChip label={pageLabel} /> : <View />}
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="Clear text"
            android_ripple={null}
            style={({ pressed }) => [styles.clearChip, pressed && styles.clearPressed]}
            hitSlop={6}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.pasteBox,
    overflow: 'hidden',
  },
  boxFilled: { borderWidth: 2, borderColor: colors.trustBlue },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  prompt: {
    fontSize: 17,
    lineHeight: 25,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedIcon,
    textAlign: 'center',
  },
  input: { flex: 1, padding: 16 },
  inputEmpty: { color: 'transparent' },
  inputFilled: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  footerRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearChip: {
    height: 40,
    borderRadius: radius.smallPill,
    borderWidth: 1.5,
    borderColor: colors.secondaryBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearPressed: { backgroundColor: colors.pressedListItem },
  clearText: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
});
