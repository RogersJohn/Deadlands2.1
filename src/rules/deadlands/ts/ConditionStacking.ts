/**
 * Condition Stacking Rule (PR 8.4)
 *
 * CRITICAL INVARIANT: Volume must not create precedence.
 *
 * This rule validates intents where an actor is Shaken AND also Distracted
 * or Vulnerable. Multiple conditions coexist without collapsing into dominance
 * or precedence.
 *
 * CRITICAL: Conditions are facts, not transitions.
 * - Multiple impairments coexist
 * - The system does NOT resolve dominance
 * - The system does NOT collapse into FAIL
 * - The system does NOT mutate state
 *
 * WHAT THIS RULE DOES:
 * - Detects when Shaken actor is also Distracted or Vulnerable
 * - Emits AMBIGUOUS (must NOT collapse into FAIL)
 * - Emits ActionCostEffect
 * - Emits SoftBlock conflict (compounded impairment without precedence)
 * - Emits action effects AND multiple conditions context effect
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Resolve dominance
 * - Collapse into FAIL
 * - Apply combined penalties
 * - Enforce outcomes
 * - Mutate state
 * - Create condition precedence
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
 * Payload for condition stacking intent
 *
 * CRITICAL: The payload notes multiple conditions as context.
 * Conditions coexist without dominance or precedence.
 */
export type ConditionStackingPayload = {
  /** ID of the character with multiple conditions */
  readonly characterId: string;

  /**
   * The action being declared
   */
  readonly declaredAction: string;

  /**
   * Actor is Shaken (required for this rule)
   */
  readonly isShaken: true;

  /**
   * Additional condition(s) present
   *
   * CRITICAL: Multiple conditions coexist.
   * The system does NOT resolve dominance.
   */
  readonly additionalCondition: 'distracted' | 'vulnerable' | 'both';
};

/**
 * Type guard for ConditionStackingPayload
 */
export function isConditionStackingPayload(
  payload: unknown
): payload is ConditionStackingPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAction === 'string' &&
    p.isShaken === true &&
    (p.additionalCondition === 'distracted' ||
     p.additionalCondition === 'vulnerable' ||
     p.additionalCondition === 'both')
  );
}

// ============================================================================
// COST DECLARATIONS
// ============================================================================

/**
 * Create cost validation for action with stacked conditions
 *
 * CRITICAL: Cost is emitted. No combined penalty calculation.
 * The system does NOT resolve dominance.
 */
function createCostValidation(
  declaredAction: string,
  additionalCondition: 'distracted' | 'vulnerable' | 'both'
): CostValidationResult {
  const conditionLabel = additionalCondition === 'both'
    ? 'distracted and vulnerable'
    : additionalCondition;
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Action while shaken + ${conditionLabel}: ${declaredAction}`,
    tags: ['action', 'shaken', additionalCondition, 'condition-stacking'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Multiple impairments coexist - system does not resolve dominance',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for stacked conditions
 *
 * CRITICAL: Conflict describes compounded impairment WITHOUT precedence.
 * It does NOT resolve dominance. It does NOT collapse into FAIL.
 */
function createConditionStackingConflict(
  declaredAction: string,
  additionalCondition: 'distracted' | 'vulnerable' | 'both'
): Conflict {
  const conditionLabel = additionalCondition === 'both'
    ? 'distracted and vulnerable'
    : additionalCondition;
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_CONDITION_003',
    message: `Action while Shaken + ${conditionLabel}: ${declaredAction}. ` +
      'Multiple impairments coexist. ' +
      'The system does not resolve dominance or precedence.',
    tags: ['condition', 'shaken', additionalCondition, 'stacking', 'no-precedence', 'no-dominance'],
  };
}

// ============================================================================
// EFFECT EMISSION
// ============================================================================

/**
 * Create effects for action with stacked conditions
 *
 * CRITICAL INVARIANT: Effects are emitted.
 * Action effects AND multiple conditions context effect.
 */
export function createConditionStackingEffects(
  characterId: string,
  declaredAction: string,
  additionalCondition: 'distracted' | 'vulnerable' | 'both',
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

  const conditionLabel = additionalCondition === 'both'
    ? 'distracted and vulnerable'
    : additionalCondition;

  // Effect for the action attempt
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
      narrativeType: 'action_attempt',
      attemptRecorded: true,
      conditionsPresent: ['shaken', additionalCondition],
    },
    description: `Character attempts action while shaken + ${conditionLabel}: ${declaredAction}`,
  });

  // Effect noting multiple conditions context
  effects.push({
    effectId: `${invocationId}_stacking_context`,
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
      narrativeType: 'condition_stacking_context',
      primaryCondition: 'shaken',
      additionalCondition,
      conditionsCoexist: true,
      dominanceResolved: false,
      precedenceApplied: false,
      stateModified: false,
    },
    description: 'Multiple conditions noted - no dominance resolved',
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate condition stacking intent
 *
 * CRITICAL: Emits AMBIGUOUS. Must NOT collapse into FAIL.
 * Multiple impairments coexist without dominance.
 */
function validateConditionStacking(
  payload: ConditionStackingPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAction, additionalCondition } = payload;

  const conditionLabel = additionalCondition === 'both'
    ? 'distracted and vulnerable'
    : additionalCondition;

  // CRITICAL: Must NOT collapse into FAIL
  // Multiple impairments coexist
  const ambiguity: RulesAmbiguity = {
    reason: 'Multiple impairments coexist. ' +
      'The system does not resolve dominance.',
    possibleInterpretations: [
      {
        code: 'CONDITIONS_IRRELEVANT',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Stacked conditions do not affect this action (GM decision)',
      },
      {
        code: 'CONDITIONS_COMPOUND',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Stacked conditions compound negatively (GM decision)',
      },
      {
        code: 'CONDITIONS_PARTIAL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Stacked conditions have partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createConditionStackingConflict(declaredAction, additionalCondition),
  ];

  const costValidation = createCostValidation(declaredAction, additionalCondition);

  // CRITICAL: AMBIGUOUS, not FAIL
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
 * Applicability for Condition Stacking rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const CONDITION_STACKING_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['condition', 'shaken', 'stacking', 'multiple-conditions']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const CONDITION_STACKING_INTENT_TYPE = 'CONDITION_STACKING' as IntentType;

/**
 * Create the Condition Stacking rules pipeline
 *
 * CRITICAL: Volume must not create precedence.
 * Multiple conditions coexist without dominance.
 */
export function createConditionStackingPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [CONDITION_STACKING_INTENT_TYPE],
    applicability: CONDITION_STACKING_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isConditionStackingPayload(payload)) {
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

      const result = validateConditionStacking(payload, invocationId);

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
