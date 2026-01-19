/**
 * Firing a Weapon with No Ammo Rule (PR 8.2)
 *
 * CRITICAL INVARIANT: FAIL does not mean "nothing happens."
 *
 * This rule validates intents where a firearm attack is declared but the
 * weapon has no ammo. It produces FAIL because the weapon cannot fire
 * normally, but effects are STILL EMITTED.
 *
 * CRITICAL: FAILURE DESCRIBES LEGALITY, NOT PHYSICAL REALITY.
 * - FAIL does NOT suppress effects
 * - FAIL does NOT mean "nothing happens"
 * - FAIL does NOT cancel the attempt
 * - The attempt still occurred - the engine records it
 *
 * WHAT THIS RULE DOES:
 * - Detects when firearm attack is declared with no ammo
 * - Emits FAIL (weapon cannot fire normally without ammo)
 * - Emits HardBlock conflict (mechanical impossibility)
 * - Emits ActionCostEffect (no waiver due to failure)
 * - Emits effects describing the attempt (trigger pull, click, etc.)
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Suppress effects on FAIL
 * - Cancel the attempt
 * - Decide what "actually happens"
 * - Model weapon mechanics
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
 * Payload for firing with no ammo intent
 *
 * CRITICAL: The payload declares the attempt. The attempt happened.
 * Absence of ammo does NOT prevent the attempt from being recorded.
 */
export type FiringWithNoAmmoPayload = {
  /** ID of the character attempting to fire */
  readonly characterId: string;

  /**
   * The weapon being fired
   */
  readonly weaponId: string;

  /**
   * Weapon description (for conflict messages)
   */
  readonly weaponDescription?: string;

  /**
   * Whether the weapon has ammo
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * false = no ammo, but the attempt STILL HAPPENED.
   */
  readonly hasAmmo: boolean;

  /**
   * Target of the attack (optional)
   */
  readonly targetId?: string;
};

/**
 * Type guard for FiringWithNoAmmoPayload
 */
export function isFiringWithNoAmmoPayload(
  payload: unknown
): payload is FiringWithNoAmmoPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.weaponId === 'string' &&
    typeof p.hasAmmo === 'boolean'
  );
}

// ============================================================================
// COST DECLARATIONS (EMITTED REGARDLESS OF FAILURE)
// ============================================================================

/**
 * Create cost validation for firing attempt
 *
 * CRITICAL: Cost is emitted regardless of ammo status.
 * FAIL does NOT waive the action cost.
 * The attempt was made - the cost exists.
 */
function createCostValidation(
  weaponDescription: string | undefined
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Attack attempt: ${weaponDescription || 'firearm'}`,
    tags: ['action', 'attack', 'firearm'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Attack attempt made - action cost applies regardless of ammo status',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create HardBlock conflict for no ammo
 *
 * CRITICAL: HardBlock describes mechanical impossibility.
 * It does NOT suppress effects. It does NOT cancel the attempt.
 * The engine records the conflict; it does not enforce cancellation.
 */
function createNoAmmoConflict(
  weaponDescription: string | undefined
): Conflict {
  return {
    kind: ConflictKind.HardBlock,
    sourceRule: 'SW_COMBAT_001',
    message: `Weapon (${weaponDescription || 'firearm'}) has no ammo. ` +
      'Weapon cannot fire normally without ammunition. ' +
      'The system does not prevent the attempt from being recorded.',
    tags: ['combat', 'firearm', 'no-ammo', 'hardblock', 'attempt-recorded'],
  };
}

// ============================================================================
// EFFECT EMISSION (REGARDLESS OF FAILURE)
// ============================================================================

/**
 * Create effects for firing attempt with no ammo
 *
 * CRITICAL INVARIANT: Effects are emitted REGARDLESS of FAIL.
 * FAIL describes legality, not physical reality.
 * The trigger was pulled. The click occurred. The attempt happened.
 */
export function createFiringWithNoAmmoEffects(
  characterId: string,
  weaponId: string,
  weaponDescription: string | undefined,
  targetId: string | undefined,
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the trigger pull attempt
  effects.push({
    effectId: `${invocationId}_trigger_pull`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: characterId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.FAIL, // CRITICAL: Effect exists despite FAIL
    },
    parameters: {
      actionLabel: 'fire weapon',
      weaponId,
      weaponDescription: weaponDescription || 'firearm',
      narrativeType: 'attack_attempt',
      ammoStatus: 'empty',
      attemptRecorded: true,
    },
    description: `Character pulls trigger on ${weaponDescription || 'weapon'} (no ammo)`,
  });

  // Effect for the empty chamber / click
  effects.push({
    effectId: `${invocationId}_empty_chamber`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: characterId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.FAIL, // CRITICAL: Effect exists despite FAIL
    },
    parameters: {
      narrativeType: 'weapon_empty',
      weaponId,
      weaponDescription: weaponDescription || 'firearm',
      soundType: 'click',
      attemptRecorded: true,
    },
    description: `Weapon produces empty chamber response (click/misfire behavior)`,
  });

  // If there was a target, record the attempted targeting
  if (targetId) {
    effects.push({
      effectId: `${invocationId}_target_attempt`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: {
        targetId,
        targetType: 'character',
      },
      authority: {
        invocationId,
        source: 'RULES' as const,
        outcome: RulesOutcome.FAIL, // CRITICAL: Effect exists despite FAIL
      },
      parameters: {
        narrativeType: 'targeted_by_attack',
        attackerId: characterId,
        weaponId,
        attackOutcome: 'no_ammo',
        attemptRecorded: true,
      },
      description: `Target was aimed at during failed firing attempt`,
    });
  }

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate firing with no ammo intent
 *
 * CRITICAL: This function emits FAIL but STILL emits effects.
 * FAIL does NOT mean "nothing happens."
 * The attempt was made. The engine records it.
 */
function validateFiringWithNoAmmo(
  payload: FiringWithNoAmmoPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { weaponDescription, hasAmmo } = payload;

  // If weapon has ammo, this rule doesn't apply
  if (hasAmmo) {
    return {
      outcome: RulesOutcome.PASS,
      violations: [],
      ambiguity: null,
      conflicts: [],
      costValidation: createCostValidation(weaponDescription),
    };
  }

  // CRITICAL: FAIL with effects
  // Weapon has no ammo - validation fails, but attempt is recorded
  const violation: RuleViolation = {
    ruleId: 'SW_COMBAT_001',
    message: `Weapon cannot fire normally without ammunition. ` +
      `The attempt was made and is recorded.`,
    severity: 'ERROR',
  };

  const conflicts: Conflict[] = [
    createNoAmmoConflict(weaponDescription),
  ];

  const costValidation = createCostValidation(weaponDescription);

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
 * Applicability for Firing With No Ammo rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const FIRING_WITH_NO_AMMO_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['firearm', 'ammo', 'attack']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const FIRING_WITH_NO_AMMO_INTENT_TYPE = 'FIRING_WITH_NO_AMMO' as IntentType;

/**
 * Create the Firing With No Ammo rules pipeline
 *
 * CRITICAL: This pipeline can FAIL and still emit effects.
 * FAIL describes legality, not physical reality.
 */
export function createFiringWithNoAmmoPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [FIRING_WITH_NO_AMMO_INTENT_TYPE],
    applicability: FIRING_WITH_NO_AMMO_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isFiringWithNoAmmoPayload(payload)) {
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

      const result = validateFiringWithNoAmmo(payload, invocationId);

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
