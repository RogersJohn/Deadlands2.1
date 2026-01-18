/**
 * Rules Pipeline Types
 *
 * Defines the interface for rules pipelines that the adapter invokes.
 * The adapter selects and invokes pipelines; it does not implement rules.
 */

import { IntentType, ValidatedIntent } from './ValidatedIntent';

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
 * Ambiguity marker - explicit, not collapsed
 */
export type RulesAmbiguity = {
  readonly reason: string;
  readonly possibleInterpretations: readonly string[];
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
}
