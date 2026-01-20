/**
 * Components Index (FE-PR 1.0)
 *
 * Components include:
 * - Read-only DTO renderers (FE-PR 0.1)
 * - Intent capture form (FE-PR 0.2) - declaration only, no interpretation
 * - Validation report viewer (FE-PR 0.3) - raw, flat, honest
 * - GM Override panel (FE-PR 1.0) - explicit, heavy, auditable
 * - Explanation Graph viewer (FE-PR 1.0) - post-hoc traceability
 * - AI Commentary panel (FE-PR 1.0) - hidden by default, non-authoritative
 * - Session Log (FE-PR 1.0) - immutable audit timeline
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
export {
  GmOverridePanel,
  OverrideDisplay,
  OverrideListDisplay,
  type GmOverridePanelProps,
  type OverrideDisplayProps,
} from './GmOverridePanel';
export {
  ExplanationGraphViewer,
  ExplanationNodeView,
  ExplanationEdgeView,
  type ExplanationGraphViewerProps,
  type ExplanationNodeViewProps,
} from './ExplanationGraphViewer';
export {
  AiCommentaryPanel,
  type AiCommentaryPanelProps,
  type AiCommentary,
} from './AiCommentaryPanel';
export {
  SessionLog,
  SessionLogEntryView,
  type SessionLogProps,
  type SessionLogEntry,
  type SessionLogEntryType,
  type SessionLogEntryViewProps,
  type IntentLogEntry,
  type ValidationLogEntry,
  type OverrideLogEntry,
  type EffectLogEntry,
} from './SessionLog';
