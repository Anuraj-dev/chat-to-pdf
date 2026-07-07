// App composition + hand-rolled navigation. All pipeline logic lives in the
// existing modules (src/{capture,parse,render,output,storage}); this file only
// wires them to the screen layer (src/ui) and owns the flow state.
//
// NAVIGATION: state-based screen switching via navReducer (NO expo-router, NO
// react-navigation — locked decision, docs/decisions.md). Flat stack per
// design/DESIGN-SPEC.md §6: Onboarding (once) → Home; Home → Processing →
// Preview; Home → History → Preview. History is reached from the Home top-bar
// "History" button and returns via the back chevron — the spec explicitly
// forbids a tab bar/drawer/FAB (§6), so none is used.
//
// LOCKED INVARIANT (docs/STATE.md): the PDF is saved to History BEFORE Preview
// shows. Preserved in runPipeline() below — saveDocument runs on render success
// and the durable document-dir uri feeds Share/Print/Save.

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { deleteAsync } from 'expo-file-system/legacy';

import { markdownToHtml } from './src/parse';
import { renderToPdf } from './src/render';
import { useCapture, writeClipboard, getHelperPrompt } from './src/capture';
import {
  printPdf,
  savePdf,
  sharePdf,
  sanitizeUserFilename,
  PdfTooLargeError,
  SaveAccessDeniedError,
  SaveFailedError,
  SharingUnavailableError,
} from './src/output';
import {
  saveDocument,
  deriveTitle,
  listDocuments,
  deleteDocument,
} from './src/storage';
import type { HistoryDoc } from './src/types';

import {
  colors,
  navReducer,
  initialScreen,
  hasOnboarded,
  markOnboarded,
  OnboardingScreen,
  HomeScreen,
  ProcessingScreen,
  ErrorScreen,
  PreviewScreen,
  HistoryScreen,
  type OutputAction,
  type SaveAction,
} from './src/ui';

export default function App() {
  const capture = useCapture();
  const [screen, dispatch] = useReducer(navReducer, initialScreen);
  const [docs, setDocs] = useState<HistoryDoc[]>([]);
  // The doc just produced from Home — held so Preview can show it even if history
  // persistence failed (transient fallback pointing at the cache uri).
  const [lastDoc, setLastDoc] = useState<HistoryDoc | null>(null);
  // null = still loading the flag; true/false = resolved.
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  // Generation guard so a cancelled/superseded render can never push Preview.
  const genRef = useRef(0);
  // Synchronous in-flight guard: a fast double-tap on "Make PDF" / "Try again"
  // must not start two concurrent render+save runs (→ duplicate History entries).
  // Set BEFORE the first await, cleared when the run that owns it settles.
  const inFlightRef = useRef(false);
  // Serialize output actions — share/print/save modals a double-tap could stack.
  const actingRef = useRef(false);

  const refreshDocs = useCallback(async () => {
    setDocs(await listDocuments());
  }, []);

  useEffect(() => {
    void hasOnboarded().then(setOnboarded);
    void refreshDocs();
  }, [refreshDocs]);

  // ---- The one-tap pipeline: parse → render → SAVE (locked) → Preview. --------
  const runPipeline = useCallback(
    async (gen: number, sourceText: string) => {
      try {
        const { uri: cacheUri, pageCount, html } = await renderToPdf(
          markdownToHtml(sourceText),
        );
        // Cancel/supersede while rendering: the token was bumped by handleCancel
        // (or a newer run). Skip persistence — no duplicate/orphan History entry
        // — and best-effort drop the temp PDF expo-print just produced.
        if (gen !== genRef.current) {
          void deleteAsync(cacheUri, { idempotent: true }).catch(() => {});
          return;
        }
        // LOCKED: persist BEFORE Preview. On persistence failure, fall back to a
        // transient record on the cache uri so the render is never lost.
        let doc: HistoryDoc;
        try {
          // Re-check right before the write: a cancel between the render and here
          // must still stop the side effect (and clean up the temp PDF).
          if (gen !== genRef.current) {
            void deleteAsync(cacheUri, { idempotent: true }).catch(() => {});
            return;
          }
          doc = await saveDocument({
            title: deriveTitle(sourceText),
            sourceMarkdown: sourceText,
            cachePdfUri: cacheUri,
            html,
            pageCount,
          });
          await refreshDocs();
        } catch (saveErr) {
          console.warn('[App] saveDocument failed; using cache uri:', saveErr);
          doc = {
            id: `transient-${Date.now()}`,
            title: deriveTitle(sourceText),
            sourceMarkdown: sourceText,
            pdfUri: cacheUri,
            createdAt: Date.now(),
            pageCount,
          };
        }
        if (gen !== genRef.current) return; // cancelled or superseded
        setLastDoc(doc);
        dispatch({ type: 'PROCESSING_SUCCEEDED', docId: doc.id });
      } catch (err) {
        console.warn('[App] render failed:', err);
        if (gen !== genRef.current) return;
        dispatch({ type: 'PROCESSING_FAILED' });
      } finally {
        // Only the run that still owns the flag clears it — a superseding run
        // (cancel → new tap) has already taken ownership and must not be unlocked
        // by the stale run finishing late.
        if (gen === genRef.current) inFlightRef.current = false;
      }
    },
    [refreshDocs],
  );

  const startPipeline = useCallback(
    (action: 'START_PROCESSING' | 'RETRY') => {
      // Synchronous guard BEFORE any await: a second tap in the same tick bails
      // here, so only one render+save can run at a time.
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      dispatch({ type: action });
      const gen = ++genRef.current;
      void runPipeline(gen, capture.text);
    },
    [runPipeline, capture.text],
  );

  const handleCancel = useCallback(() => {
    genRef.current++; // invalidate the in-flight render (skips its persistence)
    inFlightRef.current = false; // let the user start a fresh render immediately
    dispatch({ type: 'CANCEL_PROCESSING' });
  }, []);

  // ---- Output actions (Preview + History), errors mapped to a friendly note. --
  const runOutput = useCallback(
    async (label: string, action: () => Promise<string | void>): Promise<string | null> => {
      if (actingRef.current) return null;
      actingRef.current = true;
      try {
        const result = await action();
        return typeof result === 'string'
          ? `Saved to: ${decodeURIComponent(result)}`
          : null;
      } catch (err) {
        if (
          err instanceof SaveAccessDeniedError ||
          err instanceof SharingUnavailableError ||
          err instanceof PdfTooLargeError ||
          err instanceof SaveFailedError
        ) {
          return err.message;
        }
        return `${label} failed: ${err instanceof Error ? err.message : String(err)}`;
      } finally {
        actingRef.current = false;
      }
    },
    [],
  );

  const printFor = useCallback(
    (doc: HistoryDoc): OutputAction =>
      () => runOutput('Print', () => printPdf(doc.pdfUri)),
    [runOutput],
  );
  const shareFor = useCallback(
    (doc: HistoryDoc): OutputAction =>
      () => runOutput('Share', () => sharePdf(doc.pdfUri)),
    [runOutput],
  );
  const saveFor = useCallback(
    (doc: HistoryDoc): SaveAction =>
      (name: string) =>
        runOutput('Save', () =>
          // The user-typed name is sanitized to a filesystem-safe base; an empty
          // entry falls back to the document title.
          savePdf(doc.pdfUri, sanitizeUserFilename(name, doc.title)),
        ),
    [runOutput],
  );

  const handleDelete = useCallback(
    (doc: HistoryDoc) => {
      Alert.alert('Delete this PDF?', "You can't undo this.", [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteDocument(doc.id).then(refreshDocs);
          },
        },
      ]);
    },
    [refreshDocs],
  );

  const resolveDoc = useCallback(
    (id: string): HistoryDoc | null =>
      docs.find((d) => d.id === id) ?? (lastDoc?.id === id ? lastDoc : null),
    [docs, lastDoc],
  );

  // ---- Render ---------------------------------------------------------------
  if (onboarded === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.trustBlue} />
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen
          onStart={() => {
            void markOnboarded();
            setOnboarded(true);
          }}
        />
        <StatusBar barStyle="dark-content" />
      </SafeAreaProvider>
    );
  }

  const historyBody = (
    <HistoryScreen
      docs={docs}
      onBack={() => dispatch({ type: 'BACK' })}
      onOpen={(id) => dispatch({ type: 'OPEN_PREVIEW_FROM_HISTORY', docId: id })}
      onMakeFirst={() => dispatch({ type: 'BACK' })}
      onPrint={printFor}
      onShare={shareFor}
      onDelete={handleDelete}
    />
  );

  let body: React.ReactNode;
  switch (screen.name) {
    case 'home':
      body = (
        <HomeScreen
          text={capture.text}
          onChangeText={capture.setText}
          onClear={capture.clearText}
          clipboardSuggestion={capture.clipboardSuggestion}
          onAcceptSuggestion={capture.acceptSuggestion}
          onMakePdf={() => startPipeline('START_PROCESSING')}
          onOpenHistory={() => dispatch({ type: 'OPEN_HISTORY' })}
          onCopyHelperPrompt={(id) => writeClipboard(getHelperPrompt(id))}
        />
      );
      break;
    case 'processing':
      body = <ProcessingScreen onCancel={handleCancel} />;
      break;
    case 'error':
      body = (
        <ErrorScreen
          failures={screen.failures}
          onRetry={() => startPipeline('RETRY')}
          onBackToText={() => dispatch({ type: 'BACK_TO_TEXT' })}
        />
      );
      break;
    case 'preview': {
      const doc = resolveDoc(screen.docId);
      // Defensive: a missing doc (e.g. deleted underneath) falls back to Home.
      body = doc ? (
        <PreviewScreen
          doc={doc}
          onBack={() => dispatch({ type: 'BACK' })}
          onPrint={printFor(doc)}
          onSave={saveFor(doc)}
          onShare={shareFor(doc)}
        />
      ) : (
        historyBody
      );
      break;
    }
    case 'history':
      body = historyBody;
      break;
  }

  return (
    <SafeAreaProvider>
      {body}
      <StatusBar barStyle="dark-content" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
