/**
 * Validation Aggregator (PR 4.2)
 *
 * Collects validation results from multiple validators WITHOUT resolution.
 *
 * CRITICAL INVARIANTS:
 * - ALL validators run - no short-circuit on first FAIL or AMBIGUOUS
 * - ALL results are preserved - no suppression of minority opinions
 * - NO resolution of disagreements - validators can disagree
 * - NO "most severe wins" - all outcomes coexist
 * - NO boolean summary - outcomes are enumerated, not collapsed
 * - NO priority ordering - results are unordered
 *
 * This module exists to stress the invariant:
 * "The engine must tolerate disagreement without resolving it."
 */

import type { ValidatedIntent } from './ValidatedIntent';
import type {
  AggregatedValidationReport,
  CostResult,
  InvocationId,
  PipelineRegistry,
  RuleValidationResult,
  RulesPipeline,
  ValidatorId,
} from './RulesPipeline';
import { createValidatorId } from './RulesPipeline';

// ============================================================================
// INVOCATION ID GENERATION
// ============================================================================

/**
 * Deterministic Invocation ID Generation
 *
 * Algorithm: djb2 string hash
 *
 * For aggregation, we include the rulesetId to ensure each validator
 * gets a unique invocation ID even for the same intent.
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash >>> 0;
}

function canonicalizePayload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return 'null';
  }
  if (typeof payload !== 'object') {
    return JSON.stringify(payload);
  }
  const sortedKeys = Object.keys(payload as object).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sorted[key] = (payload as Record<string, unknown>)[key];
  }
  return JSON.stringify(sorted);
}

function generateInvocationId(intent: ValidatedIntent, rulesetId: string): InvocationId {
  const hashInput = `${intent.intentId}:${intent.intentType}:${rulesetId}:${canonicalizePayload(intent.payload)}`;
  const hash = djb2(hashInput);
  return `inv_${hash.toString(16).padStart(8, '0')}` as InvocationId;
}

// ============================================================================
// AGGREGATION RESULT TYPES
// ============================================================================

/**
 * AggregationFailureCode - errors in the aggregation process
 *
 * These are NOT rule violations. They are aggregator-level errors.
 */
export enum AggregationFailureCode {
  /** No validators found for this intent type */
  NO_VALIDATORS = 'NO_VALIDATORS',
}

/**
 * AggregationFailure - explicit, structured failure
 */
export type AggregationFailure = {
  readonly code: AggregationFailureCode;
  readonly intentId: string;
  readonly intentType: string;
  readonly details: string;
};

/**
 * AggregationResult - discriminated union
 *
 * Either:
 * - Success: AggregatedValidationReport with all validator results
 * - Failure: AggregationFailure (no validators found)
 */
export type AggregationResult =
  | { readonly kind: 'aggregated'; readonly report: AggregatedValidationReport }
  | { readonly kind: 'failure'; readonly failure: AggregationFailure };

// ============================================================================
// VALIDATION AGGREGATOR
// ============================================================================

/**
 * ValidationAggregator (PR 4.2)
 *
 * Collects validation results from ALL validators without short-circuit.
 *
 * This aggregator:
 * - Invokes ALL validators that claim authority for the intent type
 * - Collects ALL results (rule outcomes + cost validations)
 * - Does NOT resolve disagreements
 * - Does NOT prioritize or order results
 * - Does NOT suppress any validator's opinion
 */
export class ValidationAggregator {
  private readonly registry: PipelineRegistry;

  constructor(registry: PipelineRegistry) {
    this.registry = registry;
  }

  /**
   * Aggregate validation results from all validators
   *
   * This method:
   * 1. Gets ALL pipelines for the intent type
   * 2. Invokes EACH pipeline (no short-circuit)
   * 3. Collects ALL results
   * 4. Returns aggregated report
   *
   * CRITICAL: This does NOT resolve disagreements.
   * - If validator A says PASS and validator B says FAIL, BOTH results are kept.
   * - The caller must decide how to handle disagreement.
   */
  aggregate(intent: ValidatedIntent): AggregationResult {
    const pipelines = this.registry.getPipelinesForIntent(intent.intentType);

    // Failure: No validators for this intent type
    if (pipelines.length === 0) {
      return {
        kind: 'failure',
        failure: {
          code: AggregationFailureCode.NO_VALIDATORS,
          intentId: intent.intentId,
          intentType: intent.intentType,
          details: `No validators found for intent type: ${intent.intentType}`,
        },
      };
    }

    // Collect results from ALL validators
    const ruleResults: RuleValidationResult[] = [];
    const costResults: CostResult[] = [];

    for (const pipeline of pipelines) {
      const result = this.invokeValidator(intent, pipeline);
      ruleResults.push(result.ruleResult);
      if (result.costResult) {
        costResults.push(result.costResult);
      }
    }

    // Build aggregated report
    const report: AggregatedValidationReport = {
      sourceIntentId: intent.intentId,
      intentType: intent.intentType,
      payload: intent.payload,
      ruleResults,
      costResults,
      validatorCount: pipelines.length,
    };

    return {
      kind: 'aggregated',
      report,
    };
  }

  /**
   * Invoke a single validator and extract results
   *
   * This is an internal helper that:
   * - Generates a deterministic invocation ID
   * - Invokes the pipeline
   * - Extracts rule result and cost result
   */
  private invokeValidator(
    intent: ValidatedIntent,
    pipeline: RulesPipeline
  ): { ruleResult: RuleValidationResult; costResult: CostResult | null } {
    const validatorId = createValidatorId(pipeline.rulesetId);
    const invocationId = generateInvocationId(intent, pipeline.rulesetId);

    // Invoke the pipeline
    const report = pipeline.validate(intent, invocationId);

    // Extract rule result
    const ruleResult: RuleValidationResult = {
      validatorId,
      rulesetId: pipeline.rulesetId,
      invocationId: report.invocationId,
      outcome: report.outcome,
      violations: report.violations,
      ambiguity: report.ambiguity,
    };

    // Extract cost result (if present)
    let costResult: CostResult | null = null;
    if (report.costValidation) {
      costResult = {
        validatorId,
        rulesetId: pipeline.rulesetId,
        costValidation: report.costValidation,
      };
    }

    return { ruleResult, costResult };
  }
}

/**
 * Create a ValidationAggregator
 *
 * Factory function for consistency with other modules.
 */
export function createValidationAggregator(registry: PipelineRegistry): ValidationAggregator {
  return new ValidationAggregator(registry);
}

// ============================================================================
// UTILITY FUNCTIONS FOR WORKING WITH AGGREGATED REPORTS
// ============================================================================

/**
 * Check if an aggregated report contains any disagreement
 *
 * Disagreement means validators produced different outcomes.
 * This is INFORMATIONAL ONLY - it does NOT affect behavior.
 *
 * The engine TOLERATES disagreement.
 */
export function hasDisagreement(report: AggregatedValidationReport): boolean {
  if (report.ruleResults.length <= 1) {
    return false;
  }

  const firstOutcome = report.ruleResults[0]?.outcome;
  return report.ruleResults.some(r => r.outcome !== firstOutcome);
}

/**
 * Get all unique outcomes from an aggregated report
 *
 * This is INFORMATIONAL ONLY - it does NOT resolve disagreement.
 */
export function getUniqueOutcomes(report: AggregatedValidationReport): readonly string[] {
  const outcomes = new Set<string>();
  for (const result of report.ruleResults) {
    outcomes.add(result.outcome);
  }
  return [...outcomes];
}

/**
 * Convert a single ValidationReport to an AggregatedValidationReport
 *
 * Utility for backwards compatibility when only one validator exists.
 */
export function toAggregatedReport(
  intent: ValidatedIntent,
  ruleResult: RuleValidationResult,
  costResult: CostResult | null
): AggregatedValidationReport {
  return {
    sourceIntentId: intent.intentId,
    intentType: intent.intentType,
    payload: intent.payload,
    ruleResults: [ruleResult],
    costResults: costResult ? [costResult] : [],
    validatorCount: 1,
  };
}
