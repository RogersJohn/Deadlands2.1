/**
 * Free Actions vs Actions Rule (PR 8.0, PATCH 1)
 *
 * CRITICAL INVARIANT: Rules describe requirements without enforcing them.
 *
 * This rule validates intents that declare both an action and a commonly
 * treated "free action" in the same turn.
 *
 * CRITICAL: "Free" is DESCRIPTIVE CONVENTION, not SYSTEM TRUTH.
 * - Absence of cost does NOT imply legality
 * - Absence of cost does NOT remove ambiguity
 * - Absence of cost does NOT guarantee availability
 *
 * WHAT THIS RULE DOES:
 * - Detects when both action and free action are declared
 * - Emits AMBIGUOUS when both are present (system does not enforce convention)
 * - Emits ActionCostEffect for the action only (intentionally no cost for free action)
 * - Emits Informational conflict (descriptive, not enforcing)
 * - Emits effects for BOTH action and free action
 * - NEVER returns PASS when both action and free action declared
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Count actions
 * - Track action usage
 * - Enforce limits
 * - Enforce "free action" convention
 * - Guarantee that free actions are legal
 * - Suppress effects
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
 * Payload for free action + action intent
 *
 * CRITICAL: The payload declares intentions. It does NOT count resources.
 */
export type FreeActionsVsActionsPayload = {
  /** ID of the character performing the actions */
  readonly characterId: string;

  /**
   * The declared action (may be undefined if only free action)
   */
  readonly declaredAction?: string;

  /**
   * The declared free action (may be undefined if only regular action)
   */
  readonly declaredFreeAction?: string;

  /**
   * Action availability context
   *
   * - 'available': Some action capacity exists
   * - 'unavailable': No action capacity exists
   * - 'unknown': Capacity is not specified
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The system does not enforce action economy conventions.
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for FreeActionsVsActionsPayload
 */
export function isFreeActionsVsActionsPayload(
  payload: unknown
): payload is FreeActionsVsActionsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    (p.declaredAction === undefined || typeof p.declaredAction === 'string') &&
    (p.declaredFreeAction === undefined || typeof p.declaredFreeAction === 'string')
  );
}

// ============================================================================
// COST DECLARATIONS (DESCRIPTIVE, NOT ENFORCED)
// ============================================================================

/**
 * Validate action cost (for the action, NOT the free action)
 *
 * CRITICAL: Intentionally no cost emitted for free action.
 * Absence of cost does NOT imply legality.
 * The system does not enforce action economy conventions.
 */
function validateActionCost(
  declaredAction: string | undefined,
  actionAvailability?: 'available' | 'unavailable' | 'unknown'
): CostValidationResult | undefined {
  // If no action declared, no action cost
  if (!declaredAction) {
    return undefined;
  }

  const actionCost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Action: ${declaredAction}`,
    tags: ['action', 'standard'],
  };

  if (actionAvailability === 'unavailable') {
    return {
      cost: actionCost,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action capacity explicitly unavailable',
    };
  }

  return {
    cost: actionCost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Action availability depends on context',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create Informational conflict for combined action + free action
 *
 * CRITICAL: This is INFORMATIONAL, not enforcing.
 * - The system does NOT enforce action economy conventions
 * - "Free" is descriptive convention, not system truth
 */
function createCombinedActionsConflict(
  action: string,
  freeAction: string
): Conflict {
  return {
    kind: ConflictKind.Informational,
    sourceRule: 'SW_ACTION_ECONOMY_002',
    message: `Intent includes both an action (${action}) and a commonly treated free action (${freeAction}). ` +
      'Free actions are often treated as not consuming effort, but this system does not enforce that convention.',
    tags: ['action', 'free_action', 'economy', 'informational', 'no-enforcement'],
  };
}

// ============================================================================
// EFFECT EMISSION (FOR BOTH ACTION AND FREE ACTION)
// ============================================================================

/**
 * Create effects for action and free action
 *
 * CRITICAL INVARIANT: Both action and free action emit effects.
 * Free actions are NOT suppressed.
 * Actions are NOT suppressed by free actions.
 */
export function createFreeActionsVsActionsEffects(
  characterId: string,
  declaredAction: string | undefined,
  declaredFreeAction: string | undefined,
  invocationId: string,
  outcome: RulesOutcome
): Effect[] {
  const effects: Effect[] = [];

  // Effect for action (if declared)
  if (declaredAction) {
    effects.push({
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: {
        targetId: characterId,
        targetType: 'character',
      },
      authority: {
        invocationId,
        source: 'RULES' as const,
        outcome,
      },
      parameters: {
        actionLabel: declaredAction,
        actionType: 'standard',
        narrativeType: 'action_attempt',
      },
      description: `Character attempts action: ${declaredAction}`,
    });
  }

  // Effect for free action (if declared)
  if (declaredFreeAction) {
    effects.push({
      effectId: `${invocationId}_free_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: {
        targetId: characterId,
        targetType: 'character',
      },
      authority: {
        invocationId,
        source: 'RULES' as const,
        outcome,
      },
      parameters: {
        actionLabel: declaredFreeAction,
        actionType: 'free',
        narrativeType: 'free_action_attempt',
      },
      description: `Character performs free action: ${declaredFreeAction}`,
    });
  }

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate free actions vs actions intent
 *
 * CRITICAL: This function is DETERMINISTIC and SIDE-EFFECT FREE.
 * It does NOT count actions.
 * It does NOT enforce limits.
 * It NEVER emits FAIL for free action + action combination.
 */
function validateFreeActionsVsActions(
  payload: FreeActionsVsActionsPayload,
  invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult | undefined;
} {
  const { declaredAction, declaredFreeAction, actionAvailability } = payload;

  // If only free action, PASS with no cost
  if (!declaredAction && declaredFreeAction) {
    return {
      outcome: RulesOutcome.PASS,
      violations: [],
      ambiguity: null,
      conflicts: [],
      costValidation: undefined, // Free actions have no cost
    };
  }

  // If only action, standard cost validation
  if (declaredAction && !declaredFreeAction) {
    const costValidation = validateActionCost(declaredAction, actionAvailability);
    return {
      outcome: actionAvailability === 'unavailable' ? RulesOutcome.AMBIGUOUS : RulesOutcome.PASS,
      violations: [],
      ambiguity: actionAvailability === 'unavailable' ? {
        reason: 'Action declared but availability is uncertain.',
        possibleInterpretations: [
          {
            code: 'ALLOW_ACTION',
            resultingOutcome: RulesOutcome.PASS,
            description: 'Action proceeds despite reported unavailability',
          },
          {
            code: 'DENY_ACTION',
            resultingOutcome: RulesOutcome.FAIL,
            description: 'Action denied due to unavailability',
          },
        ],
      } : null,
      conflicts: [],
      costValidation,
    };
  }

  // Both action and free action declared
  if (declaredAction && declaredFreeAction) {
    const costValidation = validateActionCost(declaredAction, actionAvailability);

    // Emit informational conflict (not blocking)
    const conflicts: Conflict[] = [
      createCombinedActionsConflict(declaredAction, declaredFreeAction),
    ];

    // PASS or AMBIGUOUS, never FAIL
    // Free actions do not block regular actions
    if (actionAvailability === 'unavailable') {
      return {
        outcome: RulesOutcome.AMBIGUOUS,
        violations: [],
        ambiguity: {
          reason: 'Action availability uncertain, but free action is unaffected.',
          possibleInterpretations: [
            {
              code: 'ALLOW_BOTH',
              resultingOutcome: RulesOutcome.PASS,
              description: 'Both action and free action proceed',
            },
            {
              code: 'FREE_ONLY',
              resultingOutcome: RulesOutcome.PASS,
              description: 'Free action proceeds, action deferred',
            },
          ],
        },
        conflicts,
        costValidation,
      };
    }

    // CRITICAL: AMBIGUOUS, not PASS
    // The system does NOT enforce "free action" convention
    // Absence of cost does NOT imply legality
    return {
      outcome: RulesOutcome.AMBIGUOUS,
      violations: [],
      ambiguity: {
        reason: 'Intent includes both an action and a commonly treated free action. ' +
          'The system does not enforce action economy conventions.',
        possibleInterpretations: [
          {
            code: 'ALLOW_BOTH',
            resultingOutcome: RulesOutcome.PASS,
            description: 'Both action and free action proceed',
          },
          {
            code: 'ACTION_ONLY',
            resultingOutcome: RulesOutcome.PASS,
            description: 'Action proceeds, free action deferred or denied',
          },
          {
            code: 'FREE_ONLY',
            resultingOutcome: RulesOutcome.PASS,
            description: 'Free action proceeds, action deferred or denied',
          },
        ],
      },
      conflicts,
      costValidation,
    };
  }

  // Neither declared - PASS with no effects
  return {
    outcome: RulesOutcome.PASS,
    violations: [],
    ambiguity: null,
    conflicts: [],
    costValidation: undefined,
  };
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * Applicability for Free Actions vs Actions rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const FREE_ACTIONS_VS_ACTIONS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['action', 'free_action', 'economy']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE = 'FREE_ACTIONS_VS_ACTIONS' as IntentType;

/**
 * Create the Free Actions vs Actions rules pipeline
 *
 * CRITICAL: This pipeline describes requirements, it does NOT enforce them.
 * Free actions NEVER suppress or block regular actions.
 */
export function createFreeActionsVsActionsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [FREE_ACTIONS_VS_ACTIONS_INTENT_TYPE],
    applicability: FREE_ACTIONS_VS_ACTIONS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isFreeActionsVsActionsPayload(payload)) {
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

      const result = validateFreeActionsVsActions(payload, invocationId);

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
