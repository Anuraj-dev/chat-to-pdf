// [UI] PDF Preview (hero) — design/DESIGN-SPEC.md §1e.
//
// VISUAL-PARITY NOTE: the WebView shows the persisted HTML SNAPSHOT of the render
// (doc.htmlUri) — NOT the literal PDF bytes, because Expo Go ships no PDF viewer.
// Showing the saved snapshot (rather than re-deriving HTML from sourceMarkdown at
// view time) means reopening a History item always displays what the saved PDF
// was rendered from, even if the render logic changes in a later build. Legacy
// records without a snapshot fall back to regenerating buildDocument(
// markdownToHtml(sourceMarkdown)) as before. Either way the WebView is a close
// proxy, not a pixel-exact PDF: pagination, @page margins and Android's print
// bridge quirks only exist in the real PDF. The Print/Save/Share actions operate
// on the DURABLE saved PDF uri (doc.pdfUri), never on this HTML.

import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { colors } from '../theme';
import { previewSubtitle, pageIndicatorLabel } from '../format';
import { ScreenTopBar } from '../components/TopBar';
import { ReadyChip } from '../components/Chips';
import { PrimaryButton, PrintButton, SecondaryButton } from '../components/Buttons';
import { Toast } from '../components/Toast';
import { markdownToHtml } from '../../parse';
import { buildDocument } from '../../render';
import type { HistoryDoc } from '../../types';

/** An async output action returns a user-facing note, or null on plain success. */
export type OutputAction = () => Promise<string | null>;

export function PreviewScreen({
  doc,
  onBack,
  onPrint,
  onSave,
  onShare,
}: {
  doc: HistoryDoc;
  onBack: () => void;
  onPrint: OutputAction;
  onSave: OutputAction;
  onShare: OutputAction;
}) {
  const [note, setNote] = useState<string | null>(null);

  // Regenerated HTML — the fallback for legacy/missing-snapshot docs and the
  // seed shown until the snapshot file loads. Memoized so a toast re-render
  // doesn't re-parse the markdown.
  const fallbackHtml = useMemo(
    () => buildDocument(markdownToHtml(doc.sourceMarkdown)),
    [doc.sourceMarkdown],
  );

  // Prefer the persisted render snapshot (doc.htmlUri) so Preview shows exactly
  // what the saved PDF was rendered from; regenerate only when there's no
  // snapshot or it can't be read.
  const [html, setHtml] = useState<string>(fallbackHtml);
  useEffect(() => {
    let alive = true;
    if (!doc.htmlUri) {
      setHtml(fallbackHtml);
      return;
    }
    readAsStringAsync(doc.htmlUri)
      .then((snapshot) => {
        if (alive) setHtml(snapshot);
      })
      .catch((err) => {
        console.warn('[Preview] snapshot read failed; regenerating:', err);
        if (alive) setHtml(fallbackHtml);
      });
    return () => {
      alive = false;
    };
  }, [doc.htmlUri, fallbackHtml]);

  const indicator = pageIndicatorLabel(doc.pageCount);

  function run(action: OutputAction) {
    return async () => {
      const message = await action();
      if (message) setNote(message);
    };
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenTopBar
        title={doc.title}
        subtitle={previewSubtitle(doc.pageCount)}
        onBack={onBack}
        bordered
        right={<ReadyChip />}
      />

      <View style={styles.canvas}>
        <View style={styles.sheet}>
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={styles.web}
            scalesPageToFit
            showsVerticalScrollIndicator
            accessibilityLabel="PDF preview"
          />
        </View>
        {indicator !== '' && (
          <Text style={styles.pageIndicator} accessibilityRole="text">
            {indicator}
          </Text>
        )}
      </View>

      <View style={styles.actionBar}>
        <PrintButton label="Print" onPress={run(onPrint)} style={styles.print} />
        <SecondaryButton label="Save" onPress={run(onSave)} style={styles.secondary} />
        <SecondaryButton label="Share" onPress={run(onShare)} style={styles.secondary} />
      </View>

      <Toast message={note ?? ''} visible={note !== null} onHide={() => setNote(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  canvas: {
    flex: 1,
    backgroundColor: colors.previewCanvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#1F2933',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  web: { flex: 1, backgroundColor: colors.card },
  // §1e page indicator below the sheet: 500 13px/18px #55606B.
  pageIndicator: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.inkSoft,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  print: { flex: 1.5 },
  secondary: { flex: 1 },
});
