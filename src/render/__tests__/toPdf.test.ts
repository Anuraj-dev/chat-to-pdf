jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));

import * as Print from 'expo-print';
import { renderToPdf, A4_WIDTH_PT, A4_HEIGHT_PT } from '../toPdf';
import { buildDocument } from '../template';

const printMock = Print.printToFileAsync as jest.Mock;

describe('renderToPdf — expo-print wrapper', () => {
  beforeEach(() => {
    printMock.mockReset();
    printMock.mockResolvedValue({ uri: 'file:///data/out.pdf' });
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

  it('returns the file URI from expo-print', async () => {
    const uri = await renderToPdf('<p>x</p>');
    expect(uri).toBe('file:///data/out.pdf');
  });
});
