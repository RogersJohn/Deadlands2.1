/**
 * Contested Action Timing Rule (PR 8.1, PATCH)
 *
 * CRITICAL INVARIANT: The system does NOT resolve ordering.
 *
 * This rule validates intents where multiple actions assert simultaneous
 * temporal claims. It produces AMBIGUOUS because the system does not
 * decide which action proceeds or in what order.
 *
 * CRITICAL: NO ORDERING, NO PRIORITY, NO SEQUENCING, NO DIRECTIONALITY.
 * - The system does NOT decide "what happens first"
 * - The system does NOT resolve temporal conflicts
 * - The system does NOT suppress effects based on timing
 * - The system does NOT model time
 * - Neither action is "primary" or "secondary"
 * - Neither action "acts on" the other
 *
 * WHAT THIS RULE DOES:
 * - Detects when multiple actions assert temporal precedence
 * - Emits AMBIGUOUS (simultaneous action claims, unresolved)
 * - Emits ActionCostEffect for both actions symmetrically
 * - Emits SoftBlock conflict (contested timing, no precedence applied)
 * - Emits effects for BOTH actions (no suppression)
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Decide ordering
 * - Apply priority
 * - Resolve timing
 * - Suppress effects
 * - Cancel actions
 * - Designate primary/secondary actions
 * - Model one action "acting on" another
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
 * Payload for contested action timing intent
 *
 * CRITICAL: The payload declares TWO actions with contested timing.
 * Neither action is primary. Neither action is secondary.
 * The system does NOT decide precedence.
 */
export type ContestedActionTimingPayload = {
  /** ID of the character declaring contested actions */
  readonly characterId: string;

  /**
   * First declared action
   *
   * CRITICAL: "First" refers to declaration order only, NOT temporal precedence.
   * The system treats both actions symmetrically.
   */
  readonly actionA: string;

  /**
   * Second declared action
   *
   * CRITICAL: "Second" refers to declaration order only, NOT temporal precedence.
   * The system treats both actions symmetrically.
   */
  readonly actionB: string;

  /**
   * Action availability context
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for ContestedActionTimingPayload
 */
export function isContestedActionTimingPayload(
  payload: unknown
): payload is ContestedActionTimingPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.actionA === 'string' &&
    typeof p.actionB === 'string'
  );
}

// ============================================================================
// BACKWARD COMPATIBILITY - ORIGINAL PAYLOAD TYPE
// ============================================================================

/**
 * Original payload type for backward compatibility
 * @deprecated Use ContestedActionTimingPayload instead
 */
export type InterruptingActionsPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly declaredInterrupt: string;
  readonly interruptTarget?: string;
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for original payload (backward compatibility)
 * @deprecated Use isContestedActionTimingPayload instead
 */
export function isInterruptingActionsPayload(
  payload: unknown
): payload is InterruptingActionsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAction === 'string' &&
    typeof p.declaredInterrupt === 'string'
  );
}

/**
 * Convert legacy payload to symmetric payload
 */
function normalizePayload(
  payload: ContestedActionTimingPayload | InterruptingActionsPayload
): ContestedActionTimingPayload {
  if ('actionA' in payload && 'actionB' in payload) {
    return payload;
  }
  // Legacy format - treat both actions symmetrically
  const legacy = payload as InterruptingActionsPayload;
  return {
    characterId: legacy.characterId,
    actionA: legacy.declaredAction,
    actionB: legacy.declaredInterrupt,
    actionAvailability: legacy.actionAvailability,
  };
}

// ============================================================================
// COST DECLARATIONS (DESCRIPTIVE, NOT ENFORCED)
// ============================================================================

/**
 * Create cost validation for contested actions
 *
 * CRITICAL: Both actions emit costs symmetrically.
 * No cost implies ordering. No cost implies precedence.
 * Neither action is designated as primary.
 */
function createCostValidation(
  actionA: string,
  actionB: string,
  actionAvailability?: 'available' | 'unavailable' | 'unknown'
): CostValidationResult {
  const combinedCost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Contested actions: [${actionA}] and [${actionB}]`,
    tags: ['action', 'contested-timing', 'symmetric'],
  };

  if (actionAvailability === 'unavailable') {
    return {
      cost: combinedCost,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action capacity explicitly unavailable',
    };
  }

  return {
    cost: combinedCost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Multiple actions assert temporal precedence - system does not resolve ordering',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for contested action timing
 *
 * CRITICAL: This conflict describes symmetric temporal ambiguity.
 * Neither action is primary. Neither action "acts on" the other.
 * It does NOT resolve precedence. It does NOT suppress actions.
 */
function createContestedTimingConflict(
  actionA: string,
  actionB: string
): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_TEMPORAL_001',
    message: `Contested action timing: [${actionA}] and [${actionB}] both declared. ` +
      'Multiple actions assert temporal precedence. ' +
      'Neither action is primary. No precedence is applied. ' +
      'The system does not resolve ordering.',
    tags: ['temporal', 'contested', 'symmetric', 'no-ordering', 'no-precedence'],
  };
}

// ============================================================================
// EFFECT EMISSION (BOTH ACTIONS EMIT EFFECTS SYMMETRICALLY)
// ============================================================================

/**
 * Create effects for both contested actions
 *
 * CRITICAL INVARIANT: Both actions emit effects symmetrically.
 * No effect suppression. Neither action is primary.
 * The system does NOT decide which action "wins."
 */
export function createContestedActionTimingEffects(
  characterId: string,
  actionA: string,
  actionB: string,
  invocationId: string
): Effect[] {
  // CRITICAL: Effects are symmetric - neither is primary
  return [
    {
      effectId: `${invocationId}_contested_a`,
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
        actionLabel: actionA,
        actionType: 'contested',
        narrativeType: 'contested_action_attempt',
        temporalStatus: 'unresolved',
      },
      description: `Character attempts action with contested timing: ${actionA}`,
    },
    {
      effectId: `${invocationId}_contested_b`,
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
        actionLabel: actionB,
        actionType: 'contested',
        narrativeType: 'contested_action_attempt',
        temporalStatus: 'unresolved',
      },
      description: `Character attempts action with contested timing: ${actionB}`,
    },
  ];
}

/**
 * Backward compatibility wrapper
 * @deprecated Use createContestedActionTimingEffects instead
 */
export function createInterruptingActionsEffects(
  characterId: string,
  declaredAction: string,
  declaredInterrupt: string,
  _interruptTarget: string | undefined,
  invocationId: string
): Effect[] {
  return createContestedActionTimingEffects(
    characterId,
    declaredAction,
    declaredInterrupt,
    invocationId
  );
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate contested action timing intent
 *
 * CRITICAL: This function is DETERMINISTIC and SIDE-EFFECT FREE.
 * It does NOT decide ordering.
 * It does NOT resolve precedence.
 * It does NOT suppress effects.
 * It treats both actions symmetrically.
 */
function validateContestedActionTiming(
  payload: ContestedActionTimingPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { actionA, actionB, actionAvailability } = payload;

  // CRITICAL: Always AMBIGUOUS when multiple actions assert temporal precedence
  // System does not resolve - treats both actions symmetrically
  const ambiguity: RulesAmbiguity = {
    reason: 'Multiple actions assert temporal precedence. ' +
      'This intent introduces contested action timing between multiple actions. ' +
      'Neither action is primary. The system does not resolve ordering.',
    possibleInterpretations: [
      {
        code: 'ACTION_A_PROCEEDS',
        resultingOutcome: RulesOutcome.PASS,
        description: `Action [${actionA}] is recognized as proceeding (GM decision)`,
      },
      {
        code: 'ACTION_B_PROCEEDS',
        resultingOutcome: RulesOutcome.PASS,
        description: `Action [${actionB}] is recognized as proceeding (GM decision)`,
      },
      {
        code: 'BOTH_PROCEED',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Both actions proceed simultaneously (GM decision)',
      },
      {
        code: 'NEITHER_PROCEEDS',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Neither action proceeds (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createContestedTimingConflict(actionA, actionB),
  ];

  const costValidation = createCostValidation(
    actionA,
    actionB,
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
 * Applicability for Contested Action Timing rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const CONTESTED_ACTION_TIMING_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['temporal', 'contested', 'symmetric']
);

// Backward compatibility
export const INTERRUPTING_ACTIONS_APPLICABILITY = CONTESTED_ACTION_TIMING_APPLICABILITY;

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const CONTESTED_ACTION_TIMING_INTENT_TYPE = 'CONTESTED_ACTION_TIMING' as IntentType;
export const INTERRUPTING_ACTIONS_INTENT_TYPE = 'INTERRUPTING_ACTIONS' as IntentType;

/**
 * Create the Contested Action Timing rules pipeline
 *
 * CRITICAL: This pipeline describes temporal ambiguity, it does NOT resolve it.
 * No ordering. No priority. No precedence. No directionality.
 * Both actions are treated symmetrically.
 */
export function createContestedActionTimingPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [CONTESTED_ACTION_TIMING_INTENT_TYPE, INTERRUPTING_ACTIONS_INTENT_TYPE],
    applicability: CONTESTED_ACTION_TIMING_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      // Check both new and legacy payload formats
      if (!isContestedActionTimingPayload(payload) && !isInterruptingActionsPayload(payload)) {
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

      // Normalize to symmetric payload
      const normalizedPayload = normalizePayload(
        payload as ContestedActionTimingPayload | InterruptingActionsPayload
      );

      const result = validateContestedActionTiming(normalizedPayload, invocationId);

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

// Backward compatibility
export const createInterruptingActionsPipeline = createContestedActionTimingPipeline;

// ============================================================================
// EXPORTS
// ============================================================================

export { RulesOutcome, ConflictKind };
