// [3] RENDER — public API. Parsed body HTML → full print document → on-device PDF.
// See docs/specs/0001-architecture-foundation.md §4. Issue #5.

export {
  buildDocument,
  markBreakableBlocks,
  DEFAULT_BREAKABLE_THRESHOLD,
  PRE_BREAKABLE_LINES,
  TABLE_BREAKABLE_ROWS,
} from './template';
export type { BuildDocumentOptions } from './template';
export { PRINT_CSS } from './print.css';
export { renderToPdf, A4_WIDTH_PT, A4_HEIGHT_PT } from './toPdf';
