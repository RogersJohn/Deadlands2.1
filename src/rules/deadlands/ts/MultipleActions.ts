/**
 * Multiple Actions in a Turn Rule (PR 8.0)
 *
 * CRITICAL INVARIANT: Rules describe requirements without enforcing them.
 *
 * This rule validates intents that declare multiple actions in a single turn.
 * It always produces AMBIGUOUS, emits costs, emits conflicts, and emits effects.
 *
 * WHAT THIS RULE DOES:
 * - Detects multiple action declarations
 * - Emits AMBIGUOUS validation (legality depends on table interpretation)
 * - Emits multiple ActionCostEffects (one per declared action)
 * - Emits SoftBlock conflict describing action economy pressure
 * - Emits effects (effects are NOT suppressed by ambiguity)
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Count actions
 * - Track action usage
 * - Enforce limits
 * - Remember previous turns
 * - Perform arithmetic
 * - Decide legality
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
 * Payload for multi-action intent
 *
 * CRITICAL: The payload declares actions. It does NOT count them.
 * The rule inspects declarations. It does NOT enforce limits.
 */
export type MultipleActionsPayload = {
  /** ID of the character performing the actions */
  readonly characterId: string;

  /**
   * The declared actions (descriptive labels only)
   *
   * CRITICAL: These are LABELS, not counted resources.
   * The rule does NOT count actions.
   * The rule does NOT track usage.
   * The rule does NOT enforce limits.
   */
  readonly declaredActions: readonly string[];

  /**
   * Action availability context
   *
   * - 'available': Some action capacity exists
   * - 'unavailable': No action capacity exists
   * - 'unknown': Capacity is not specified
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The rule does NOT track or subtract actions.
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for MultipleActionsPayload
 */
export function isMultipleActionsPayload(payload: unknown): payload is MultipleActionsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    Array.isArray(p.declaredActions) &&
    p.declaredActions.every((a) => typeof a === 'string')
  );
}

// ============================================================================
// COST DECLARATIONS (DESCRIPTIVE, NOT ENFORCED)
// ============================================================================

/**
 * Create ActionCostEffect for a single declared action
 *
 * CRITICAL: This is DESCRIPTIVE ONLY.
 * - No arithmetic
 * - No counting
 * - No enforcement
 */
function createActionCost(actionLabel: string): ActionCostEffect {
  return {
    kind: 'ActionCostEffect',
    description: `Action declared: ${actionLabel}`,
    tags: ['action', 'declared'],
  };
}

/**
 * Validate action costs (always AMBIGUOUS for multiple actions)
 *
 * CRITICAL: Multiple actions produce AMBIGUOUS cost validation.
 * The rule does NOT decide if this is legal.
 * The rule does NOT count remaining actions.
 */
function validateActionCosts(
  declaredActions: readonly string[],
  actionAvailability?: 'available' | 'unavailable' | 'unknown'
): CostValidationResult {
  // Create a combined cost representing all declared actions
  const combinedCost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Multiple actions declared: ${declaredActions.join(', ')}`,
    tags: ['action', 'multiple', 'declared'],
  };

  if (actionAvailability === 'unavailable') {
    return {
      cost: combinedCost,
      outcome: CostValidationOutcome.UNSATISFIED,
      reason: 'Action capacity explicitly unavailable',
    };
  }

  // CRITICAL: Even with 'available', multiple actions are AMBIGUOUS
  // The rule does NOT decide if multiple actions can be performed
  return {
    cost: combinedCost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Multiple actions declared - legality depends on table interpretation',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for multiple actions
 *
 * CRITICAL: This is DESCRIPTIVE, not enforcing.
 * - Conflict does NOT prevent actions
 * - Conflict does NOT decide outcome
 * - Conflict is data for GM interpretation
 */
function createMultipleActionsConflict(declaredActions: readonly string[]): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_ACTION_ECONOMY_001',
    message: `Multiple actions declared in single turn: ${declaredActions.join(', ')}. ` +
      'Action economy pressure exists. No enforcement performed.',
    tags: ['action', 'economy', 'multiple', 'no-enforcement'],
  };
}

// ============================================================================
// EFFECT EMISSION (DESPITE AMBIGUITY)
// ============================================================================

/**
 * Create effects for declared actions
 *
 * CRITICAL INVARIANT: Effects are emitted DESPITE AMBIGUOUS validation.
 * AMBIGUOUS does not mean "no effects."
 * AMBIGUOUS means "GM must interpret, but effects are declared."
 */
export function createMultipleActionsEffects(
  characterId: string,
  declaredActions: readonly string[],
  invocationId: string
): Effect[] {
  return declaredActions.map((action, index) => ({
    effectId: `${invocationId}_action_${index}`,
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
      actionLabel: action,
      actionIndex: index,
      narrativeType: 'action_attempt',
    },
    description: `Character attempts action: ${action}`,
  }));
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate multiple actions intent
 *
 * CRITICAL: This function is DETERMINISTIC and SIDE-EFFECT FREE.
 * It does NOT count actions.
 * It does NOT track usage.
 * It does NOT enforce limits.
 * It does NOT decide legality.
 */
function validateMultipleActions(
  payload: MultipleActionsPayload,
  invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredActions, actionAvailability } = payload;

  // If only one action declared, this rule does not apply
  if (declaredActions.length <= 1) {
    return {
      outcome: RulesOutcome.PASS,
      violations: [],
      ambiguity: null,
      conflicts: [],
      costValidation: {
        cost: {
          kind: 'ActionCostEffect',
          description: declaredActions.length === 1
            ? `Single action: ${declaredActions[0]}`
            : 'No actions declared',
          tags: ['action', 'single'],
        },
        outcome: CostValidationOutcome.AMBIGUOUS,
        reason: 'Single action - availability depends on context',
      },
    };
  }

  // Multiple actions declared - produce AMBIGUOUS
  const ambiguity: RulesAmbiguity = {
    reason: 'Multiple actions declared in a single turn. ' +
      'Legality depends on table interpretation of action economy rules.',
    possibleInterpretations: [
      {
        code: 'ALLOW_ALL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'All declared actions are legal within action economy',
      },
      {
        code: 'PARTIAL_ALLOW',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Some actions may proceed, others deferred',
      },
      {
        code: 'DENY_EXCESS',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Excess actions beyond economy limit denied',
      },
    ],
  };

  const conflicts: Conflict[] = [createMultipleActionsConflict(declaredActions)];
  const costValidation = validateActionCosts(declaredActions, actionAvailability);

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
 * Applicability for Multiple Actions rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const MULTIPLE_ACTIONS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['action', 'economy', 'multiple']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const MULTIPLE_ACTIONS_INTENT_TYPE = 'MULTIPLE_ACTIONS' as IntentType;

/**
 * Create the Multiple Actions rules pipeline
 *
 * CRITICAL: This pipeline describes requirements, it does NOT enforce them.
 */
export function createMultipleActionsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [MULTIPLE_ACTIONS_INTENT_TYPE],
    applicability: MULTIPLE_ACTIONS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isMultipleActionsPayload(payload)) {
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

      const result = validateMultipleActions(payload, invocationId);

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
