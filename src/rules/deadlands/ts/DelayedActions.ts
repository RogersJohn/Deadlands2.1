/**
 * Delayed Actions Rule (PR 8.1)
 *
 * CRITICAL INVARIANT: The system does NOT model future execution.
 *
 * This rule validates intents where an action is declared as delayed or held.
 * It produces AMBIGUOUS because delay introduces unresolved timing and the
 * system does not model future execution.
 *
 * CRITICAL: NO SCHEDULING, NO FUTURE STATE, NO RESERVATION.
 * - The system does NOT model "when" the action executes
 * - The system does NOT reserve resources for future use
 * - The system does NOT schedule follow-up behavior
 * - The system does NOT model time
 *
 * WHAT THIS RULE DOES:
 * - Detects when an action is declared as delayed
 * - Emits AMBIGUOUS (delay introduces unresolved timing)
 * - Emits ActionCostEffect (no reservation, no future enforcement)
 * - Emits SoftBlock conflict (delayed execution timing is undefined)
 * - Emits effect indicating action was declared as delayed
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Schedule future execution
 * - Reserve action capacity
 * - Model "held" state
 * - Track triggers
 * - Store temporal state
 * - Perform arithmetic
 *
 * This rule operates independently. It does not coordinate with other rules.
 */

import type { ValidatedIntent } from '../../../intent/bridge/ts/ValidatedIntent';
import type { IntentType } from '../../../intent/bridge/ts/ValidatedIntent';
import type {
  InvocationId,
  RulesPipeline,
  RulesetId,
  RuleViolation,
  ValidationReport,
  Conflict,
  RulesAmbiguity,
} from '../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome, ConflictKind } from '../../../intent/bridge/ts/RulesPipeline';
import type { CostValidationResult, ActionCostEffect, Effect } from '../../../resolution/ts/types';
import { CostValidationOutcome, EffectType } from '../../../resolution/ts/types';
import type { RuleApplicability } from '../../applicability/ts/types';
import { createRuleApplicability } from '../../applicability/ts/types';

// ============================================================================
// INTENT PAYLOAD TYPES
// ============================================================================

/**
 * Payload for delayed action intent
 *
 * CRITICAL: The payload declares that an action is delayed.
 * It does NOT schedule execution. It does NOT reserve resources.
 */
export type DelayedActionsPayload = {
  /** ID of the character declaring the delayed action */
  readonly characterId: string;

  /**
   * The declared action being delayed
   */
  readonly declaredAction: string;

  /**
   * Descriptive reason for delay (optional)
   * Examples: "waiting for opening", "held until signal", "reserved"
   *
   * CRITICAL: This is DESCRIPTIVE, not a trigger condition.
   * The system does NOT monitor for triggers.
   */
  readonly delayReason?: string;

  /**
   * Action availability context
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for DelayedActionsPayload
 */
export function isDelayedActionsPayload(
  payload: unknown
): payload is DelayedActionsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAction === 'string'
  );
}

// ============================================================================
// COST DECLARATIONS (DESCRIPTIVE, NOT ENFORCED)
// ============================================================================

/**
 * Create cost validation for delayed action
 *
 * CRITICAL: Cost does NOT imply reservation.
 * Cost does NOT imply future enforcement.
 * Cost is descriptive only.
 */
function createCostValidation(
  declaredAction: string,
  delayReason: string | undefined,
  actionAvailability?: 'available' | 'unavailable' | 'unknown'
): CostValidationResult {
  const reasonSuffix = delayReason ? ` (${delayReason})` : '';
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Delayed action declared: ${declaredAction}${reasonSuffix}`,
    tags: ['action', 'delayed', 'temporal-undefined'],
  };

  if (actionAvailability === 'unavailable') {
    return {
      cost,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action capacity explicitly unavailable',
    };
  }

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Delay introduces unresolved timing - system does not model future execution',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for delayed action
 *
 * CRITICAL: This conflict describes undefined timing.
 * It does NOT schedule execution. It does NOT define triggers.
 */
function createDelayedActionConflict(
  action: string,
  delayReason: string | undefined
): Conflict {
  const reasonSuffix = delayReason ? ` (reason: ${delayReason})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_TEMPORAL_002',
    message: `Delayed execution timing is undefined: action (${action}) declared as delayed${reasonSuffix}. ` +
      'The system does not model future execution. ' +
      'No scheduling, no reservation, no trigger monitoring.',
    tags: ['temporal', 'delayed', 'undefined-timing', 'no-scheduling', 'no-reservation'],
  };
}

// ============================================================================
// EFFECT EMISSION (DECLARATIVE ONLY)
// ============================================================================

/**
 * Create effect for delayed action declaration
 *
 * CRITICAL INVARIANT: Effect indicates action was declared as delayed.
 * No "future execution" logic. No follow-up behavior.
 * This is a DECLARATION, not a schedule.
 */
export function createDelayedActionsEffects(
  characterId: string,
  declaredAction: string,
  delayReason: string | undefined,
  invocationId: string
): Effect[] {
  return [
    {
      effectId: `${invocationId}_delayed_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: {
        targetId: characterId,
        targetType: 'character',
      },
      authority: {
        invocationId,
        source: 'RULES' as const,
        outcome: RulesOutcome.AMBIGUOUS,
      },
      parameters: {
        actionLabel: declaredAction,
        actionType: 'delayed',
        narrativeType: 'delayed_action_declaration',
        delayReason: delayReason || 'unspecified',
        temporalStatus: 'undefined',
      },
      description: `Character declares delayed action: ${declaredAction} (timing undefined)`,
    },
  ];
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate delayed action intent
 *
 * CRITICAL: This function is DETERMINISTIC and SIDE-EFFECT FREE.
 * It does NOT schedule future execution.
 * It does NOT reserve resources.
 * It does NOT model triggers.
 */
function validateDelayedActions(
  payload: DelayedActionsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAction, delayReason, actionAvailability } = payload;

  // CRITICAL: Always AMBIGUOUS when action is declared as delayed
  // Delay introduces unresolved timing - system does not model future execution
  const ambiguity: RulesAmbiguity = {
    reason: 'Delay introduces unresolved timing. ' +
      'An action is declared as delayed but the system does not model future execution. ' +
      'No scheduling, no reservation, no trigger monitoring.',
    possibleInterpretations: [
      {
        code: 'DELAY_HONORED',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Delay is recognized and action deferred (GM decision)',
      },
      {
        code: 'DELAY_IGNORED',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Delay is ignored and action proceeds immediately (GM decision)',
      },
      {
        code: 'DELAY_DENIED',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Delay attempt is denied entirely (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createDelayedActionConflict(declaredAction, delayReason),
  ];

  const costValidation = createCostValidation(
    declaredAction,
    delayReason,
    actionAvailability
  );

  return {
    outcome: RulesOutcome.AMBIGUOUS,
    violations: [],
    ambiguity,
    conflicts,
    costValidation,
  };
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * Applicability for Delayed Actions rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const DELAYED_ACTIONS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['temporal', 'delayed', 'held']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const DELAYED_ACTIONS_INTENT_TYPE = 'DELAYED_ACTIONS' as IntentType;

/**
 * Create the Delayed Actions rules pipeline
 *
 * CRITICAL: This pipeline describes delayed declaration, it does NOT schedule execution.
 * No scheduling. No reservation. No future state.
 */
export function createDelayedActionsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [DELAYED_ACTIONS_INTENT_TYPE],
    applicability: DELAYED_ACTIONS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isDelayedActionsPayload(payload)) {
        return {
          invocationId,
          sourceIntentId: intent.intentId,
          intentType: intent.intentType,
          rulesetId: DEADLANDS_CORE_RULESET_ID,
          outcome: RulesOutcome.PASS,
          violations: [],
          ambiguity: null,
          payload: intent.payload,
          conflicts: [],
        };
      }

      const result = validateDelayedActions(payload, invocationId);

      return {
        invocationId,
        sourceIntentId: intent.intentId,
        intentType: intent.intentType,
        rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: result.outcome,
        violations: result.violations,
        ambiguity: result.ambiguity,
        payload: intent.payload,
        costValidation: result.costValidation,
        conflicts: result.conflicts,
      };
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RulesOutcome, ConflictKind };
