/**
 * Resolution / Effects Types (PR 2.1)
 *
 * Core principle: Resolution describes consequences; it does not execute them.
 *
 * This module translates authoritative decisions into declarative effects.
 * Effects describe what WOULD happen, not what DOES happen.
 *
 * Invariants:
 * - No state mutation
 * - No dice rolling
 * - No Savage Worlds math
 * - No execution logic
 * - Effects are immutable data
 */

import type {
  EffectiveValidation,
  GmOverride,
  OverrideWarning,
  RulesOutcome,
  ValidationReport,
} from '../../overrides/ts/types';

// Re-export for convenience
export { RulesOutcome } from '../../overrides/ts/types';

// ============================================================================
// RESOLUTION INPUT TYPES
// ============================================================================

/**
 * AuthoritativeDecision - the single input to resolution
 *
 * This represents the final, settled authority state:
 * - The original rules output (ValidationReport)
 * - Any GM overrides that modify the outcome
 * - The effective outcome after all authority decisions
 *
 * Resolution ONLY operates on AuthoritativeDecision.
 * It does not accept raw intents, partial results, or unsettled authority.
 */
export type AuthoritativeDecision = {
  /** The original rules engine output - always preserved */
  readonly originalReport: ValidationReport;

  /** The effective outcome after all overrides (may equal original) */
  readonly effectiveOutcome: RulesOutcome;

  /** Whether any GM overrides were applied */
  readonly hasOverrides: boolean;

  /** The latest override warning, if any */
  readonly latestWarning: OverrideWarning | null;

  /** The full override chain for audit purposes */
  readonly overrideChain: readonly GmOverride[];
};

/**
 * Create an AuthoritativeDecision from EffectiveValidation + override chain
 *
 * This is the bridge between PR 2.0 and PR 2.1.
 */
export function createAuthoritativeDecision(
  effective: EffectiveValidation,
  overrideChain: readonly GmOverride[]
): AuthoritativeDecision {
  return {
    originalReport: effective.originalReport,
    effectiveOutcome: effective.effectiveOutcome,
    hasOverrides: effective.hasOverrides,
    latestWarning: effective.latestWarning,
    overrideChain,
  };
}

// ============================================================================
// EFFECT TYPES
// ============================================================================

/**
 * EffectType - closed enum of effect categories
 *
 * Each effect type describes a category of consequence.
 * Effects are declarative - they describe WHAT, not HOW.
 */
export enum EffectType {
  /** Apply a condition to a target (e.g., Shaken, Wounded) */
  APPLY_CONDITION = 'APPLY_CONDITION',

  /** Consume a resource from a target (e.g., Bennies, Ammo) */
  CONSUME_RESOURCE = 'CONSUME_RESOURCE',

  /** Deal damage to a target (amount is opaque, not calculated here) */
  DEAL_DAMAGE = 'DEAL_DAMAGE',

  /** Change position of a target (e.g., move, push, teleport) */
  CHANGE_POSITION = 'CHANGE_POSITION',

  /** Trigger a narrative event (e.g., story beat, description) */
  TRIGGER_NARRATIVE = 'TRIGGER_NARRATIVE',

  /** Grant a resource to a target (e.g., Bennies, temporary bonus) */
  GRANT_RESOURCE = 'GRANT_RESOURCE',

  /** Remove a condition from a target */
  REMOVE_CONDITION = 'REMOVE_CONDITION',
}

/**
 * EffectTarget - who or what is affected
 *
 * Opaque identifier - resolution does not interpret this.
 */
export type EffectTarget = {
  readonly targetId: string;
  readonly targetType: string;
};

/**
 * EffectAuthority - why this effect exists
 *
 * Every effect must trace back to an authoritative decision.
 */
export type EffectAuthority = {
  /** The invocation that produced this effect */
  readonly invocationId: string;

  /** Whether this effect comes from rules or override */
  readonly source: 'RULES' | 'OVERRIDE';

  /** The effective outcome that permitted this effect */
  readonly outcome: RulesOutcome;
};

/**
 * Base Effect structure
 *
 * All effects share this structure.
 * The `parameters` field is type-specific and opaque.
 */
export type Effect = {
  /** Unique identifier for this effect */
  readonly effectId: string;

  /** What type of effect this is */
  readonly effectType: EffectType;

  /** Who or what is affected */
  readonly target: EffectTarget;

  /** Why this effect exists */
  readonly authority: EffectAuthority;

  /**
   * Type-specific parameters
   *
   * These are OPAQUE values - resolution does not interpret them.
   * Values come from elsewhere (intent payload, rules output).
   * Resolution merely packages them.
   */
  readonly parameters: Readonly<Record<string, unknown>>;

  /** Human-readable description of what would happen */
  readonly description: string;
};

// ============================================================================
// RESOLUTION RESULT TYPES
// ============================================================================

/**
 * ResolutionOutcome - why resolution produced these effects (or not)
 */
export enum ResolutionOutcome {
  /** Effects produced - authority outcome was PASS */
  EFFECTS_PRODUCED = 'EFFECTS_PRODUCED',

  /** No effects - authority outcome was FAIL */
  NO_EFFECTS_FAIL = 'NO_EFFECTS_FAIL',

  /** No effects - authority outcome was AMBIGUOUS and not overridden */
  NO_EFFECTS_AMBIGUOUS = 'NO_EFFECTS_AMBIGUOUS',

  /** No effects - no effect producer registered for this intent type */
  NO_EFFECTS_NO_PRODUCER = 'NO_EFFECTS_NO_PRODUCER',
}

/**
 * ResolutionResult - the output of resolution
 *
 * Contains:
 * - The authoritative decision (preserved)
 * - Zero or more effects
 * - Clear explanation of why effects exist or not
 */
export type ResolutionResult = {
  /** The authoritative decision that was resolved */
  readonly decision: AuthoritativeDecision;

  /** Why resolution produced these effects (or not) */
  readonly outcome: ResolutionOutcome;

  /** The effects that would be applied (empty if no effects) */
  readonly effects: readonly Effect[];

  /** Human-readable explanation */
  readonly explanation: string;
};

// ============================================================================
// RESOLUTION VIOLATION TYPES
// ============================================================================

/**
 * ResolutionViolationCode - errors in resolution process
 *
 * These are NOT rule violations or override violations.
 * These are errors in the resolution layer itself.
 */
export enum ResolutionViolationCode {
  /** Attempted to resolve with FAIL outcome without override */
  CANNOT_RESOLVE_FAIL = 'CANNOT_RESOLVE_FAIL',

  /** Attempted to resolve with AMBIGUOUS outcome without override */
  CANNOT_RESOLVE_AMBIGUOUS = 'CANNOT_RESOLVE_AMBIGUOUS',

  /** Effect producer returned invalid effect */
  INVALID_EFFECT = 'INVALID_EFFECT',
}

/**
 * ResolutionViolation - error in resolution process
 */
export type ResolutionViolation = {
  readonly code: ResolutionViolationCode;
  readonly details: string;
};

// ============================================================================
// DECLARATIVE COST TYPES (PR 4.1)
// ============================================================================

/**
 * ActionCostEffect - Declarative description of a cost (PR 4.1)
 *
 * CRITICAL INVARIANTS:
 * - This is DESCRIPTIVE ONLY - it does NOT enforce anything
 * - No arithmetic
 * - No state mutation
 * - No tracking of actions, turns, AP, or time
 * - No implicit inference of costs
 * - No auto-satisfaction
 *
 * Rules may emit zero or more ActionCostEffects.
 * These describe REQUIREMENTS, not ENFORCEMENT.
 *
 * The persistence layer (NOT rules) decides what to do with this data.
 */
export type ActionCostEffect = {
  readonly kind: 'ActionCostEffect';

  /** Human-readable, rules-facing description of the cost */
  readonly description: string;

  /**
   * Optional semantic tags for categorization
   *
   * Tags are DESCRIPTIVE ONLY. They must NOT be consumed by logic.
   * Examples: ['action', 'reload'], ['free_action'], ['movement']
   */
  readonly tags?: readonly string[];
};

/**
 * CostValidationOutcome - The three states of cost validation (PR 4.1)
 *
 * CRITICAL: Rules do NOT inspect game state to determine satisfaction.
 * Rules do NOT infer satisfaction.
 * If satisfaction cannot be EXPLICITLY proven, result MUST be AMBIGUOUS.
 */
export enum CostValidationOutcome {
  /** Cost is explicitly satisfied (proven, not inferred) */
  SATISFIED = 'SATISFIED',

  /** Cost is explicitly NOT satisfied (proven, not inferred) */
  UNSATISFIED = 'UNSATISFIED',

  /** Cost satisfaction cannot be determined - requires GM decision */
  AMBIGUOUS = 'AMBIGUOUS',
}

/**
 * CostValidationResult - Result of declarative cost validation (PR 4.1)
 *
 * INVARIANTS:
 * - If satisfaction cannot be explicitly proven → AMBIGUOUS
 * - Rules NEVER auto-fail on missing data
 * - Rules NEVER infer satisfaction
 * - AMBIGUOUS allows GM override (opt-in, logged, structured)
 */
export type CostValidationResult = {
  /** The declared cost being validated */
  readonly cost: ActionCostEffect;

  /** The validation outcome */
  readonly outcome: CostValidationOutcome;

  /**
   * Reason for this outcome
   *
   * For SATISFIED: explicit proof of satisfaction
   * For UNSATISFIED: explicit proof of non-satisfaction
   * For AMBIGUOUS: explanation of why satisfaction cannot be determined
   */
  readonly reason: string;
};

/**
 * CostOverrideInterpretation - Structured interpretation for cost ambiguity (PR 4.1)
 *
 * When cost validation produces AMBIGUOUS, the GM must select one of these
 * interpretations to resolve the ambiguity.
 */
export type CostOverrideInterpretation = {
  /** Machine-readable code for GM selection */
  readonly code: string;

  /** The resulting cost outcome if this interpretation is chosen */
  readonly resultingOutcome: CostValidationOutcome.SATISFIED | CostValidationOutcome.UNSATISFIED;

  /** Human-readable description of this interpretation */
  readonly description: string;
};

/**
 * CostOverrideDecision - GM decision on cost ambiguity (PR 4.1)
 *
 * INVARIANTS:
 * - Override is STRUCTURED (not freeform)
 * - Override is LOGGED (reason + warning required)
 * - Override is OPT-IN (GM must explicitly select interpretation)
 * - Override does NOT mutate prior validation results
 */
export type CostOverrideDecision = {
  /** The original cost validation result - NEVER mutated */
  readonly originalResult: CostValidationResult;

  /** The interpretation code selected by the GM */
  readonly selectedInterpretationCode: string;

  /** The effective outcome after override */
  readonly effectiveOutcome: CostValidationOutcome.SATISFIED | CostValidationOutcome.UNSATISFIED;

  /** Mandatory reason for the override */
  readonly reason: string;

  /** GM identity for audit trail */
  readonly issuedBy: string;

  /** Timestamp for audit trail */
  readonly issuedAt: number;
};
