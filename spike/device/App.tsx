// Render-fidelity spike, on-device half (chat-to-pdf issue #2).
// Feeds the SAME sample.html used in the browser phase to expo-print
// (Android WebView print engine) so the output can be compared against
// spike/browser-output.pdf. Throwaway code.
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { SAMPLE_HTML } from "./htmlContent";

const UPLOAD_URL = "http://localhost:9099/upload";

export default function App() {
  const [busy, setBusy] = useState(false);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [lastUri, setLastUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = async () => {
    setBusy(true);
    setError(null);
    setElapsedMs(null);
    try {
      const t0 = Date.now();
      const { uri } = await Print.printToFileAsync({ html: SAMPLE_HTML });
      const dt = Date.now() - t0;
      setElapsedMs(dt);
      setLastUri(uri);

      // Automated retrieval path: read the PDF as base64 and POST it to a
      // localhost server (reached over `adb reverse`), since Expo Go's
      // app-private cache isn't adb-readable and the share sheet can't be
      // driven headlessly.
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64 }),
        });
        if (!res.ok) {
          setError(`Upload failed: HTTP ${res.status}`);
        }
      } catch (uploadErr) {
        setError(
          "Upload error: " +
            (uploadErr instanceof Error ? uploadErr.message : String(uploadErr))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  };

  const printPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      await Print.printAsync({ html: SAMPLE_HTML });
    } catch (e) {
      // Cancelling the print dialog also rejects on some platforms;
      // surface everything so nothing fails silently.
      setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text style={styles.title}>chat-to-pdf render spike</Text>
      <Text style={styles.subtitle}>
        Issue #2 · on-device phase · HTML payload:{" "}
        {(SAMPLE_HTML.length / 1024).toFixed(0)} KB
      </Text>

      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        disabled={busy}
        onPress={generatePdf}
      >
        <Text style={styles.buttonText}>
          {busy ? "Working…" : "Generate PDF"}
        </Text>
      </Pressable>
      <Text style={styles.hint}>
        printToFileAsync → share sheet. Save the PDF, then compare against
        spike/browser-output.pdf page by page.
      </Text>

      <Pressable
        style={[
          styles.button,
          styles.buttonSecondary,
          busy && styles.buttonDisabled,
        ]}
        disabled={busy}
        onPress={printPreview}
      >
        <Text style={styles.buttonText}>Print preview</Text>
      </Pressable>
      <Text style={styles.hint}>
        printAsync → system print preview (visual check only).
      </Text>

      {elapsedMs !== null && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>printToFileAsync took</Text>
          <Text style={styles.resultValue}>{elapsedMs} ms</Text>
          {lastUri && <Text style={styles.uri}>{lastUri}</Text>}
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.checklist}>
        On-device checklist:{"\n"}
        1. Math glyphs render (no blank boxes)? — base64 fonts working{"\n"}
        2. Code monospaced + colored, clean split at page boundary?{"\n"}
        3. Table borders intact, header behavior on split?{"\n"}
        4. A4 size + 20mm margins honored (@page)?{"\n"}
        5. No trailing blank page?{"\n"}
        6. Elapsed ms acceptable on this phone?
      </Text>
      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fafafa" },
  container: { padding: 24, paddingTop: 80 },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 13, color: "#666", marginBottom: 28 },
  button: {
    backgroundColor: "#1a56db",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonSecondary: { backgroundColor: "#374151", marginTop: 20 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 12, color: "#777", marginTop: 6 },
  resultBox: {
    marginTop: 24,
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  resultLabel: { fontSize: 12, color: "#065f46" },
  resultValue: { fontSize: 28, fontWeight: "700", color: "#065f46" },
  uri: { fontSize: 10, color: "#065f46", marginTop: 6 },
  errorBox: {
    marginTop: 24,
    backgroundColor: "#fef2f2",
    borderColor: "#ef4444",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  errorText: { color: "#991b1b", fontSize: 13 },
  checklist: {
    marginTop: 32,
    fontSize: 12,
    color: "#555",
    lineHeight: 20,
    fontFamily: "monospace",
  },
});
