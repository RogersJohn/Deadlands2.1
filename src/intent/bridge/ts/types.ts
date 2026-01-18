/**
 * Bridge Types (Legacy + New)
 *
 * This file re-exports types from the new modules for backwards compatibility
 * with existing code that imports from './types'.
 *
 * New code should import directly from:
 * - ValidatedIntent.ts for intent types
 * - RulesPipeline.ts for pipeline types
 * - IntentRulesAdapter.ts for adapter types
 *
 * DEPRECATED: The plain types below are kept for backwards compatibility
 * with IntentToRulesBridge.ts. New code should use branded types.
 */

// Re-export branded types (preferred)
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
  RulesOutcome,
  RuleViolation,
  RulesAmbiguity,
  ValidationReport,
  RulesPipeline,
  PipelineRegistry,
} from './RulesPipeline';

export { RulesOutcome as RulesOutcomeEnum } from './RulesPipeline';

export type {
  AdapterFailure,
  AdapterResult,
} from './IntentRulesAdapter';

export {
  AdapterFailureCode,
  IntentRulesAdapter,
  createIntentRulesAdapter,
} from './IntentRulesAdapter';

// ============================================================================
// LEGACY TYPES (Deprecated - kept for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use RulesInvocationRequest from RulesPipeline.ts or
 * ValidationReport from the new adapter.
 */
export type RulesInvocationRequest = {
  invocationId: string;
  sourceIntentId: string;
  intentType: string;
  payload: unknown;
  rulesetId: string;
};

/**
 * @deprecated Use AdapterFailureCode from IntentRulesAdapter.ts
 */
export enum BridgeViolationCode {
  NO_RULESET_CLAIMS_AUTHORITY,
  MULTIPLE_RULESETS_CLAIM_AUTHORITY,
  INTENT_UNMAPPABLE_TO_RULES,
}

/**
 * @deprecated Use AdapterFailure from IntentRulesAdapter.ts
 */
export type BridgeViolation = {
  code: BridgeViolationCode;
  intentId: string;
  details?: string;
};

/**
 * @deprecated Use AdapterResult from IntentRulesAdapter.ts
 */
export type RulesInvocationResult =
  | { kind: 'invocation'; request: RulesInvocationRequest }
  | { kind: 'violation'; violation: BridgeViolation };

/**
 * @deprecated Use IntentRulesAdapter from IntentRulesAdapter.ts
 * which invokes pipelines and produces ValidationReport.
 */
export interface IntentToRulesBridge {
  toRulesInvocation(
    intent: { intentId: string; intentType: string; payload: unknown; validationSummary: unknown },
    authorityClaims: { rulesetId: string; intentType: string }[]
  ): RulesInvocationResult;
}
