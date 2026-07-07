// [UI] Public surface for the screen layer. App.tsx composes these; logic stays
// in the existing hooks/modules (src/capture, src/parse, src/render, src/output,
// src/storage). See design/DESIGN-SPEC.md.

export { theme, colors, spacing, radius, type, touch, elevation } from './theme';
export { navReducer, initialScreen } from './navigation';
export type { Screen, NavAction, PreviewOrigin } from './navigation';
export { hasOnboarded, markOnboarded } from './onboarding';
export {
  formatHistoryDate,
  pageEstimateLabel,
  estimatePageCount,
  pageCountLabel,
  previewSubtitle,
  pageIndicatorLabel,
} from './format';

export { OnboardingScreen } from './screens/OnboardingScreen';
export { HomeScreen } from './screens/HomeScreen';
export { ProcessingScreen } from './screens/ProcessingScreen';
export { ErrorScreen } from './screens/ErrorScreen';
export { PreviewScreen } from './screens/PreviewScreen';
export type { OutputAction } from './screens/PreviewScreen';
export { HistoryScreen } from './screens/HistoryScreen';
