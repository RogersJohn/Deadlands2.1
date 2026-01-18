/**
 * UI Module (PR 3.0)
 *
 * Read-only UI skeleton for observing the authority chain.
 *
 * Core principle: The UI is a window into authority, not a source of authority.
 *
 * This module exports:
 * - Types for UI data flow
 * - Intent builder logic
 * - Authority viewer logic
 * - Pipeline client interface
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  // Raw intent types
  RawIntentInput,
  IntentFieldDefinition,
  IntentTypeDefinition,

  // Validation types
  RulesOutcome,
  RuleViolation,
  RulesAmbiguity,
  ValidationReport,

  // Override types
  OverrideWarning,
  GmOverride,

  // Resolution types
  ResolutionOutcome,
  Effect,
  ResolutionResult,

  // Pipeline types
  PipelineResult,

  // UI state types
  IntentBuilderState,
  FieldValidation,
} from './types';

// ============================================================================
// INTENT BUILDER
// ============================================================================

export {
  // State management
  createInitialState,
  selectIntentType,
  setFieldValue,
  setSubmitting,
  setValidationErrors,

  // Validation
  validateField,
  validateAllFields,
  canSubmit,

  // Intent construction
  buildRawIntent,

  // Registry
  getIntentTypeDefinition,
  EXAMPLE_INTENT_TYPES,
} from './components/IntentBuilder';

// ============================================================================
// AUTHORITY VIEWER
// ============================================================================

export type {
  IntentView,
  ViolationView,
  AmbiguityView,
  ValidationView,
  OverrideView,
  EffectView,
  ResolutionView,
  AuthorityChainView,
  ValidationErrorView,
  AdapterFailureView,
} from './components/AuthorityViewer';

export {
  toIntentView,
  toValidationView,
  toOverrideView,
  toEffectView,
  toResolutionView,
  toAuthorityChainView,
  toErrorView,
} from './components/AuthorityViewer';

// ============================================================================
// PIPELINE
// ============================================================================

export type { PipelineClient, MockPipelineConfig } from './Pipeline';

export {
  createMockPipelineClient,
  createValidationErrorMock,
  createAdapterFailureMock,
  DEFAULT_MOCK_CONFIG,
} from './Pipeline';
