// Mock the native surfaces download.ts imports so the pure byte/hash plumbing
// can run under jest. `digest` is backed by Node's crypto so the test proves the
// client's SHA-256 method matches standard `sha256sum` (spec §8, CI contract).
import { createHash } from 'crypto';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  // require() inside the factory — jest forbids referencing out-of-scope imports.
  digest: jest.fn(async (_algo: string, bytes: Uint8Array) => {
    const hash = require('crypto').createHash('sha256').update(Buffer.from(bytes)).digest();
    return hash.buffer.slice(hash.byteOffset, hash.byteOffset + hash.byteLength);
  }),
}));

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  cacheDirectory: 'file:///cache/',
  createDownloadResumable: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

import { readAsStringAsync } from 'expo-file-system/legacy';
import { base64ToBytes, sha256OfFile } from '../download';

const readMock = readAsStringAsync as jest.Mock;

describe('base64ToBytes — standard base64 → raw bytes', () => {
  it('decodes ASCII text', () => {
    expect(Array.from(base64ToBytes('aGVsbG8='))).toEqual([...Buffer.from('hello')]);
  });

  it('decodes binary bytes including nulls/high bytes', () => {
    const raw = Uint8Array.from([0x00, 0xff, 0x10, 0x80, 0x7f, 0x01]);
    const b64 = Buffer.from(raw).toString('base64');
    expect(Array.from(base64ToBytes(b64))).toEqual([...raw]);
  });

  it('ignores embedded newlines (wrapped base64)', () => {
    const b64 = Buffer.from('the quick brown fox').toString('base64');
    const wrapped = b64.slice(0, 4) + '\n' + b64.slice(4);
    expect(Buffer.from(base64ToBytes(wrapped))).toEqual(Buffer.from('the quick brown fox'));
  });
});

describe('sha256OfFile — matches sha256sum of the raw file bytes', () => {
  it('hashes decoded bytes, not the base64 string', async () => {
    // sha256sum of the literal bytes "hello".
    const expected = createHash('sha256').update('hello').digest('hex');
    readMock.mockResolvedValueOnce(Buffer.from('hello').toString('base64'));
    await expect(sha256OfFile('file:///cache/updates/app.apk')).resolves.toBe(expected);
  });
});
