/**
 * Rules Pipeline Types
 *
 * Defines the interface for rules pipelines that the adapter invokes.
 * The adapter selects and invokes pipelines; it does not implement rules.
 */

import type { IntentType, ValidatedIntent } from './ValidatedIntent';
import type { CostValidationResult } from '../../../resolution/ts/types';

// Re-export IntentType for convenience
export type { IntentType } from './ValidatedIntent';

// Re-export CostValidationResult for convenience (used by CostResult)
export type { CostValidationResult } from '../../../resolution/ts/types';

/**
 * Opaque identifier for rulesets - branded to prevent interchange
 */
declare const RULESET_ID_BRAND: unique symbol;
export type RulesetId = string & { readonly [RULESET_ID_BRAND]: never };

/**
 * Opaque identifier for invocations - branded to prevent interchange
 */
declare const INVOCATION_ID_BRAND: unique symbol;
export type InvocationId = string & { readonly [INVOCATION_ID_BRAND]: never };

/**
 * Rule authority claim - declares which ruleset handles which intent type
 *
 * The bridge receives these claims externally; it does not discover rules.
 */
export type RuleAuthorityClaim = {
  readonly rulesetId: RulesetId;
  readonly intentType: IntentType;
};

/**
 * Rules validation outcome - exhaustive enum
 *
 * PASS: All rules satisfied
 * FAIL: One or more rules violated
 * AMBIGUOUS: Rules cannot determine outcome; requires GM decision
 */
export enum RulesOutcome {
  PASS = 'PASS',
  FAIL = 'FAIL',
  AMBIGUOUS = 'AMBIGUOUS',
}

/**
 * Individual rule violation - data, not exception
 */
export type RuleViolation = {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
};

/**
 * Structured ambiguity interpretation
 *
 * Each interpretation declares:
 * - A machine-readable code for GM selection
 * - The resulting outcome if this interpretation is chosen
 * - A human-readable description
 *
 * This ensures GM override resolution is deterministic:
 * GM selects interpretation code → system produces declared outcome
 */
export type AmbiguityInterpretation = {
  /** Machine-readable code for GM selection (e.g., 'AMMO_AVAILABLE', 'NO_AMMO') */
  readonly code: string;
  /** The outcome that results if this interpretation is chosen */
  readonly resultingOutcome: RulesOutcome.PASS | RulesOutcome.FAIL;
  /** Human-readable description of this interpretation */
  readonly description: string;
};

/**
 * Ambiguity marker - explicit, not collapsed
 *
 * When rules cannot determine outcome, ambiguity provides:
 * - A reason explaining why the rules cannot decide
 * - Structured interpretations with explicit outcome mappings
 *
 * GM override must select one of the declared interpretations.
 * The system then deterministically produces the declared outcome.
 */
export type RulesAmbiguity = {
  readonly reason: string;
  readonly possibleInterpretations: readonly AmbiguityInterpretation[];
};

/**
 * ValidationReport - the output of rules pipeline invocation
 *
 * This is what the adapter produces after invoking the pipeline.
 * It contains the full validation result, not just pass/fail.
 */
export type ValidationReport = {
  readonly invocationId: InvocationId;
  readonly sourceIntentId: string;
  readonly intentType: IntentType;
  readonly rulesetId: RulesetId;
  readonly outcome: RulesOutcome;
  readonly violations: readonly RuleViolation[];
  readonly ambiguity: RulesAmbiguity | null;
  readonly payload: unknown;

  /**
   * Declarative cost validation (PR 4.1)
   *
   * If the rule declares an action cost, this field contains:
   * - The cost description (what is required)
   * - The validation outcome (SATISFIED, UNSATISFIED, or AMBIGUOUS)
   * - A reason explaining the outcome
   *
   * IMPORTANT: This is DECLARATIVE ONLY. It describes requirements,
   * it does NOT enforce them. The persistence layer decides what to do.
   */
  readonly costValidation?: CostValidationResult;
};

/**
 * Rules pipeline interface
 *
 * A pipeline is a stateless, deterministic function that:
 * - Accepts a ValidatedIntent and payload
 * - Produces a ValidationReport
 * - Never mutates state
 * - Never throws exceptions for rule failures
 */
export interface RulesPipeline {
  /**
   * The ruleset this pipeline implements
   */
  readonly rulesetId: RulesetId;

  /**
   * The intent types this pipeline handles
   */
  readonly handledIntentTypes: readonly IntentType[];

  /**
   * Validate an intent against the rules
   *
   * Guarantees:
   * - Deterministic (same input → same output)
   * - Side-effect free
   * - Never throws for rule violations
   * - Returns AMBIGUOUS explicitly when rules cannot decide
   */
  validate(
    intent: ValidatedIntent,
    invocationId: InvocationId
  ): ValidationReport;
}

/**
 * Pipeline registry - provides pipelines to the adapter
 *
 * The adapter does not discover pipelines; it receives them from the registry.
 */
export interface PipelineRegistry {
  /**
   * Get all registered authority claims
   */
  getAuthorityClaims(): readonly RuleAuthorityClaim[];

  /**
   * Get the pipeline for a specific ruleset
   * Returns null if no pipeline is registered for this ruleset
   */
  getPipeline(rulesetId: RulesetId): RulesPipeline | null;

  /**
   * Get all pipelines that handle a specific intent type (PR 4.2)
   *
   * Returns ALL pipelines that claim authority for this intent type.
   * Does NOT resolve conflicts. Does NOT short-circuit.
   * The aggregator will invoke ALL of them.
   */
  getPipelinesForIntent(intentType: IntentType): readonly RulesPipeline[];
}

// ============================================================================
// VALIDATION AGGREGATION TYPES (PR 4.2)
// ============================================================================

/**
 * Opaque identifier for validators - branded to prevent interchange
 */
declare const VALIDATOR_ID_BRAND: unique symbol;
export type ValidatorId = string & { readonly [VALIDATOR_ID_BRAND]: never };

/**
 * Individual rule validation result (PR 4.2)
 *
 * This is the result from a SINGLE validator evaluating a SINGLE intent.
 * Multiple of these are collected into an AggregatedValidationReport.
 *
 * CRITICAL: This is the SAME as ValidationReport but with explicit validatorId.
 * We keep the same structure to preserve compatibility.
 */
export type RuleValidationResult = {
  /** Which validator produced this result */
  readonly validatorId: ValidatorId;

  /** The ruleset that produced this result */
  readonly rulesetId: RulesetId;

  /** The invocation ID for this specific validation */
  readonly invocationId: InvocationId;

  /** The outcome from this validator */
  readonly outcome: RulesOutcome;

  /** Violations from this validator */
  readonly violations: readonly RuleViolation[];

  /** Ambiguity from this validator (if outcome is AMBIGUOUS) */
  readonly ambiguity: RulesAmbiguity | null;
};

/**
 * Individual cost validation result (PR 4.2)
 *
 * This is the cost validation from a SINGLE validator.
 * Multiple of these are collected into an AggregatedValidationReport.
 */
export type CostResult = {
  /** Which validator produced this cost validation */
  readonly validatorId: ValidatorId;

  /** The ruleset that produced this cost validation */
  readonly rulesetId: RulesetId;

  /** The cost validation result (from PR 4.1) */
  readonly costValidation: CostValidationResult;
};

/**
 * AggregatedValidationReport (PR 4.2)
 *
 * Contains the results from ALL validators that evaluated an intent.
 *
 * CRITICAL INVARIANTS:
 * - ALL validators run - no short-circuit
 * - ALL results are preserved - no suppression
 * - NO resolution of disagreements - validators can disagree
 * - NO "most severe wins" - all outcomes coexist
 * - NO boolean summary - outcomes are enumerated, not collapsed
 * - NO ordering guarantees - results are unordered
 *
 * The engine TOLERATES disagreement without resolving it.
 */
export type AggregatedValidationReport = {
  /** The source intent being validated */
  readonly sourceIntentId: string;

  /** The intent type being validated */
  readonly intentType: IntentType;

  /** The original intent payload (preserved, not transformed) */
  readonly payload: unknown;

  /**
   * Rule validation results from ALL validators
   *
   * May contain:
   * - Multiple PASS results
   * - Multiple FAIL results
   * - Multiple AMBIGUOUS results
   * - Any combination thereof
   *
   * The aggregator does NOT resolve these.
   */
  readonly ruleResults: readonly RuleValidationResult[];

  /**
   * Cost validation results from ALL validators
   *
   * May contain:
   * - Multiple SATISFIED results
   * - Multiple UNSATISFIED results
   * - Multiple AMBIGUOUS results
   * - Any combination thereof
   *
   * The aggregator does NOT resolve these.
   */
  readonly costResults: readonly CostResult[];

  /**
   * Count of validators that ran
   *
   * This is informational only - does not affect outcome.
   */
  readonly validatorCount: number;
};

/**
 * Create a ValidatorId from ruleset ID
 *
 * Convention: validatorId = "validator_" + rulesetId
 * This ensures each ruleset has a unique validator identity.
 */
export function createValidatorId(rulesetId: RulesetId): ValidatorId {
  return `validator_${rulesetId}` as ValidatorId;
}
