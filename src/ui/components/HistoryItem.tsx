// [UI] History list item — design/DESIGN-SPEC.md §5.5 / §1f. Card with a PDF
// thumb, title + date, trailing chevron. Long-press expands an inline action row
// (Print again · Share · Delete). Pressed feedback is an instant fill (no ripple).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Chevron, PdfGlyph } from './Icons';
import type { HistoryDoc } from '../../types';

export function HistoryItem({
  doc,
  dateLabel,
  expanded,
  onPress,
  onLongPress,
  onPrint,
  onShare,
  onDelete,
}: {
  doc: HistoryDoc;
  dateLabel: string;
  expanded: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPrint: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={300}
        accessibilityRole="button"
        accessibilityLabel={`Open ${doc.title}, ${dateLabel}`}
        accessibilityHint="Long-press for more actions"
        android_ripple={null}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <PdfGlyph width={40} height={48} labelSize={11} />
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {doc.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {dateLabel}
          </Text>
        </View>
        <View style={styles.chevronWrap}>
          <Chevron size={10} color={colors.mutedIcon} direction="right" thickness={2} />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.actionRow}>
          <ActionCell label="Print again" color={colors.printGreen} onPress={onPrint} />
          <View style={styles.divider} />
          <ActionCell label="Share" color={colors.trustBlue} onPress={onShare} />
          <View style={styles.divider} />
          <ActionCell label="Delete" color={colors.error} onPress={onDelete} />
        </View>
      )}
    </View>
  );
}

function ActionCell({
  label,
  color,
  onPress,
}: {
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={null}
      style={({ pressed }) => [styles.actionCell, pressed && styles.rowPressed]}
    >
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  cardExpanded: { borderWidth: 2, borderColor: colors.trustBlue },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowPressed: { backgroundColor: colors.pressedListItem },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '500', color: colors.ink },
  subtitle: { fontSize: 13.5, lineHeight: 18, color: colors.inkSoft },
  chevronWrap: { width: 16, alignItems: 'flex-end' },
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionCell: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 14.5, fontWeight: '600' },
  divider: { width: 1, backgroundColor: colors.line },
});
