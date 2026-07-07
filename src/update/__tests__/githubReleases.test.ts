import { resolveUpdate, parseSha256Line, parseLatestRelease } from '../githubReleases';
import type { ReleaseAsset } from '../models';

const APK: ReleaseAsset = {
  name: 'chat-to-pdf-1.1.0.apk',
  downloadUrl: 'https://example.com/chat-to-pdf-1.1.0.apk',
};
const SHA: ReleaseAsset = {
  name: 'chat-to-pdf-1.1.0.apk.sha256',
  downloadUrl: 'https://example.com/chat-to-pdf-1.1.0.apk.sha256',
};

describe('resolveUpdate — the pure check core', () => {
  it('UpToDate when the latest tag is equal or older', () => {
    expect(resolveUpdate('1.1.0', 'v1.1.0', [APK, SHA])).toEqual({
      kind: 'UpToDate',
      current: '1.1.0',
    });
    expect(resolveUpdate('1.2.0', 'v1.1.0', [APK, SHA]).kind).toBe('UpToDate');
  });

  it('UpdateAvailable with normalized version + asset urls', () => {
    const result = resolveUpdate('1.0.0', 'v1.1.0', [APK, SHA]);
    expect(result).toEqual({
      kind: 'UpdateAvailable',
      version: '1.1.0',
      apkUrl: APK.downloadUrl,
      sha256Url: SHA.downloadUrl,
      notes: '',
    });
  });

  it('does not mistake the .apk.sha256 sibling for the binary', () => {
    // Only the checksum asset present → still MissingAsset (no real apk).
    const result = resolveUpdate('1.0.0', 'v1.1.0', [SHA]);
    expect(result.kind).toBe('MissingAsset');
  });

  it('MalformedMetadata when either version is unparseable', () => {
    expect(resolveUpdate('1.0.0', 'nightly', [APK, SHA]).kind).toBe('MalformedMetadata');
    expect(resolveUpdate('dev', 'v1.1.0', [APK, SHA]).kind).toBe('MalformedMetadata');
  });

  it('MissingAsset when the .apk or .apk.sha256 is absent', () => {
    expect(resolveUpdate('1.0.0', 'v1.1.0', [APK]).kind).toBe('MissingAsset');
    expect(resolveUpdate('1.0.0', 'v1.1.0', []).kind).toBe('MissingAsset');
  });
});

describe('parseSha256Line — hex before the first space', () => {
  const HEX = 'a'.repeat(64);

  it('extracts the digest from a sha256sum line', () => {
    expect(parseSha256Line(`${HEX}  chat-to-pdf-1.1.0.apk`)).toBe(HEX);
  });

  it('accepts a bare digest and lowercases it', () => {
    expect(parseSha256Line('A'.repeat(64))).toBe('a'.repeat(64));
  });

  it('trims surrounding whitespace/newlines', () => {
    expect(parseSha256Line(`\n  ${HEX} *file.apk\n`)).toBe(HEX);
  });

  it('returns null for a non-64-hex token', () => {
    expect(parseSha256Line('nothex  file.apk')).toBeNull();
    expect(parseSha256Line('abc123')).toBeNull();
    expect(parseSha256Line('')).toBeNull();
    expect(parseSha256Line(`${'z'.repeat(64)}  file.apk`)).toBeNull();
  });
});

describe('parseLatestRelease — GitHub json → LatestRelease', () => {
  it('reads tag, notes body and named download urls', () => {
    const release = parseLatestRelease({
      tag_name: 'v1.1.0',
      body: 'Fixes things',
      assets: [
        { name: 'chat-to-pdf-1.1.0.apk', browser_download_url: 'https://x/y.apk' },
        { name: 'ignored', browser_download_url: 123 },
      ],
    });
    expect(release).toEqual({
      tag: 'v1.1.0',
      notes: 'Fixes things',
      assets: [{ name: 'chat-to-pdf-1.1.0.apk', downloadUrl: 'https://x/y.apk' }],
    });
  });

  it('returns null without a string tag_name', () => {
    expect(parseLatestRelease({})).toBeNull();
    expect(parseLatestRelease({ tag_name: 42 })).toBeNull();
  });

  it('defaults notes to empty and assets to []', () => {
    expect(parseLatestRelease({ tag_name: 'v1.0.0' })).toEqual({
      tag: 'v1.0.0',
      notes: '',
      assets: [],
    });
  });
});
