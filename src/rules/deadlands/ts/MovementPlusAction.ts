/**
 * Movement + Action Legality Rule (PR 8.0)
 *
 * CRITICAL INVARIANT: Rules describe requirements without enforcing them.
 *
 * This rule validates intents that declare both movement and an action
 * in the same turn. It always produces AMBIGUOUS because the system
 * does not decide whether movement consumes effort.
 *
 * WHAT THIS RULE DOES:
 * - Detects when both movement and action are declared
 * - Emits AMBIGUOUS validation (movement may or may not consume effort)
 * - Emits ActionCostEffect for the action
 * - Emits optional descriptive cost for movement (non-numeric)
 * - Emits SoftBlock conflict emphasizing GM adjudication
 * - Emits effects for BOTH movement and action
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Decide if movement consumes action capacity
 * - Track movement distance
 * - Enforce movement limits
 * - Count actions
 * - Perform arithmetic
 * - Remember previous turns
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
 * Payload for movement + action intent
 *
 * CRITICAL: The payload declares intentions. It does NOT specify distances
 * or costs in numeric terms.
 */
export type MovementPlusActionPayload = {
  /** ID of the character performing the movement and action */
  readonly characterId: string;

  /**
   * Whether movement is declared
   *
   * CRITICAL: This is a boolean, NOT a distance.
   * The rule does NOT track distance or pace.
   */
  readonly movementDeclared: boolean;

  /**
   * Descriptive label for the movement (optional)
   * Examples: "advance toward enemy", "retreat to cover", "flank"
   */
  readonly movementDescription?: string;

  /**
   * The declared action (may be undefined if only movement)
   */
  readonly declaredAction?: string;

  /**
   * Action availability context
   *
   * - 'available': Some action capacity exists
   * - 'unavailable': No action capacity exists
   * - 'unknown': Capacity is not specified
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for MovementPlusActionPayload
 */
export function isMovementPlusActionPayload(
  payload: unknown
): payload is MovementPlusActionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.movementDeclared === 'boolean' &&
    (p.movementDescription === undefined || typeof p.movementDescription === 'string') &&
    (p.declaredAction === undefined || typeof p.declaredAction === 'string')
  );
}

// ============================================================================
// COST DECLARATIONS (DESCRIPTIVE, NOT ENFORCED)
// ============================================================================

/**
 * Create cost validation for movement + action
 *
 * CRITICAL:
 * - Action cost is descriptive (non-numeric)
 * - Movement cost is optional and descriptive (non-numeric)
 * - The rule does NOT decide if movement consumes action capacity
 */
function createCostValidation(
  declaredAction: string | undefined,
  movementDescription: string | undefined,
  actionAvailability?: 'available' | 'unavailable' | 'unknown'
): CostValidationResult {
  // Combined cost description
  const costParts: string[] = [];

  if (declaredAction) {
    costParts.push(`Action: ${declaredAction}`);
  }

  if (movementDescription) {
    costParts.push(`Movement: ${movementDescription}`);
  } else {
    costParts.push('Movement declared');
  }

  const combinedCost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: costParts.join(' + '),
    tags: ['action', 'movement', 'combined'],
  };

  if (actionAvailability === 'unavailable') {
    return {
      cost: combinedCost,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action capacity explicitly unavailable',
    };
  }

  // CRITICAL: Always AMBIGUOUS because movement may or may not consume effort
  return {
    cost: combinedCost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Movement may or may not consume effort - GM adjudication required',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for movement + action
 *
 * CRITICAL: This emphasizes ambiguity and GM adjudication.
 * - Conflict does NOT decide outcome
 * - Conflict does NOT enforce limits
 * - Conflict is data for GM interpretation
 */
function createMovementPlusActionConflict(
  movementDescription: string | undefined,
  action: string
): Conflict {
  const movementLabel = movementDescription || 'movement';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_ACTION_ECONOMY_003',
    message: `Movement (${movementLabel}) and action (${action}) both declared. ` +
      'Movement may or may not consume effort. The system does not decide. ' +
      'GM adjudication required.',
    tags: ['action', 'movement', 'economy', 'ambiguous', 'gm-adjudication'],
  };
}

// ============================================================================
// EFFECT EMISSION (FOR BOTH MOVEMENT AND ACTION)
// ============================================================================

/**
 * Create effects for movement and action
 *
 * CRITICAL INVARIANT: Both movement and action emit effects.
 * Effects are NOT suppressed by ambiguity.
 * The system declares what would happen, it does not decide if it happens.
 */
export function createMovementPlusActionEffects(
  characterId: string,
  movementDeclared: boolean,
  movementDescription: string | undefined,
  declaredAction: string | undefined,
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

  // Effect for movement (if declared)
  if (movementDeclared) {
    effects.push({
      effectId: `${invocationId}_movement`,
      effectType: EffectType.CHANGE_POSITION,
      target: {
        targetId: characterId,
        targetType: 'character',
      },
      authority: {
        invocationId,
        source: 'RULES' as const,
        outcome: RulesOutcome.AMBIGUOUS, // Effect exists despite AMBIGUOUS
      },
      parameters: {
        movementType: 'declared',
        movementDescription: movementDescription || 'movement',
        narrativeType: 'movement_attempt',
      },
      description: `Character moves: ${movementDescription || 'movement declared'}`,
    });
  }

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
        outcome: RulesOutcome.AMBIGUOUS, // Effect exists despite AMBIGUOUS
      },
      parameters: {
        actionLabel: declaredAction,
        actionType: 'standard',
        narrativeType: 'action_attempt',
      },
      description: `Character attempts action: ${declaredAction}`,
    });
  }

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate movement + action intent
 *
 * CRITICAL: This function is DETERMINISTIC and SIDE-EFFECT FREE.
 * It does NOT decide whether movement consumes action capacity.
 * It does NOT track distances.
 * It does NOT enforce limits.
 */
function validateMovementPlusAction(
  payload: MovementPlusActionPayload,
  invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult | undefined;
} {
  const { movementDeclared, movementDescription, declaredAction, actionAvailability } = payload;

  // If only movement, no ambiguity about action economy
  if (movementDeclared && !declaredAction) {
    return {
      outcome: RulesOutcome.PASS,
      violations: [],
      ambiguity: null,
      conflicts: [],
      costValidation: undefined, // Movement alone has no action cost
    };
  }

  // If only action, standard cost validation
  if (!movementDeclared && declaredAction) {
    const actionCost: ActionCostEffect = {
      kind: 'ActionCostEffect',
      description: `Action: ${declaredAction}`,
      tags: ['action', 'standard'],
    };

    return {
      outcome: RulesOutcome.PASS,
      violations: [],
      ambiguity: null,
      conflicts: [],
      costValidation: {
        cost: actionCost,
        outcome: CostValidationOutcome.AMBIGUOUS,
        reason: 'Action availability depends on context',
      },
    };
  }

  // Both movement and action declared - ALWAYS AMBIGUOUS
  if (movementDeclared && declaredAction) {
    const ambiguity: RulesAmbiguity = {
      reason: 'Movement and action both declared. ' +
        'Movement may or may not consume effort. The system does not decide.',
      possibleInterpretations: [
        {
          code: 'MOVEMENT_FREE',
          resultingOutcome: RulesOutcome.PASS,
          description: 'Movement is free, action proceeds normally',
        },
        {
          code: 'MOVEMENT_COSTS',
          resultingOutcome: RulesOutcome.PASS,
          description: 'Movement consumes effort but both still possible',
        },
        {
          code: 'ACTION_ONLY',
          resultingOutcome: RulesOutcome.PASS,
          description: 'Action proceeds, movement deferred',
        },
        {
          code: 'MOVEMENT_ONLY',
          resultingOutcome: RulesOutcome.FAIL,
          description: 'Movement proceeds, action denied',
        },
      ],
    };

    const conflicts: Conflict[] = [
      createMovementPlusActionConflict(movementDescription, declaredAction),
    ];

    const costValidation = createCostValidation(
      declaredAction,
      movementDescription,
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
 * Applicability for Movement + Action rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const MOVEMENT_PLUS_ACTION_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['action', 'movement', 'economy']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const MOVEMENT_PLUS_ACTION_INTENT_TYPE = 'MOVEMENT_PLUS_ACTION' as IntentType;

/**
 * Create the Movement + Action rules pipeline
 *
 * CRITICAL: This pipeline describes requirements, it does NOT enforce them.
 * Movement + action is ALWAYS AMBIGUOUS - the system does not decide.
 */
export function createMovementPlusActionPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [MOVEMENT_PLUS_ACTION_INTENT_TYPE],
    applicability: MOVEMENT_PLUS_ACTION_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isMovementPlusActionPayload(payload)) {
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

      const result = validateMovementPlusAction(payload, invocationId);

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
