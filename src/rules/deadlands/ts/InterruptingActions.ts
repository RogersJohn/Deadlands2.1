/**
 * Interrupting Actions Rule (PR 8.1)
 *
 * CRITICAL INVARIANT: The system does NOT resolve ordering.
 *
 * This rule validates intents where an action and an interrupt attempt
 * are both declared. It produces AMBIGUOUS because multiple actions
 * claim temporal precedence and the system does not decide which proceeds.
 *
 * CRITICAL: NO ORDERING, NO PRIORITY, NO SEQUENCING.
 * - The system does NOT decide "what happens first"
 * - The system does NOT resolve temporal conflicts
 * - The system does NOT suppress effects based on timing
 * - The system does NOT model time
 *
 * WHAT THIS RULE DOES:
 * - Detects when action and interrupt are both declared
 * - Emits AMBIGUOUS (multiple actions claim temporal precedence)
 * - Emits ActionCostEffect for both the action and the interrupt
 * - Emits SoftBlock conflict (timing is contested, no precedence applied)
 * - Emits effects for BOTH actions (no suppression)
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Decide ordering
 * - Apply priority
 * - Resolve timing
 * - Suppress effects
 * - Cancel actions
 * - Model "interruption" as prevention
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
 * Payload for interrupting actions intent
 *
 * CRITICAL: The payload declares intentions. It does NOT imply ordering.
 * Both action and interrupt are declared; the system does NOT decide precedence.
 */
export type InterruptingActionsPayload = {
  /** ID of the character attempting the interrupt */
  readonly characterId: string;

  /**
   * The declared action being performed
   */
  readonly declaredAction: string;

  /**
   * The declared interrupt attempt
   *
   * CRITICAL: This is a DECLARATION, not a resolution.
   * The system does NOT decide if the interrupt "succeeds."
   */
  readonly declaredInterrupt: string;

  /**
   * Target of the interrupt (optional - descriptive only)
   */
  readonly interruptTarget?: string;

  /**
   * Action availability context
   */
  readonly actionAvailability?: 'available' | 'unavailable' | 'unknown';
};

/**
 * Type guard for InterruptingActionsPayload
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

// ============================================================================
// COST DECLARATIONS (DESCRIPTIVE, NOT ENFORCED)
// ============================================================================

/**
 * Create cost validation for action and interrupt
 *
 * CRITICAL: Both action and interrupt emit costs.
 * No cost implies ordering. No cost implies precedence.
 */
function createCostValidation(
  declaredAction: string,
  declaredInterrupt: string,
  actionAvailability?: 'available' | 'unavailable' | 'unknown'
): CostValidationResult {
  const combinedCost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Action: ${declaredAction} | Interrupt attempt: ${declaredInterrupt}`,
    tags: ['action', 'interrupt', 'temporal-conflict'],
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
    reason: 'Multiple actions claim temporal precedence - system does not resolve ordering',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for interrupt timing
 *
 * CRITICAL: This conflict describes contested timing.
 * It does NOT resolve precedence. It does NOT suppress actions.
 */
function createInterruptConflict(
  action: string,
  interrupt: string
): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_TEMPORAL_001',
    message: `Interrupt timing is contested: action (${action}) and interrupt (${interrupt}) both declared. ` +
      'Multiple actions claim temporal precedence. No precedence is applied. ' +
      'The system does not resolve ordering.',
    tags: ['temporal', 'interrupt', 'contested', 'no-ordering', 'no-precedence'],
  };
}

// ============================================================================
// EFFECT EMISSION (BOTH ACTIONS EMIT EFFECTS)
// ============================================================================

/**
 * Create effects for both action and interrupt
 *
 * CRITICAL INVARIANT: Both action and interrupt emit effects.
 * No effect suppression due to "interruption."
 * The system does NOT decide which action "wins."
 */
export function createInterruptingActionsEffects(
  characterId: string,
  declaredAction: string,
  declaredInterrupt: string,
  interruptTarget: string | undefined,
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the declared action
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
      outcome: RulesOutcome.AMBIGUOUS,
    },
    parameters: {
      actionLabel: declaredAction,
      actionType: 'standard',
      narrativeType: 'action_attempt',
      temporalStatus: 'contested',
    },
    description: `Character attempts action: ${declaredAction} (timing contested)`,
  });

  // Effect for the interrupt attempt
  effects.push({
    effectId: `${invocationId}_interrupt`,
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
      actionLabel: declaredInterrupt,
      actionType: 'interrupt',
      narrativeType: 'interrupt_attempt',
      interruptTarget: interruptTarget || 'unspecified',
      temporalStatus: 'contested',
    },
    description: `Character attempts interrupt: ${declaredInterrupt} (timing contested)`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate interrupting actions intent
 *
 * CRITICAL: This function is DETERMINISTIC and SIDE-EFFECT FREE.
 * It does NOT decide ordering.
 * It does NOT resolve precedence.
 * It does NOT suppress effects.
 */
function validateInterruptingActions(
  payload: InterruptingActionsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAction, declaredInterrupt, actionAvailability } = payload;

  // CRITICAL: Always AMBIGUOUS when both action and interrupt are declared
  // Multiple actions claim temporal precedence - system does not resolve
  const ambiguity: RulesAmbiguity = {
    reason: 'Multiple actions claim temporal precedence. ' +
      'An action and an interrupt are both declared. ' +
      'The system does not resolve ordering.',
    possibleInterpretations: [
      {
        code: 'INTERRUPT_PROCEEDS',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Interrupt is recognized as proceeding (GM decision)',
      },
      {
        code: 'ACTION_PROCEEDS',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Action is recognized as proceeding (GM decision)',
      },
      {
        code: 'BOTH_PROCEED',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Both action and interrupt proceed (GM decision)',
      },
      {
        code: 'NEITHER_PROCEEDS',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Neither action nor interrupt proceeds (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createInterruptConflict(declaredAction, declaredInterrupt),
  ];

  const costValidation = createCostValidation(
    declaredAction,
    declaredInterrupt,
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
 * Applicability for Interrupting Actions rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const INTERRUPTING_ACTIONS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['temporal', 'interrupt', 'ordering']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const INTERRUPTING_ACTIONS_INTENT_TYPE = 'INTERRUPTING_ACTIONS' as IntentType;

/**
 * Create the Interrupting Actions rules pipeline
 *
 * CRITICAL: This pipeline describes temporal conflict, it does NOT resolve it.
 * No ordering. No priority. No precedence.
 */
export function createInterruptingActionsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [INTERRUPTING_ACTIONS_INTENT_TYPE],
    applicability: INTERRUPTING_ACTIONS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isInterruptingActionsPayload(payload)) {
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

      const result = validateInterruptingActions(payload, invocationId);

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
