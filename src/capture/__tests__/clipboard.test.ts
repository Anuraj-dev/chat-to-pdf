// Tests for the expo-clipboard wrappers — issue #6.

import {
  CLIPBOARD_READ_DELAY_MS,
  CLIPBOARD_RETRY_DELAY_MS,
  readClipboard,
  readClipboardWithRetry,
} from '../clipboard';
import * as Clipboard from 'expo-clipboard';

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(),
}));

const mockGet = Clipboard.getStringAsync as jest.MockedFunction<
  typeof Clipboard.getStringAsync
>;

describe('readClipboard', () => {
  beforeEach(() => mockGet.mockReset());

  it('returns the clipboard string when non-empty', async () => {
    mockGet.mockResolvedValue('hello');
    await expect(readClipboard()).resolves.toBe('hello');
  });

  it('returns null for an empty clipboard', async () => {
    mockGet.mockResolvedValue('');
    await expect(readClipboard()).resolves.toBeNull();
  });

  it('returns null for a whitespace-only clipboard', async () => {
    mockGet.mockResolvedValue('   \n\t');
    await expect(readClipboard()).resolves.toBeNull();
  });

  it('returns null when the read is denied / throws', async () => {
    mockGet.mockRejectedValue(new Error('permission denied'));
    await expect(readClipboard()).resolves.toBeNull();
  });
});

describe('readClipboardWithRetry (focus-aware Android read)', () => {
  beforeEach(() => {
    mockGet.mockReset();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits the initial delay before the first read', async () => {
    mockGet.mockResolvedValue('hi');
    const promise = readClipboardWithRetry();

    expect(mockGet).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(CLIPBOARD_READ_DELAY_MS);
    await expect(promise).resolves.toBe('hi');
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('retries once after the retry delay when the first read is empty', async () => {
    mockGet.mockResolvedValueOnce('').mockResolvedValueOnce('late');
    const promise = readClipboardWithRetry();

    await jest.advanceTimersByTimeAsync(CLIPBOARD_READ_DELAY_MS);
    expect(mockGet).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(CLIPBOARD_RETRY_DELAY_MS);
    await expect(promise).resolves.toBe('late');
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('retries when the first read throws (denied), too', async () => {
    mockGet.mockRejectedValueOnce(new Error('no focus')).mockResolvedValueOnce('ok');
    const promise = readClipboardWithRetry();

    await jest.advanceTimersByTimeAsync(
      CLIPBOARD_READ_DELAY_MS + CLIPBOARD_RETRY_DELAY_MS,
    );
    await expect(promise).resolves.toBe('ok');
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('returns null when both reads come back empty', async () => {
    mockGet.mockResolvedValue('');
    const promise = readClipboardWithRetry();

    await jest.advanceTimersByTimeAsync(
      CLIPBOARD_READ_DELAY_MS + CLIPBOARD_RETRY_DELAY_MS,
    );
    await expect(promise).resolves.toBeNull();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry when the first read succeeds', async () => {
    mockGet.mockResolvedValue('first');
    const promise = readClipboardWithRetry();

    await jest.advanceTimersByTimeAsync(
      CLIPBOARD_READ_DELAY_MS + CLIPBOARD_RETRY_DELAY_MS,
    );
    await expect(promise).resolves.toBe('first');
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('honors custom delays', async () => {
    mockGet.mockResolvedValue('x');
    const promise = readClipboardWithRetry(10, 20);

    await jest.advanceTimersByTimeAsync(10);
    await expect(promise).resolves.toBe('x');
  });
});
