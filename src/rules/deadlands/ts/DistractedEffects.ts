/**
 * Distracted Effects Rule (PR 8.4)
 *
 * CRITICAL INVARIANT: Volume must not create precedence.
 *
 * This rule validates intents where an actor marked Distracted declares
 * any action. Distraction is noted but does NOT resolve into penalties,
 * enforcement, or state mutation.
 *
 * CRITICAL: Conditions are facts, not transitions.
 * - Distraction interferes with focus
 * - The system does NOT quantify impact
 * - The system does NOT enforce outcomes
 * - The system does NOT mutate state
 *
 * WHAT THIS RULE DOES:
 * - Detects when a Distracted actor declares an action
 * - Emits AMBIGUOUS (distraction interferes with focus)
 * - Emits ActionCostEffect
 * - Emits SoftBlock conflict (impaired attention)
 * - Emits action effects AND distraction context effect
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Quantify impact
 * - Apply penalties
 * - Enforce outcomes
 * - Mutate state
 * - Clear conditions
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
 * Payload for distracted effects intent
 *
 * CRITICAL: The payload notes distraction as context.
 * Distraction is a FACT, not a transition.
 */
export type DistractedEffectsPayload = {
  /** ID of the distracted character */
  readonly characterId: string;

  /**
   * The action being declared
   */
  readonly declaredAction: string;

  /**
   * Confirmation that actor is Distracted
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The system does NOT quantify impact.
   */
  readonly isDistracted: true;

  /**
   * Optional description of distraction source
   */
  readonly distractionSource?: string;
};

/**
 * Type guard for DistractedEffectsPayload
 */
export function isDistractedEffectsPayload(
  payload: unknown
): payload is DistractedEffectsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAction === 'string' &&
    p.isDistracted === true
  );
}

// ============================================================================
// COST DECLARATIONS
// ============================================================================

/**
 * Create cost validation for action while distracted
 *
 * CRITICAL: Cost is emitted. No modification due to distraction.
 * The system does NOT quantify impact.
 */
function createCostValidation(
  declaredAction: string
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Action while distracted: ${declaredAction}`,
    tags: ['action', 'distracted', 'condition'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Distraction interferes with focus - system does not quantify impact',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for distracted action
 *
 * CRITICAL: Conflict describes impaired attention.
 * It does NOT quantify impact. It does NOT enforce outcomes.
 */
function createDistractedConflict(
  declaredAction: string,
  distractionSource: string | undefined
): Conflict {
  const sourceSuffix = distractionSource ? ` (source: ${distractionSource})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_CONDITION_001',
    message: `Action while Distracted: ${declaredAction}${sourceSuffix}. ` +
      'Distraction interferes with focus. ' +
      'The system does not quantify impact.',
    tags: ['condition', 'distracted', 'impaired-attention', 'no-quantification'],
  };
}

// ============================================================================
// EFFECT EMISSION
// ============================================================================

/**
 * Create effects for action while distracted
 *
 * CRITICAL INVARIANT: Effects are emitted.
 * Action effects AND distraction context effect.
 */
export function createDistractedEffectsEffects(
  characterId: string,
  declaredAction: string,
  distractionSource: string | undefined,
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

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
      conditionPresent: 'distracted',
    },
    description: `Character attempts action while distracted: ${declaredAction}`,
  });

  // Effect noting distraction context
  effects.push({
    effectId: `${invocationId}_distraction_context`,
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
      narrativeType: 'condition_context',
      condition: 'distracted',
      distractionSource: distractionSource || 'unspecified',
      impactQuantified: false,
      stateModified: false,
    },
    description: 'Distraction context noted - no impact quantified',
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate distracted effects intent
 *
 * CRITICAL: Emits AMBIGUOUS. Does NOT quantify impact.
 * Distraction is a fact, not a transition.
 */
function validateDistractedEffects(
  payload: DistractedEffectsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAction, distractionSource } = payload;

  const ambiguity: RulesAmbiguity = {
    reason: 'Distraction interferes with focus. ' +
      'The system does not quantify impact.',
    possibleInterpretations: [
      {
        code: 'DISTRACTION_IRRELEVANT',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Distraction does not affect this action (GM decision)',
      },
      {
        code: 'DISTRACTION_HINDERS',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Distraction hinders the action (GM decision)',
      },
      {
        code: 'DISTRACTION_PARTIAL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Distraction has partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createDistractedConflict(declaredAction, distractionSource),
  ];

  const costValidation = createCostValidation(declaredAction);

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
 * Applicability for Distracted Effects rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const DISTRACTED_EFFECTS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['condition', 'distracted', 'impairment']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const DISTRACTED_EFFECTS_INTENT_TYPE = 'DISTRACTED_EFFECTS' as IntentType;

/**
 * Create the Distracted Effects rules pipeline
 *
 * CRITICAL: Volume must not create precedence.
 * Conditions are facts, not transitions.
 */
export function createDistractedEffectsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [DISTRACTED_EFFECTS_INTENT_TYPE],
    applicability: DISTRACTED_EFFECTS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isDistractedEffectsPayload(payload)) {
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

      const result = validateDistractedEffects(payload, invocationId);

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
