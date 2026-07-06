jest.mock('expo-print', () => ({ printAsync: jest.fn() }));

import * as Print from 'expo-print';
import { printPdf } from '../print';

const printMock = Print.printAsync as jest.Mock;

describe('printPdf — expo-print system dialog wrapper', () => {
  beforeEach(() => {
    printMock.mockReset().mockResolvedValue(undefined);
  });

  it('opens the system print dialog with the PDF uri', async () => {
    await printPdf('file:///cache/out.pdf');
    expect(printMock).toHaveBeenCalledTimes(1);
    expect(printMock).toHaveBeenCalledWith({ uri: 'file:///cache/out.pdf' });
  });

  it('propagates print errors to the caller', async () => {
    printMock.mockRejectedValue(new Error('printer exploded'));
    await expect(printPdf('file:///x.pdf')).rejects.toThrow('printer exploded');
  });
});
