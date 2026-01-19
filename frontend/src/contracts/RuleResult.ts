/**
 * RuleResult DTO Contracts (FE-PR 0.1)
 *
 * CRITICAL: These types mirror backend DTOs EXACTLY.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 */

import type {
  RulesOutcome,
  RuleViolation,
  RulesAmbiguity,
  Conflict,
  CostValidationResult,
} from './ValidationReport';

/**
 * RuleValidationResult - result from a single validator
 */
export type RuleValidationResult = {
  readonly validatorId: string;
  readonly rulesetId: string;
  readonly invocationId: string;
  readonly outcome: RulesOutcome;
  readonly violations: readonly RuleViolation[];
  readonly ambiguity: RulesAmbiguity | null;
  readonly conflicts: readonly Conflict[];
};

/**
 * CostResult - cost validation from a single validator
 */
export type CostResult = {
  readonly validatorId: string;
  readonly rulesetId: string;
  readonly costValidation: CostValidationResult;
};

/**
 * ConflictResult - conflict from a single validator
 */
export type ConflictResult = {
  readonly validatorId: string;
  readonly rulesetId: string;
  readonly conflict: Conflict;
};

/**
 * AggregatedValidationReport - results from all validators
 */
export type AggregatedValidationReport = {
  readonly sourceIntentId: string;
  readonly intentType: string;
  readonly payload: unknown;
  readonly ruleResults: readonly RuleValidationResult[];
  readonly costResults: readonly CostResult[];
  readonly allConflicts: readonly ConflictResult[];
  readonly validatorCount: number;
};
