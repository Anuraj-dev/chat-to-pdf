import {
  parsePdfPageCount,
  countPagesFromBase64,
  decodeBase64ToBinary,
} from '../pageCount';

// A hand-written, structurally valid classic PDF (uncompressed objects — the
// form Android's PdfDocument print path emits). Kids/Count describe a 3-page doc.
function pdf3Pages(): string {
  return [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>',
    'endobj',
    '4 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>',
    'endobj',
    '5 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>',
    'endobj',
    'trailer << /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');
}

// A two-level page tree: an intermediate /Pages node (/Count 2) plus the root
// /Pages node (/Count 5). The TRUE page count is the largest /Count (the root).
function pdfNestedTree(): string {
  return [
    '%PDF-1.5',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R 6 0 R] /Count 5 >> endobj',
    '3 0 obj << /Type /Pages /Parent 2 0 R /Kids [4 0 R 5 0 R] /Count 2 >> endobj',
    '4 0 obj << /Type /Page /Parent 3 0 R >> endobj',
    '5 0 obj << /Type /Page /Parent 3 0 R >> endobj',
    '6 0 obj << /Type /Page /Parent 2 0 R >> endobj',
    '%%EOF',
  ].join('\n');
}

// Corrupt: the /Pages node has no /Count, so the page-tree parse must fail and
// fall back to counting leaf /Type /Page objects (there are 4).
function pdfNoCountFourPages(): string {
  return [
    '%PDF-1.4',
    '2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R 5 0 R 6 0 R] >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R >> endobj',
    '4 0 obj << /Type /Page /Parent 2 0 R >> endobj',
    '5 0 obj << /Type /Page /Parent 2 0 R >> endobj',
    '6 0 obj << /Type /Page /Parent 2 0 R >> endobj',
    '%%EOF',
  ].join('\n');
}

describe('parsePdfPageCount — robust PDF page counting', () => {
  it('reads the /Count on the /Type /Pages root object', () => {
    expect(parsePdfPageCount(pdf3Pages(), 999)).toBe(3);
  });

  it('takes the LARGEST /Count across a multi-level page tree (root, not a subtree)', () => {
    expect(parsePdfPageCount(pdfNestedTree(), 999)).toBe(5);
  });

  it('falls back to counting /Type /Page leaves when no /Count is present', () => {
    expect(parsePdfPageCount(pdfNoCountFourPages(), 999)).toBe(4);
  });

  it('never counts /Type /Pages as a leaf page in the fallback path', () => {
    // Only the /Pages node exists, zero real pages → no leaves, no count →
    // fall through to the provided (expo-print) value.
    const onlyPages = '2 0 obj << /Type /Pages /Kids [] >> endobj';
    expect(parsePdfPageCount(onlyPages, 7)).toBe(7);
  });

  it('falls back to the provided numberOfPages on garbage input', () => {
    expect(parsePdfPageCount('not a pdf at all', 42)).toBe(42);
    expect(parsePdfPageCount('', 17)).toBe(17);
  });

  it('handles /Type/Pages and /Count with no spaces around the slash', () => {
    const tight = '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 11>>endobj';
    expect(parsePdfPageCount(tight, 999)).toBe(11);
  });
});

describe('decodeBase64ToBinary', () => {
  it('round-trips ASCII text through base64', () => {
    // base64 of "/Type /Pages /Count 3"
    const b64 = Buffer.from('/Type /Pages /Count 3', 'binary').toString('base64');
    expect(decodeBase64ToBinary(b64)).toBe('/Type /Pages /Count 3');
  });

  it('tolerates whitespace/newlines in the base64 payload', () => {
    const raw = pdf3Pages();
    const b64 = Buffer.from(raw, 'binary').toString('base64');
    const chunked = b64.replace(/(.{20})/g, '$1\n');
    expect(decodeBase64ToBinary(chunked)).toBe(raw);
  });
});

describe('countPagesFromBase64', () => {
  it('decodes then parses the page count from a base64 PDF', () => {
    const b64 = Buffer.from(pdf3Pages(), 'binary').toString('base64');
    expect(countPagesFromBase64(b64, 999)).toBe(3);
  });

  it('falls back to numberOfPages when the base64 decodes to garbage', () => {
    const b64 = Buffer.from('garbage bytes here', 'binary').toString('base64');
    expect(countPagesFromBase64(b64, 5)).toBe(5);
  });
});
