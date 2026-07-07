jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

import * as Print from 'expo-print';
import { getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy';
import { renderToPdf, A4_WIDTH_PT, A4_HEIGHT_PT } from '../toPdf';
import { buildDocument } from '../template';

const printMock = Print.printToFileAsync as jest.Mock;
const infoMock = getInfoAsync as jest.Mock;
const readMock = readAsStringAsync as jest.Mock;

// A minimal 2-page PDF (its /Type /Pages /Count says 2) as base64 — the value
// the parse SHOULD return, independent of whatever numberOfPages expo-print
// reports.
const TWO_PAGE_PDF =
  '%PDF-1.4\n2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj\n' +
  '3 0 obj << /Type /Page >> endobj\n4 0 obj << /Type /Page >> endobj\n%%EOF';
const TWO_PAGE_B64 = Buffer.from(TWO_PAGE_PDF, 'binary').toString('base64');

describe('renderToPdf — expo-print wrapper', () => {
  beforeEach(() => {
    printMock.mockReset();
    printMock.mockResolvedValue({ uri: 'file:///data/out.pdf', numberOfPages: 2 });
    infoMock.mockReset();
    infoMock.mockResolvedValue({ exists: true, size: TWO_PAGE_B64.length });
    readMock.mockReset();
    readMock.mockResolvedValue(TWO_PAGE_B64);
  });

  it('exports the locked A4 point dimensions', () => {
    expect(A4_WIDTH_PT).toBe(595);
    expect(A4_HEIGHT_PT).toBe(842);
  });

  it('calls printToFileAsync with explicit width:595/height:842 (Letter fix)', async () => {
    await renderToPdf('<p>hi</p>');
    expect(printMock).toHaveBeenCalledTimes(1);
    const arg = printMock.mock.calls[0][0];
    expect(arg.width).toBe(595);
    expect(arg.height).toBe(842);
  });

  it('passes the full built document (not the raw body) to expo-print', async () => {
    const body = '<h1>Doc</h1><p>body text</p>';
    await renderToPdf(body);
    const arg = printMock.mock.calls[0][0];
    expect(arg.html).toBe(buildDocument(body));
    expect(arg.html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(arg.html).toContain('data:font/woff2;base64,');
  });

  it('returns the file URI, page count and rendered html from expo-print', async () => {
    const body = '<p>x</p>';
    const result = await renderToPdf(body);
    expect(result.uri).toBe('file:///data/out.pdf');
    expect(result.pageCount).toBe(2);
    expect(result.html).toBe(buildDocument(body));
  });

  it('pageCount comes from the PDF file, NOT expo-print numberOfPages (Android 282-vs-17 bug)', async () => {
    // expo-print lies: says 282. The actual file's /Count is 2.
    printMock.mockResolvedValue({ uri: 'file:///data/out.pdf', numberOfPages: 282 });
    const result = await renderToPdf('<p>x</p>');
    expect(result.pageCount).toBe(2);
    expect(readMock).toHaveBeenCalledWith('file:///data/out.pdf', { encoding: 'base64' });
  });

  it('falls back to numberOfPages when the PDF read fails', async () => {
    printMock.mockResolvedValue({ uri: 'file:///data/out.pdf', numberOfPages: 9 });
    readMock.mockRejectedValue(new Error('ENOENT'));
    const result = await renderToPdf('<p>x</p>');
    expect(result.pageCount).toBe(9);
  });

  it('falls back to numberOfPages (skips parse) when the PDF is over the size cap', async () => {
    printMock.mockResolvedValue({ uri: 'file:///data/out.pdf', numberOfPages: 9 });
    infoMock.mockResolvedValue({ exists: true, size: 21 * 1024 * 1024 });
    const result = await renderToPdf('<p>x</p>');
    expect(result.pageCount).toBe(9);
    expect(readMock).not.toHaveBeenCalled();
  });
});
