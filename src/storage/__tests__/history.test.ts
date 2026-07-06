// expo-file-system/legacy — mock the document dir + file ops we touch.
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docdir/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn(),
}));

// parse/render public API — only regeneratePdf reaches these; keep internals untouched.
jest.mock('../../parse', () => ({ markdownToHtml: jest.fn(() => '<h1>html</h1>') }));
jest.mock('../../render', () => ({ renderToPdf: jest.fn() }));

// AsyncStorage — a real in-memory mockStore so round-trips behave like the device.
let mockStore: Record<string, string>;
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) => Promise.resolve(mockStore[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      mockStore[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      delete mockStore[k];
      return Promise.resolve();
    }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  copyAsync,
  deleteAsync,
  makeDirectoryAsync,
  moveAsync,
} from 'expo-file-system/legacy';
import { markdownToHtml } from '../../parse';
import { renderToPdf } from '../../render';
import {
  HISTORY_KEY,
  HISTORY_CAP,
  deriveTitle,
  saveDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  regeneratePdf,
} from '../history';

const copyMock = copyAsync as jest.Mock;
const deleteMock = deleteAsync as jest.Mock;
const mkdirMock = makeDirectoryAsync as jest.Mock;
const moveMock = moveAsync as jest.Mock;
const renderMock = renderToPdf as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

const CACHE = 'file:///cache/Print/out.pdf';

beforeEach(() => {
  mockStore = {};
  jest.clearAllMocks();
  copyMock.mockResolvedValue(undefined);
  deleteMock.mockResolvedValue(undefined);
  mkdirMock.mockResolvedValue(undefined);
  moveMock.mockResolvedValue(undefined);
  renderMock.mockResolvedValue('file:///cache/Print/regen.pdf');
});

describe('saveDocument — copy to durable dir + prepend record', () => {
  it('makes the pdfs dir, copies the cache PDF to a durable doc-dir path, stores that uri', async () => {
    const doc = await saveDocument({
      title: 'Quadratic formula',
      sourceMarkdown: '# Quadratic formula',
      cachePdfUri: CACHE,
    });

    expect(mkdirMock).toHaveBeenCalledWith('file:///docdir/pdfs/', {
      intermediates: true,
    });
    expect(copyMock).toHaveBeenCalledWith({ from: CACHE, to: doc.pdfUri });
    // durable uri is under the app document dir, NOT the cache dir
    expect(doc.pdfUri).toBe(`file:///docdir/pdfs/${doc.id}.pdf`);
    expect(doc.pdfUri.startsWith('file:///docdir/')).toBe(true);
    expect(doc.title).toBe('Quadratic formula');
    expect(typeof doc.createdAt).toBe('number');
  });

  it('round-trips through list / get, newest first', async () => {
    const a = await saveDocument({ title: 'A', sourceMarkdown: 'a', cachePdfUri: CACHE });
    const b = await saveDocument({ title: 'B', sourceMarkdown: 'b', cachePdfUri: CACHE });

    const list = await listDocuments();
    expect(list.map((d) => d.id)).toEqual([b.id, a.id]); // newest first
    expect(await getDocument(a.id)).toEqual(a);
    expect(await getDocument(b.id)).toEqual(b);
    expect(await getDocument('nope')).toBeNull();
  });

  it('surfaces a copy failure and writes NO record (caller keeps the cache uri)', async () => {
    copyMock.mockRejectedValue(new Error('cache purged'));

    await expect(
      saveDocument({ title: 'X', sourceMarkdown: 'x', cachePdfUri: CACHE }),
    ).rejects.toThrow(/cache purged/);

    expect(setItem).not.toHaveBeenCalled(); // no partial record persisted
    expect(await listDocuments()).toEqual([]);
  });

  it('on a record-write failure after the copy, deletes the durable file and rethrows (no orphan)', async () => {
    setItem.mockRejectedValueOnce(new Error('storage full'));

    await expect(
      saveDocument({ title: 'X', sourceMarkdown: 'x', cachePdfUri: CACHE }),
    ).rejects.toThrow(/storage full/);

    // the just-copied durable file was cleaned up
    const copiedTo = copyMock.mock.calls[0][0].to as string;
    expect(deleteMock).toHaveBeenCalledWith(copiedTo, { idempotent: true });
    expect(await listDocuments()).toEqual([]); // no record persisted
  });

  it('serializes overlapping saves — both records survive (no lost update)', async () => {
    // Slow copies force the two calls to overlap in real time; without the
    // mutex both would read an empty history and the second write would
    // clobber the first record.
    copyMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 10)),
    );

    const [a, b] = await Promise.all([
      saveDocument({ title: 'A', sourceMarkdown: 'a', cachePdfUri: CACHE }),
      saveDocument({ title: 'B', sourceMarkdown: 'b', cachePdfUri: CACHE }),
    ]);

    const list = await listDocuments();
    expect(list.length).toBe(2);
    expect(list.map((d) => d.id).sort()).toEqual([a.id, b.id].sort());
  });
});

describe('deleteDocument — record + file, tolerant of missing file', () => {
  it('removes the record and deletes its PDF file', async () => {
    const doc = await saveDocument({ title: 'A', sourceMarkdown: 'a', cachePdfUri: CACHE });
    await deleteDocument(doc.id);

    expect(await listDocuments()).toEqual([]);
    expect(deleteMock).toHaveBeenCalledWith(doc.pdfUri, { idempotent: true });
  });

  it('a delete-file error does not reject the record delete', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const doc = await saveDocument({ title: 'A', sourceMarkdown: 'a', cachePdfUri: CACHE });
    deleteMock.mockRejectedValue(new Error('gone'));

    await expect(deleteDocument(doc.id)).resolves.toBeUndefined();
    expect(await listDocuments()).toEqual([]);
    warn.mockRestore();
  });

  it('deleting an unknown id is a no-op (no file delete)', async () => {
    await deleteDocument('missing');
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe('eviction at HISTORY_CAP', () => {
  it('keeps the newest CAP records and deletes the evicted ones plus their PDF files', async () => {
    // Seed CAP records directly to avoid CAP+ real saves; oldest last.
    const seeded = Array.from({ length: HISTORY_CAP }, (_, i) => ({
      id: `seed-${i}`,
      title: `t${i}`,
      sourceMarkdown: 'm',
      pdfUri: `file:///docdir/pdfs/seed-${i}.pdf`,
      createdAt: i,
    }));
    mockStore[HISTORY_KEY] = JSON.stringify(seeded);
    const oldest = seeded[HISTORY_CAP - 1];

    const fresh = await saveDocument({ title: 'new', sourceMarkdown: 'n', cachePdfUri: CACHE });

    const list = await listDocuments();
    expect(list.length).toBe(HISTORY_CAP);
    expect(list[0].id).toBe(fresh.id); // newest at head
    expect(list.some((d) => d.id === oldest.id)).toBe(false); // oldest evicted
    // evicted record's PDF file deleted — and only AFTER the history write
    // succeeded (a failed write must not point surviving records at deleted files)
    expect(deleteMock).toHaveBeenCalledWith(oldest.pdfUri, { idempotent: true });
    const lastWriteOrder = Math.max(...setItem.mock.invocationCallOrder);
    const firstDeleteOrder = Math.min(...deleteMock.mock.invocationCallOrder);
    expect(firstDeleteOrder).toBeGreaterThan(lastWriteOrder);
  });
});

describe('corrupted / malformed history key', () => {
  it('treats invalid JSON as empty (no crash)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockStore[HISTORY_KEY] = '{ this is not json';
    expect(await listDocuments()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('treats a non-array JSON value as empty', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockStore[HISTORY_KEY] = JSON.stringify({ not: 'an array' });
    expect(await listDocuments()).toEqual([]);
    warn.mockRestore();
  });
});

describe('regeneratePdf — re-render markdown, replace file, same uri', () => {
  it('stages the fresh render to a temp path, then swaps it in (copy tmp → delete old → move)', async () => {
    const doc = await saveDocument({
      title: 'Doc',
      sourceMarkdown: '# heading\nbody',
      cachePdfUri: CACHE,
    });
    copyMock.mockClear();
    deleteMock.mockClear();

    const uri = await regeneratePdf(doc.id);

    expect(markdownToHtml).toHaveBeenCalledWith('# heading\nbody');
    expect(renderMock).toHaveBeenCalled();
    const tmp = `${doc.pdfUri}.tmp`;
    // fresh bytes staged to the temp path FIRST
    expect(copyMock).toHaveBeenCalledWith({
      from: 'file:///cache/Print/regen.pdf',
      to: tmp,
    });
    // old file removed only after the staging copy, then temp moved into place
    expect(deleteMock).toHaveBeenCalledWith(doc.pdfUri, { idempotent: true });
    expect(moveMock).toHaveBeenCalledWith({ from: tmp, to: doc.pdfUri });
    expect(deleteMock.mock.invocationCallOrder[0]).toBeGreaterThan(
      copyMock.mock.invocationCallOrder[0],
    );
    // same durable uri, record untouched
    expect(uri).toBe(doc.pdfUri);
    expect(await getDocument(doc.id)).toEqual(doc);
  });

  it('a failed staging copy leaves the old durable PDF and record untouched', async () => {
    const doc = await saveDocument({
      title: 'Doc',
      sourceMarkdown: 'md',
      cachePdfUri: CACHE,
    });
    copyMock.mockClear();
    deleteMock.mockClear();
    copyMock.mockRejectedValue(new Error('render copy failed'));

    await expect(regeneratePdf(doc.id)).rejects.toThrow(/render copy failed/);

    // old durable file NEVER deleted; only the temp is cleaned up (best-effort)
    expect(deleteMock).not.toHaveBeenCalledWith(doc.pdfUri, { idempotent: true });
    expect(deleteMock).toHaveBeenCalledWith(`${doc.pdfUri}.tmp`, {
      idempotent: true,
    });
    expect(moveMock).not.toHaveBeenCalled();
    expect(await getDocument(doc.id)).toEqual(doc); // record unchanged
  });

  it('throws for an unknown id', async () => {
    await expect(regeneratePdf('nope')).rejects.toThrow(/no document/);
  });
});

describe('deriveTitle', () => {
  it('prefers the first markdown heading', () => {
    expect(deriveTitle('intro\n## The **Real** Title\nmore')).toBe('The Real Title');
  });
  it('falls back to the first non-empty line', () => {
    expect(deriveTitle('\n\nJust a paragraph here')).toBe('Just a paragraph here');
  });
  it('falls back to Untitled for empty input', () => {
    expect(deriveTitle('   \n  ')).toBe('Untitled');
  });
});
