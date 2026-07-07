// [UI] "Name your PDF" dialog — shown when the user taps Save on the Preview.
//
// The PDF is saved with whatever the user types; the field is PRE-FILLED with the
// document's heading/title so a non-technical user can just tap Save and get a
// sensibly-named file. Android's RN has no built-in text prompt (Alert.prompt is
// iOS-only), so this is a small centered modal with a single text field. The
// caller sanitizes the value into a filesystem-safe name (output/filename.ts
// sanitizeUserFilename) — this component only collects the string.

import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, elevation, type as typeScale } from '../theme';
import { SecondaryButton } from './Buttons';

export function NameDialog({
  visible,
  defaultName,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  /** Pre-filled value — the document heading/title. */
  defaultName: string;
  onCancel: () => void;
  /** Called with the raw (unsanitized) text the user accepted. */
  onConfirm: (name: string) => void;
}) {
  const [text, setText] = useState(defaultName);

  // Reset to the current default each time the dialog (re)opens — a later Save on
  // a different document must not show the previous name.
  useEffect(() => {
    if (visible) setText(defaultName);
  }, [visible, defaultName]);

  const submit = () => {
    // Guard against an all-whitespace/empty entry — fall back to the default so
    // the caller's sanitizer always has something to work with.
    onConfirm(text.trim() === '' ? defaultName : text);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.scrim} accessibilityLabel="Cancel" onPress={onCancel} />
        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.card}>
            <Text style={styles.title}>Name your PDF</Text>
            <Text style={styles.hint}>It’ll be saved to your Documents folder.</Text>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="PDF name"
              placeholderTextColor={colors.mutedIcon}
              autoFocus
              selectTextOnFocus
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={submit}
              accessibilityLabel="PDF name"
            />
            <View style={styles.actions}>
              <SecondaryButton
                label="Cancel"
                variant="text"
                onPress={onCancel}
                style={styles.action}
              />
              <SecondaryButton
                label="Save"
                variant="accent"
                onPress={submit}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(31,41,51,0.45)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.paper,
    borderRadius: radius.card,
    padding: spacing.xl,
    ...elevation.sheet,
  },
  title: {
    fontSize: typeScale.title.fontSize,
    lineHeight: typeScale.title.lineHeight,
    fontWeight: '600',
    color: colors.ink,
  },
  hint: {
    fontSize: typeScale.bodySmall.fontSize,
    lineHeight: typeScale.bodySmall.lineHeight,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },
  input: {
    marginTop: spacing.lg,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.secondaryBorder,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: { flex: 1 },
});
