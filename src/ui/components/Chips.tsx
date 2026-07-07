// [UI] Chips / status pills — design/DESIGN-SPEC.md §5.7.

import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Check } from './Icons';

/** Page-estimate chip ("About 1 page") — blue tint. */
export function PageChip({ label }: { label: string }) {
  return (
    <View style={styles.pageChip}>
      <Text style={styles.pageChipText}>{label}</Text>
    </View>
  );
}

/** Ready chip — green tint + check ("Ready"). Preview header. */
export function ReadyChip() {
  return (
    <View style={styles.readyChip} accessibilityLabel="PDF ready">
      <Check size={11} color={colors.printGreen} thickness={2} />
      <Text style={styles.readyChipText}>Ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageChip: {
    backgroundColor: colors.blueTint,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  pageChipText: { color: colors.trustBlue, fontSize: 13, fontWeight: '500' },
  readyChip: {
    backgroundColor: colors.greenTint,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readyChipText: { color: colors.printGreen, fontSize: 12.5, fontWeight: '600' },
});
