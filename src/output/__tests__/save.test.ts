jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getInfoAsync,
  readAsStringAsync,
  StorageAccessFramework as SAF,
} from 'expo-file-system/legacy';
import {
  savePdf,
  MAX_PDF_BYTES,
  PdfTooLargeError,
  SaveFailedError,
} from '../save';
import { SAF_DIRECTORY_KEY, SaveAccessDeniedError } from '../saf';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;
const infoMock = getInfoAsync as jest.Mock;
const readMock = readAsStringAsync as jest.Mock;
const requestMock = SAF.requestDirectoryPermissionsAsync as jest.Mock;
const preflightMock = SAF.readDirectoryAsync as jest.Mock;
const createMock = SAF.createFileAsync as jest.Mock;
const writeMock = SAF.writeAsStringAsync as jest.Mock;

const SRC = 'file:///cache/Print/out.pdf';
const DIR = 'content://com.android.externalstorage.documents/tree/primary%3ADocuments';
const CREATED = `${DIR}/document/created.pdf`;

describe('savePdf — Android SAF persistence out of the cache dir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItem.mockResolvedValue(null);
    setItem.mockResolvedValue(undefined);
    removeItem.mockResolvedValue(undefined);
    infoMock.mockResolvedValue({ exists: true, size: 120_000, uri: SRC, isDirectory: false });
    readMock.mockResolvedValue('QkFTRTY0');
    requestMock.mockResolvedValue({ granted: true, directoryUri: DIR });
    preflightMock.mockResolvedValue([]);
    createMock.mockResolvedValue(CREATED);
    writeMock.mockResolvedValue(undefined);
  });

  it('first run: requests directory permission, persists the grant, creates + writes base64, returns SAF uri', async () => {
    const saved = await savePdf(SRC, 'quadratic-formula-2026-07-07.pdf');

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(SAF_DIRECTORY_KEY, DIR);
    // createFileAsync: parent dir, name WITHOUT extension (SAF appends it from mime), pdf mime
    expect(createMock).toHaveBeenCalledWith(
      DIR,
      'quadratic-formula-2026-07-07',
      'application/pdf',
    );
    // source read + destination write both in base64
    expect(readMock).toHaveBeenCalledWith(SRC, { encoding: 'base64' });
    expect(writeMock).toHaveBeenCalledWith(CREATED, 'QkFTRTY0', {
      encoding: 'base64',
    });
    expect(saved).toBe(CREATED);
  });

  it('reuses a persisted grant (after readDirectoryAsync preflight) without prompting again', async () => {
    getItem.mockResolvedValue(DIR);
    const saved = await savePdf(SRC, 'notes.pdf');
    expect(preflightMock).toHaveBeenCalledWith(DIR);
    expect(requestMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith(DIR, 'notes', 'application/pdf');
    expect(saved).toBe(CREATED);
  });

  it('permission denied: throws SaveAccessDeniedError and never creates or writes', async () => {
    requestMock.mockResolvedValue({ granted: false });
    await expect(savePdf(SRC, 'x.pdf')).rejects.toBeInstanceOf(
      SaveAccessDeniedError,
    );
    expect(createMock).not.toHaveBeenCalled();
    expect(writeMock).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('stale persisted grant (preflight fails): clears it, re-prompts once, saves into the fresh dir', async () => {
    getItem.mockResolvedValue('content://stale-grant');
    preflightMock.mockRejectedValue(new Error('grant revoked'));
    const freshDir = 'content://fresh-grant';
    const freshFile = `${freshDir}/document/out.pdf`;
    requestMock.mockResolvedValue({ granted: true, directoryUri: freshDir });
    createMock.mockResolvedValue(freshFile);

    const saved = await savePdf(SRC, 'x.pdf');

    expect(removeItem).toHaveBeenCalledWith(SAF_DIRECTORY_KEY);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(freshDir, 'x', 'application/pdf');
    expect(saved).toBe(freshFile);
  });

  it('cached grant + healthy preflight + write failure: SaveFailedError surfaces, grant NOT cleared, no re-prompt', async () => {
    getItem.mockResolvedValue(DIR);
    writeMock.mockRejectedValue(new Error('disk full'));

    await expect(savePdf(SRC, 'x.pdf')).rejects.toBeInstanceOf(SaveFailedError);
    await expect(savePdf(SRC, 'x.pdf')).rejects.toThrow(/disk full/);
    expect(removeItem).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('cached grant + healthy preflight + createFileAsync failure: error surfaces, grant kept, no re-prompt', async () => {
    getItem.mockResolvedValue(DIR);
    createMock.mockRejectedValue(new Error('provider refused'));

    await expect(savePdf(SRC, 'x.pdf')).rejects.toThrow(/provider refused/);
    expect(removeItem).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('fresh grant + createFileAsync failure: SaveFailedError, exactly one prompt (no loop)', async () => {
    createMock.mockRejectedValue(new Error('create failed'));

    await expect(savePdf(SRC, 'x.pdf')).rejects.toBeInstanceOf(SaveFailedError);
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('oversized PDF: PdfTooLargeError before any base64 load, prompt, or write', async () => {
    infoMock.mockResolvedValue({
      exists: true,
      size: MAX_PDF_BYTES + 1,
      uri: SRC,
      isDirectory: false,
    });

    await expect(savePdf(SRC, 'x.pdf')).rejects.toBeInstanceOf(PdfTooLargeError);
    expect(readMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(writeMock).not.toHaveBeenCalled();
  });

  it('a PDF exactly at the size ceiling still saves', async () => {
    infoMock.mockResolvedValue({
      exists: true,
      size: MAX_PDF_BYTES,
      uri: SRC,
      isDirectory: false,
    });
    await expect(savePdf(SRC, 'x.pdf')).resolves.toBe(CREATED);
  });
});
