// [UI] Empty state — design/DESIGN-SPEC.md §5.8 / §1f. Dashed-doc glyph + title +
// reassuring body + a single exit action (outline-accent button).

import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { DashedDoc } from './Icons';
import { SecondaryButton } from './Buttons';

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <DashedDoc width={64} height={78} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <SecondaryButton
        label={actionLabel}
        onPress={onAction}
        variant="accent"
        style={styles.action}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 8,
  },
  body: {
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  action: { height: 48, marginTop: 12, alignSelf: 'stretch' },
});
