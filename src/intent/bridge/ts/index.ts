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
 * PR 4.2 exports:
 * - AggregatedValidationReport: Results from multiple validators
 * - ValidationAggregator: Collects ALL validator results without resolution
 * - processIntentAggregated(): Multi-validator aggregation method
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
  AmbiguityInterpretation,
  RulesAmbiguity,
  ValidationReport,
  RulesPipeline,
  PipelineRegistry,
  // PR 4.2 - Validation Aggregation Types
  ValidatorId,
  RuleValidationResult,
  CostResult,
  AggregatedValidationReport,
  // PR 4.3 - Conflict Classification Types
  Conflict,
  ConflictResult,
} from './RulesPipeline';

export { RulesOutcome, ConflictKind, createValidatorId } from './RulesPipeline';

export type {
  AdapterFailure,
  AdapterResult,
} from './IntentRulesAdapter';

export {
  AdapterFailureCode,
  IntentRulesAdapter,
  createIntentRulesAdapter,
} from './IntentRulesAdapter';

// PR 4.2 - Validation Aggregation
export type {
  AggregationFailure,
  AggregationResult,
} from './ValidationAggregator';

export {
  AggregationFailureCode,
  ValidationAggregator,
  createValidationAggregator,
  toAggregatedReport,
} from './ValidationAggregator';

// Legacy exports (deprecated, kept for backwards compatibility)
export type {
  BridgeViolation,
  RulesInvocationRequest,
  RulesInvocationResult,
  IntentToRulesBridge,
} from './types';

export { BridgeViolationCode } from './types';

export { createIntentToRulesBridge } from './IntentToRulesBridge';
