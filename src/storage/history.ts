// [4] STORAGE — on-device PDF history (issue #8).
//
// STORAGE SHAPE — one AsyncStorage key `chat-to-pdf:history:v1` holds a JSON
// array of HistoryDoc records, NEWEST FIRST. Justification: v0 history is tiny
// (capped at 100 small metadata records — the PDF *bytes* live on the
// filesystem, not in the JSON), so a single read-modify-write of one array is
// simpler and safer than an index key + N per-doc keys: AsyncStorage has no
// transactions, so a multi-key layout can leave orphaned/partial state on a
// crash mid-write. One key means an (effectively) atomic swap, array order IS
// recency, and eviction is a `slice`. The only cost — rewriting the whole array
// per save — is negligible at this scale.
//
// DURABILITY — renderToPdf writes into the expo-print cache dir, which Android
// may purge under storage pressure. We copy each PDF into the app document
// directory (`<documentDirectory>pdfs/<id>.pdf`) and store THAT uri, so history
// survives cache eviction.
//
// NOTE: imports from `expo-file-system/legacy` — project convention (see
// src/output/saf.ts); SDK 54's default export is the new File API surface.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  makeDirectoryAsync,
  moveAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { markdownToHtml } from '../parse';
import { renderToPdf } from '../render';
import type { HistoryDoc } from '../types';

/** Single namespaced key holding the whole history array (newest first). */
export const HISTORY_KEY = 'chat-to-pdf:history:v1';

/** Max records kept; older ones (and their PDF files) are evicted on save. */
export const HISTORY_CAP = 100;

/** Directory the durable PDF copies live in. */
const PDF_DIR = `${documentDirectory ?? ''}pdfs/`;

/** Durable path for a given record's PDF. */
function pdfPath(id: string): string {
  return `${PDF_DIR}${id}.pdf`;
}

/** Durable path for a given record's rendered HTML snapshot (Preview source). */
function htmlPath(id: string): string {
  return `${PDF_DIR}${id}.html`;
}

/** Time-sortable, collision-resistant id without pulling in a uuid dep. */
function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// MUTEX — AsyncStorage has no transactions, and every mutation here is a
// read-modify-write of ONE key. Two overlapping mutations (double-tap save,
// save racing a delete) would both read the same snapshot and the second write
// would silently drop the first's change. This promise-chain lock serializes
// all mutations; reads (list/get) stay lock-free — a slightly stale read is
// harmless, a lost write is not.
let queue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn);
  // The chain itself must never reject, or one failed op would poison every
  // later one. Callers still see the rejection through `run`.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Read + parse the history array. A missing key, non-array JSON, or corrupted
 * JSON all resolve to an empty history — a garbled key must never crash the app
 * or wipe silently-recoverable state; we log and treat it as empty.
 */
async function readHistory(): Promise<HistoryDoc[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[storage] ${HISTORY_KEY} was not an array — treating as empty`);
      return [];
    }
    return parsed as HistoryDoc[];
  } catch (err) {
    console.warn(`[storage] corrupted ${HISTORY_KEY}, treating as empty:`, err);
    return [];
  }
}

async function writeHistory(docs: HistoryDoc[]): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(docs));
}

/** Best-effort file delete — a missing file is fine (idempotent). */
async function deletePdfFile(uri: string): Promise<void> {
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch (err) {
    // Never let a stray file-system error block a record delete/eviction.
    console.warn(`[storage] could not delete file ${uri}:`, err);
  }
}

/** Best-effort delete of every durable file a record owns (PDF + HTML snapshot). */
async function deleteDocFiles(doc: HistoryDoc): Promise<void> {
  await deletePdfFile(doc.pdfUri);
  if (doc.htmlUri) await deletePdfFile(doc.htmlUri);
}

/**
 * Derive a human title for a record: the first markdown heading, else the first
 * non-empty line, stripped of inline markers and capped. Mirrors the base that
 * the output layer's `suggestFilename` slugs, but keeps human casing/spacing.
 */
export function deriveTitle(sourceMarkdown: string): string {
  const lines = sourceMarkdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const heading = lines.find((line) => /^#{1,6}\s+\S/.test(line));
  const candidate = heading
    ? heading.replace(/^#{1,6}\s+/, '')
    : (lines[0] ?? '');

  const title = candidate
    .replace(/[*_`~#>[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
    .trim();

  return title.length > 0 ? title : 'Untitled';
}

export interface SaveDocumentInput {
  title: string;
  sourceMarkdown: string;
  /** The expo-print cache uri returned by renderToPdf — copied to a durable path. */
  cachePdfUri: string;
  /**
   * The exact rendered HTML fed to expo-print (RenderResult.html). Persisted as
   * a snapshot file next to the PDF so Preview shows what was actually rendered.
   * Optional — a transient/legacy save without it degrades to regenerating from
   * sourceMarkdown at view time.
   */
  html?: string;
  /** expo-print's numberOfPages for this render — surfaced in Preview (§1e). */
  pageCount?: number;
}

/**
 * Persist a rendered PDF into history: copy the cache PDF into the durable
 * document dir, prepend a metadata record (newest first), evict past the cap.
 *
 * The copy happens FIRST and its failure propagates — the caller (App) keeps
 * the original cache uri and can still Share/Print, so a history failure never
 * costs the user their rendered PDF. No partial record is written on copy fail,
 * and a failed record write cleans up the just-copied file (no orphans).
 */
export function saveDocument(input: SaveDocumentInput): Promise<HistoryDoc> {
  return withLock(async () => {
    const id = newId();
    const pdfUri = pdfPath(id);

    // `intermediates: true` makes this idempotent — no throw if the dir exists.
    await makeDirectoryAsync(PDF_DIR, { intermediates: true });
    await copyAsync({ from: input.cachePdfUri, to: pdfUri });

    // Persist the rendered HTML snapshot next to the PDF (large; kept out of the
    // AsyncStorage JSON index). A snapshot-write failure must not lose the PDF —
    // fall back to a record without htmlUri (Preview regenerates from markdown).
    let htmlUri: string | undefined;
    if (input.html !== undefined) {
      const path = htmlPath(id);
      try {
        await writeAsStringAsync(path, input.html);
        htmlUri = path;
      } catch (err) {
        console.warn(`[storage] could not write HTML snapshot ${path}:`, err);
      }
    }

    const record: HistoryDoc = {
      id,
      title: input.title,
      sourceMarkdown: input.sourceMarkdown,
      pdfUri,
      createdAt: Date.now(),
      ...(htmlUri !== undefined ? { htmlUri } : {}),
      ...(input.pageCount !== undefined ? { pageCount: input.pageCount } : {}),
    };

    const next = [record, ...(await readHistory())];
    const kept = next.slice(0, HISTORY_CAP);
    const evicted = next.slice(HISTORY_CAP); // oldest past the cap

    try {
      await writeHistory(kept);
    } catch (err) {
      // Record never landed — remove the durable copies so they can't orphan.
      await deleteDocFiles(record);
      throw err;
    }

    // Evicted files are deleted only AFTER the write succeeded — a failed
    // write must never leave surviving records pointing at deleted files.
    await Promise.all(evicted.map((doc) => deleteDocFiles(doc)));

    return record;
  });
}

/** All saved documents, newest first. */
export async function listDocuments(): Promise<HistoryDoc[]> {
  return readHistory();
}

/** One document by id, or null if not found. */
export async function getDocument(id: string): Promise<HistoryDoc | null> {
  const found = (await readHistory()).find((doc) => doc.id === id);
  return found ?? null;
}

/** Remove a record and its PDF file. Tolerates an already-missing file. */
export function deleteDocument(id: string): Promise<void> {
  return withLock(async () => {
    const history = await readHistory();
    const target = history.find((doc) => doc.id === id);
    await writeHistory(history.filter((doc) => doc.id !== id));
    if (target) await deleteDocFiles(target);
  });
}

/**
 * Re-render a stored document from its saved markdown and replace its PDF file
 * in place (e.g. after an app update improves rendering). Returns the durable
 * uri (unchanged — the path is derived from the stable id).
 *
 * Crash-safe swap: the fresh render is copied to a temp path first; the old
 * PDF is only removed once the new bytes exist, so a failed re-render leaves
 * the existing file (and record) untouched. Runs under the lock so a
 * concurrent delete can't pull the record out from under the file swap.
 *
 * @throws if no document with `id` exists.
 */
export function regeneratePdf(id: string): Promise<string> {
  return withLock(async () => {
    const history = await readHistory();
    const doc = history.find((d) => d.id === id);
    if (!doc) throw new Error(`regeneratePdf: no document with id ${id}`);

    const { uri: cacheUri, pageCount, html } = await renderToPdf(
      markdownToHtml(doc.sourceMarkdown),
    );

    // Stage the new bytes NEXT TO the final path, then swap: old file must
    // survive any failure before the new copy exists.
    const tmpUri = `${doc.pdfUri}.tmp`;
    try {
      await copyAsync({ from: cacheUri, to: tmpUri });
    } catch (err) {
      await deletePdfFile(tmpUri); // clean up a partial temp, best-effort
      throw err;
    }

    // New bytes are safely on disk — replace the old file. moveAsync (rename)
    // rather than copy: copyAsync won't overwrite an existing destination.
    await deletePdfFile(doc.pdfUri);
    await moveAsync({ from: tmpUri, to: doc.pdfUri });

    // Refresh the HTML snapshot + page count so Preview never shows a stale
    // render after a re-render. Snapshot-write failure is non-fatal (Preview
    // falls back to regenerating from sourceMarkdown).
    const htmlFile = htmlPath(id);
    let htmlUri = doc.htmlUri;
    try {
      await writeAsStringAsync(htmlFile, html);
      htmlUri = htmlFile;
    } catch (err) {
      console.warn(`[storage] could not refresh HTML snapshot ${htmlFile}:`, err);
    }

    // Persist updated metadata (pageCount + htmlUri) for this record in place.
    const updated: HistoryDoc = {
      ...doc,
      pageCount,
      ...(htmlUri !== undefined ? { htmlUri } : {}),
    };
    await writeHistory(history.map((d) => (d.id === id ? updated : d)));

    return doc.pdfUri;
  });
}
