// Shared TS types (Document, RenderResult, etc.).
// See docs/specs/0001-architecture-foundation.md §4. Filled in as modules land.

/**
 * A saved PDF in the on-device history (issue #8).
 *
 * `pdfUri` is the DURABLE copy inside the app document directory — never the
 * expo-print cache uri, which Android may purge. `createdAt` is epoch ms so the
 * record is plain-JSON serializable into a single AsyncStorage key.
 */
export interface HistoryDoc {
  id: string;
  title: string;
  sourceMarkdown: string;
  pdfUri: string;
  createdAt: number;
}
