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
  /**
   * Durable file uri of the rendered HTML snapshot saved next to the PDF, so
   * Preview shows exactly what was rendered rather than re-deriving from
   * `sourceMarkdown` at view time (which could drift if render logic changes in
   * a later build). Optional: legacy records saved before this field existed
   * won't have it — Preview falls back to regenerating from `sourceMarkdown`.
   */
  htmlUri?: string;
  /**
   * Page count of the rendered PDF, from expo-print's `numberOfPages`. Optional:
   * legacy records won't have it — the UI omits the count rather than guessing.
   */
  pageCount?: number;
}
