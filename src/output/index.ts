// [4] OUTPUT — print / save-to-files / share for the rendered PDF (issue #7).
// See docs/specs/0001-architecture-foundation.md §4.

export { sharePdf, SharingUnavailableError } from './share';
export { printPdf } from './print';
export { savePdf, MAX_PDF_BYTES, PdfTooLargeError, SaveFailedError } from './save';
export { suggestFilename, sanitizeUserFilename } from './filename';
export {
  SAF_DIRECTORY_KEY,
  SaveAccessDeniedError,
  clearDirectoryGrant,
  getPersistedDirectoryUri,
  requestDirectoryGrant,
} from './saf';
