/**
 * Components Index (FE-PR 0.3)
 *
 * Components include:
 * - Read-only DTO renderers (FE-PR 0.1)
 * - Intent capture form (FE-PR 0.2) - declaration only, no interpretation
 * - Validation report viewer (FE-PR 0.3) - raw, flat, honest
 */

export { JsonDump, type JsonDumpProps } from './JsonDump';
export {
  ValidationReportView,
  type ValidationReportViewProps,
} from './ValidationReportView';
export {
  EffectView,
  EffectListView,
  type EffectViewProps,
  type EffectListViewProps,
} from './EffectView';
export {
  OverrideView,
  OverrideListView,
  type OverrideViewProps,
  type OverrideListViewProps,
} from './OverrideView';
export { ResolutionView, type ResolutionViewProps } from './ResolutionView';
export {
  AggregatedValidationView,
  type AggregatedValidationViewProps,
} from './AggregatedValidationView';
export {
  IntentCaptureForm,
  type IntentCaptureFormProps,
} from './IntentCaptureForm';
export {
  ValidationReportViewer,
  RuleResultsPanel,
  CostsPanel,
  ConflictsPanel,
  EffectsPanel,
  type ValidationReportViewerProps,
  type RuleResultsPanelProps,
  type CostsPanelProps,
  type ConflictsPanelProps,
  type EffectsPanelProps,
} from './ValidationReportViewer';
