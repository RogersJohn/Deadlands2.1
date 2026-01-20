/**
 * Assumption - Explicit tracking of inferred information
 *
 * Every time the assistant infers data not explicitly stated,
 * it MUST record an assumption. This is non-negotiable.
 */

/**
 * Confidence level for an assumption
 */
export type AssumptionConfidence = 'high' | 'medium' | 'low';

/**
 * Category of assumption for tracking
 */
export type AssumptionCategory =
  | 'weapon'
  | 'skill'
  | 'range'
  | 'lighting'
  | 'cover'
  | 'movement'
  | 'target'
  | 'actor'
  | 'environment'
  | 'intent';

/**
 * An explicit assumption made by the assistant
 */
export interface Assumption {
  /** Human-readable statement of what was assumed */
  readonly statement: string;

  /** How confident is this assumption */
  readonly confidence: AssumptionConfidence;

  /** Category for grouping/filtering */
  readonly category: AssumptionCategory;

  /** What triggered this assumption (the missing or ambiguous data) */
  readonly reason: string;
}

/**
 * Creates a new assumption
 */
export function createAssumption(
  statement: string,
  confidence: AssumptionConfidence,
  category: AssumptionCategory,
  reason: string
): Assumption {
  return {
    statement,
    confidence,
    category,
    reason,
  };
}
