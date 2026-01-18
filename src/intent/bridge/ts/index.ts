/**
 * Intent → Rules Bridge Module
 *
 * This module provides the authoritative bridge between validated intents
 * and rules pipelines.
 *
 * Primary exports (PR 1.5):
 * - ValidatedIntent: Branded proof token
 * - IntentRulesAdapter: Selects and invokes rules pipelines
 * - ValidationReport: Result of rules pipeline invocation
 *
 * Legacy exports (deprecated):
 * - IntentToRulesBridge: Original bridge that only selects pipelines
 */

// Primary exports (new, PR 1.5)
export type {
  IntentId,
  IntentType,
  RawIntent,
  ValidatedIntent,
  ValidationSummary,
  IntentValidationResult,
} from './ValidatedIntent';

export {
  createValidatedIntent,
  isValidatedIntentStructure,
} from './ValidatedIntent';

export type {
  RulesetId,
  InvocationId,
  RuleAuthorityClaim,
  RuleViolation,
  RulesAmbiguity,
  ValidationReport,
  RulesPipeline,
  PipelineRegistry,
} from './RulesPipeline';

export { RulesOutcome } from './RulesPipeline';

export type {
  AdapterFailure,
  AdapterResult,
} from './IntentRulesAdapter';

export {
  AdapterFailureCode,
  IntentRulesAdapter,
  createIntentRulesAdapter,
} from './IntentRulesAdapter';

// Legacy exports (deprecated, kept for backwards compatibility)
export type {
  BridgeViolation,
  RulesInvocationRequest,
  RulesInvocationResult,
  IntentToRulesBridge,
} from './types';

export { BridgeViolationCode } from './types';

export { createIntentToRulesBridge } from './IntentToRulesBridge';
