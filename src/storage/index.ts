// [4] STORAGE — public API: on-device PDF history over AsyncStorage +
// expo-file-system (durable document dir). See docs/specs/0001 §4. Issue #8.

export {
  HISTORY_KEY,
  HISTORY_CAP,
  deriveTitle,
  saveDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  regeneratePdf,
} from './history';
export type { SaveDocumentInput } from './history';
export type { HistoryDoc } from '../types';
