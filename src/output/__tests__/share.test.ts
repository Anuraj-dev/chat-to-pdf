jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

import * as Sharing from 'expo-sharing';
import { sharePdf, SharingUnavailableError } from '../share';

const availableMock = Sharing.isAvailableAsync as jest.Mock;
const shareMock = Sharing.shareAsync as jest.Mock;

describe('sharePdf — expo-sharing wrapper', () => {
  beforeEach(() => {
    availableMock.mockReset().mockResolvedValue(true);
    shareMock.mockReset().mockResolvedValue(undefined);
  });

  it('shares the URI with application/pdf mime type and a dialog title', async () => {
    await sharePdf('file:///cache/out.pdf');
    expect(shareMock).toHaveBeenCalledTimes(1);
    const [uri, options] = shareMock.mock.calls[0];
    expect(uri).toBe('file:///cache/out.pdf');
    expect(options.mimeType).toBe('application/pdf');
    expect(typeof options.dialogTitle).toBe('string');
    expect(options.dialogTitle.length).toBeGreaterThan(0);
  });

  it('checks availability before sharing', async () => {
    await sharePdf('file:///cache/out.pdf');
    expect(availableMock).toHaveBeenCalledTimes(1);
    expect(availableMock.mock.invocationCallOrder[0]).toBeLessThan(
      shareMock.mock.invocationCallOrder[0],
    );
  });

  it('throws SharingUnavailableError (and never calls shareAsync) when unavailable', async () => {
    availableMock.mockResolvedValue(false);
    await expect(sharePdf('file:///cache/out.pdf')).rejects.toBeInstanceOf(
      SharingUnavailableError,
    );
    expect(shareMock).not.toHaveBeenCalled();
  });
});
