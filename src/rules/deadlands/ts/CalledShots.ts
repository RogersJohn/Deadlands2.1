/**
 * Called Shots Rule (PR 8.2)
 *
 * CRITICAL INVARIANT: FAIL does not mean "nothing happens."
 *
 * This rule validates intents where an attack specifies a called shot target.
 * It produces FAIL or AMBIGUOUS because called shots introduce additional
 * difficulty, but the attack attempt is STILL recorded and effects STILL emit.
 *
 * CRITICAL: FAILURE DESCRIBES LEGALITY, NOT PHYSICAL REALITY.
 * - FAIL does NOT suppress effects
 * - FAIL does NOT mean "nothing happens"
 * - FAIL does NOT cancel the attack
 * - The attack attempt still occurred - the engine records it
 *
 * WHAT THIS RULE DOES:
 * - Detects when attack specifies a called shot target
 * - Emits FAIL or AMBIGUOUS (called shots introduce difficulty)
 * - Emits SoftBlock conflict (precision requirements)
 * - Emits ActionCostEffect (no numeric penalties)
 * - Emits attack effects AND called shot targeting effect
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Suppress effects on FAIL
 * - Compute modifiers
 * - Calculate penalties
 * - Decide hit/miss
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
 * Payload for called shot intent
 *
 * CRITICAL: The payload declares the attack attempt with called shot.
 * The attack happened. The called shot targeting happened.
 * Difficulty does NOT prevent the attempt from being recorded.
 */
export type CalledShotsPayload = {
  /** ID of the character making the attack */
  readonly characterId: string;

  /**
   * The declared attack action
   */
  readonly declaredAttack: string;

  /**
   * The called shot target location
   * Examples: "head", "arm", "leg", "weapon", "vital organ"
   *
   * CRITICAL: This is the DECLARED target, not a hit determination.
   * The system does NOT decide if the called shot succeeds.
   */
  readonly calledShotTarget: string;

  /**
   * Target of the attack
   */
  readonly targetId: string;

  /**
   * Weapon used (optional)
   */
  readonly weaponDescription?: string;
};

/**
 * Type guard for CalledShotsPayload
 */
export function isCalledShotsPayload(
  payload: unknown
): payload is CalledShotsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAttack === 'string' &&
    typeof p.calledShotTarget === 'string' &&
    typeof p.targetId === 'string'
  );
}

// ============================================================================
// COST DECLARATIONS (EMITTED REGARDLESS OF OUTCOME)
// ============================================================================

/**
 * Create cost validation for called shot
 *
 * CRITICAL: Cost is emitted regardless of validation outcome.
 * No numeric penalties. No implied extra effort enforcement.
 * The attempt was made - the cost exists.
 */
function createCostValidation(
  declaredAttack: string,
  calledShotTarget: string
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Called shot attack (${declaredAttack}) targeting ${calledShotTarget}`,
    tags: ['action', 'attack', 'called-shot'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Called shot attempt made - action cost applies regardless of difficulty',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for called shot
 *
 * CRITICAL: SoftBlock describes precision requirements.
 * It does NOT suppress effects. It does NOT cancel the attack.
 * The engine records the conflict; it does not compute modifiers.
 */
function createCalledShotConflict(
  calledShotTarget: string
): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_COMBAT_002',
    message: `Called shot declared targeting ${calledShotTarget}. ` +
      'Called shots introduce additional difficulty requiring precision. ' +
      'The system does not compute modifiers. Attack attempt is recorded.',
    tags: ['combat', 'called-shot', 'precision', 'softblock', 'attempt-recorded'],
  };
}

// ============================================================================
// EFFECT EMISSION (REGARDLESS OF OUTCOME)
// ============================================================================

/**
 * Create effects for called shot attack
 *
 * CRITICAL INVARIANT: Effects are emitted REGARDLESS of outcome.
 * FAIL describes legality, not physical reality.
 * The attack was attempted. The called shot targeting was declared.
 */
export function createCalledShotsEffects(
  characterId: string,
  declaredAttack: string,
  calledShotTarget: string,
  targetId: string,
  weaponDescription: string | undefined,
  invocationId: string,
  outcome: RulesOutcome
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the attack attempt
  effects.push({
    effectId: `${invocationId}_attack`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome, // CRITICAL: Effect exists regardless of outcome
    },
    parameters: {
      actionLabel: declaredAttack,
      attackerId: characterId,
      narrativeType: 'attack_attempt',
      weaponDescription: weaponDescription || 'weapon',
      isCalledShot: true,
      attemptRecorded: true,
    },
    description: `Character attempts attack: ${declaredAttack}`,
  });

  // Effect for the called shot targeting
  effects.push({
    effectId: `${invocationId}_called_shot`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome, // CRITICAL: Effect exists regardless of outcome
    },
    parameters: {
      narrativeType: 'called_shot_targeting',
      attackerId: characterId,
      calledShotTarget,
      targetLocation: calledShotTarget,
      attemptRecorded: true,
    },
    description: `Attack was aimed at specific target area: ${calledShotTarget}`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate called shot intent
 *
 * CRITICAL: This function emits FAIL or AMBIGUOUS but STILL emits effects.
 * FAIL does NOT mean "nothing happens."
 * The attack was attempted. The engine records it.
 */
function validateCalledShots(
  payload: CalledShotsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAttack, calledShotTarget } = payload;

  // CRITICAL: Called shots produce FAIL (not PASS)
  // Effects are still emitted
  const violation: RuleViolation = {
    ruleId: 'SW_COMBAT_002',
    message: `Called shot to ${calledShotTarget} introduces additional difficulty. ` +
      `The attack attempt was made and is recorded.`,
    severity: 'WARNING',
  };

  const conflicts: Conflict[] = [
    createCalledShotConflict(calledShotTarget),
  ];

  const costValidation = createCostValidation(declaredAttack, calledShotTarget);

  // Emit FAIL to prove that FAIL does not suppress effects
  return {
    outcome: RulesOutcome.FAIL,
    violations: [violation],
    ambiguity: null,
    conflicts,
    costValidation,
  };
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * Applicability for Called Shots rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const CALLED_SHOTS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['attack', 'called-shot', 'precision']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const CALLED_SHOTS_INTENT_TYPE = 'CALLED_SHOTS' as IntentType;

/**
 * Create the Called Shots rules pipeline
 *
 * CRITICAL: This pipeline can FAIL and still emit effects.
 * FAIL describes legality, not physical reality.
 */
export function createCalledShotsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [CALLED_SHOTS_INTENT_TYPE],
    applicability: CALLED_SHOTS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isCalledShotsPayload(payload)) {
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

      const result = validateCalledShots(payload, invocationId);

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
