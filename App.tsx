import { useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { markdownToHtml } from './src/parse';
import { renderToPdf } from './src/render';
import { looksLikeMarkdown, useCapture } from './src/capture';
import {
  printPdf,
  savePdf,
  sharePdf,
  suggestFilename,
  PdfTooLargeError,
  SaveAccessDeniedError,
  SaveFailedError,
  SharingUnavailableError,
} from './src/output';

// Minimal capture screen for issue #6 (paste box + clipboard read). Logic lives
// in src/capture (useCapture hook + pure helpers); this file is a thin,
// intentionally-plain view that issue #9 re-skins from design/DESIGN-SPEC.md.
// Navigation is hand-rolled later (no expo-router) — see docs/STATE.md.

type Status =
  | { kind: 'idle' }
  | { kind: 'working' }
  // `filename` is snapshotted at render time so editing the paste box after
  // Create PDF can't mislabel the already-rendered document on Save.
  | { kind: 'done'; uri: string; filename: string }
  | { kind: 'error'; message: string };

// Design tokens (design/DESIGN-SPEC.md).
const COLORS = {
  bg: '#F7F5F0',
  text: '#1F2933',
  primary: '#1A5C9C',
  bannerBg: '#E9F1F9',
  bannerBorder: '#BDD5EC',
  muted: '#55606B',
  disabled: '#DDD9D0',
  disabledText: '#9AA2AB',
  inputBorder: '#E3DFD6',
  white: '#FFFFFF',
};

export default function App() {
  const {
    text,
    clipboardSuggestion,
    setText,
    acceptSuggestion,
    dismissSuggestion,
  } = useCapture();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  // Feedback line under the Share/Print/Save row (success or error, never a crash).
  const [actionNote, setActionNote] = useState<string | null>(null);
  // Synchronous reentrancy guard: `status` updates async, so a fast double-tap
  // could start two renders before the first setStatus lands. The ref flips
  // immediately.
  const renderingRef = useRef(false);
  // Same guard for the output actions (share sheet / print dialog / SAF picker
  // are all slow modal flows a double-tap could stack).
  const actingRef = useRef(false);

  const canCreate = text.trim().length > 0 && status.kind !== 'working';
  const showMarkdownHint = text.trim().length > 0 && !looksLikeMarkdown(text);

  async function handleCreatePdf() {
    if (renderingRef.current) return;
    renderingRef.current = true;
    setStatus({ kind: 'working' });
    setActionNote(null);
    try {
      const html = markdownToHtml(text);
      const uri = await renderToPdf(html);
      setStatus({ kind: 'done', uri, filename: suggestFilename(text) });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      renderingRef.current = false;
    }
  }

  // Run one output action (Share / Print / Save); errors become status text.
  async function runOutputAction(
    label: string,
    action: () => Promise<string | void>,
  ) {
    if (actingRef.current) return;
    actingRef.current = true;
    setActionNote(null);
    try {
      const result = await action();
      if (typeof result === 'string') {
        setActionNote(`Saved to: ${decodeURIComponent(result)}`);
      }
    } catch (err) {
      if (
        err instanceof SaveAccessDeniedError ||
        err instanceof SharingUnavailableError ||
        err instanceof PdfTooLargeError ||
        err instanceof SaveFailedError
      ) {
        setActionNote(err.message);
      } else {
        setActionNote(
          `${label} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } finally {
      actingRef.current = false;
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.avoider}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={styles.title}>Copy an answer. Get a clean PDF.</Text>

        {clipboardSuggestion !== null && (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>You copied something — use it?</Text>
            <Text style={styles.bannerSnippet} numberOfLines={1}>
              {clipboardSuggestion}
            </Text>
            <View style={styles.bannerActions}>
              <Pressable
                onPress={dismissSuggestion}
                style={styles.bannerDismiss}
                accessibilityRole="button"
              >
                <Text style={styles.bannerDismissText}>Dismiss</Text>
              </Pressable>
              <Pressable
                onPress={acceptSuggestion}
                style={styles.bannerAccept}
                accessibilityRole="button"
              >
                <Text style={styles.bannerAcceptText}>Paste it</Text>
              </Pressable>
            </View>
          </View>
        )}

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          placeholder="Paste an answer you copied from ChatGPT or Gemini"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel="Paste box"
        />

        {showMarkdownHint && (
          <Text style={styles.hint}>
            This doesn&apos;t look like markdown — it&apos;ll still convert.
          </Text>
        )}

        <Pressable
          onPress={handleCreatePdf}
          disabled={!canCreate}
          style={[styles.cta, !canCreate && styles.ctaDisabled]}
          accessibilityRole="button"
        >
          {status.kind === 'working' ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={[styles.ctaText, !canCreate && styles.ctaTextDisabled]}>
              Create PDF
            </Text>
          )}
        </Pressable>

        {status.kind === 'done' && (
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>PDF created:</Text>
            <Text style={styles.statusUri} selectable>
              {status.uri}
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => runOutputAction('Share', () => sharePdf(status.uri))}
                style={styles.actionButton}
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Share</Text>
              </Pressable>
              <Pressable
                onPress={() => runOutputAction('Print', () => printPdf(status.uri))}
                style={styles.actionButton}
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Print</Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  runOutputAction('Save', () =>
                    savePdf(status.uri, status.filename),
                  )
                }
                style={styles.actionButton}
                accessibilityRole="button"
              >
                <Text style={styles.actionButtonText}>Save</Text>
              </Pressable>
            </View>
            {actionNote !== null && (
              <Text style={styles.actionNote} selectable>
                {actionNote}
              </Text>
            )}
          </View>
        )}
        {status.kind === 'error' && (
          <View style={styles.statusBox}>
            <Text style={styles.statusError}>Couldn&apos;t create PDF: {status.message}</Text>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  avoider: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
  },
  banner: {
    backgroundColor: COLORS.bannerBg,
    borderColor: COLORS.bannerBorder,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  bannerSnippet: {
    fontSize: 13.5,
    color: COLORS.muted,
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    alignItems: 'center',
  },
  bannerDismiss: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bannerDismissText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.muted,
  },
  bannerAccept: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bannerAcceptText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.white,
  },
  input: {
    minHeight: 220,
    backgroundColor: COLORS.white,
    borderColor: COLORS.inputBorder,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    lineHeight: 23,
    color: COLORS.text,
  },
  hint: {
    fontSize: 13,
    color: COLORS.muted,
  },
  cta: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: COLORS.disabled,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
  ctaTextDisabled: {
    color: COLORS.disabledText,
  },
  statusBox: {
    gap: 4,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusUri: {
    fontSize: 13,
    color: COLORS.muted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  actionNote: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  statusError: {
    fontSize: 14,
    color: '#B3261E',
  },
});
