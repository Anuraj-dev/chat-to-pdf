// [UI] Hand-rolled navigation — a pure screen-state reducer (NO expo-router, NO
// react-navigation; locked decision, docs/decisions.md). App.tsx owns this state
// via useReducer and renders the matching screen. Keeping it pure means the flow
// (Home → Processing → Preview, error retries, History reopen) is unit-testable
// without mounting any RN component. See design/DESIGN-SPEC.md §6.

/** Where Preview was opened from — the back chevron returns here. */
export type PreviewOrigin = 'home' | 'history';

export type Screen =
  | { name: 'home' }
  // `failures` carries across the Processing⇄Error retry cycle so the error
  // copy can adapt after repeated failures (spec §1g #2 / §7 adaptive copy).
  | { name: 'processing'; failures: number }
  | { name: 'error'; failures: number }
  | { name: 'preview'; docId: string; origin: PreviewOrigin }
  | { name: 'history' };

export type NavAction =
  | { type: 'START_PROCESSING' } // Home "Make PDF"
  | { type: 'PROCESSING_SUCCEEDED'; docId: string }
  | { type: 'PROCESSING_FAILED' }
  | { type: 'CANCEL_PROCESSING' } // Processing "Cancel"
  | { type: 'RETRY' } // Error "Try again"
  | { type: 'BACK_TO_TEXT' } // Error "Go back to my text"
  | { type: 'OPEN_HISTORY' } // Home top-bar "History"
  | { type: 'OPEN_PREVIEW_FROM_HISTORY'; docId: string }
  | { type: 'BACK' }; // back chevron (Preview / History)

export const initialScreen: Screen = { name: 'home' };

export function navReducer(state: Screen, action: NavAction): Screen {
  switch (action.type) {
    case 'START_PROCESSING':
      // Fresh attempt from Home resets the failure counter.
      return { name: 'processing', failures: 0 };

    case 'RETRY':
      // Re-enter Processing carrying the accumulated failure count.
      return {
        name: 'processing',
        failures: state.name === 'error' ? state.failures : 0,
      };

    case 'PROCESSING_SUCCEEDED':
      return { name: 'preview', docId: action.docId, origin: 'home' };

    case 'PROCESSING_FAILED':
      return {
        name: 'error',
        failures: (state.name === 'processing' ? state.failures : 0) + 1,
      };

    case 'CANCEL_PROCESSING':
    case 'BACK_TO_TEXT':
      return { name: 'home' };

    case 'OPEN_HISTORY':
      return { name: 'history' };

    case 'OPEN_PREVIEW_FROM_HISTORY':
      return { name: 'preview', docId: action.docId, origin: 'history' };

    case 'BACK':
      if (state.name === 'preview') return { name: state.origin };
      // History (and any other back-capable screen) returns Home.
      return { name: 'home' };

    default:
      return state;
  }
}
