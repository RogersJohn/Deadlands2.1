/**
 * Cover vs Concealment Rule (PR 8.2)
 *
 * CRITICAL INVARIANT: FAIL does not mean "nothing happens."
 *
 * This rule validates intents where an attack is made against a target
 * with cover or concealment. It produces AMBIGUOUS because line of effect
 * is contested, but the attack attempt is STILL recorded and effects STILL emit.
 *
 * CRITICAL: FAILURE DESCRIBES LEGALITY, NOT PHYSICAL REALITY.
 * - AMBIGUOUS does NOT suppress effects
 * - Cover does NOT prevent the attempt from occurring
 * - The attack attempt still happened - the engine records it
 *
 * WHAT THIS RULE DOES:
 * - Detects when attack targets someone with cover/concealment
 * - Emits AMBIGUOUS (line of effect is contested)
 * - Emits SoftBlock conflict (obstruction/obscuration)
 * - Emits ActionCostEffect (no modifiers, no math)
 * - Emits attack effects AND obstruction indicator effect
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Suppress effects
 * - Compute hit probability
 * - Apply cover modifiers
 * - Decide hit/miss
 * - Reduce damage
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
 * Payload for cover vs concealment intent
 *
 * CRITICAL: The payload declares the attack attempt against an obstructed target.
 * The attack happened. Cover does NOT prevent the attempt from being recorded.
 */
export type CoverVsConcealmentPayload = {
  /** ID of the character making the attack */
  readonly characterId: string;

  /**
   * The declared attack action
   */
  readonly declaredAttack: string;

  /**
   * Target of the attack
   */
  readonly targetId: string;

  /**
   * Target's obstruction status
   *
   * - 'cover': Physical obstruction that could block attacks
   * - 'concealment': Visual obscuration that makes targeting difficult
   * - 'both': Both cover and concealment
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The system does NOT adjudicate hit probability.
   */
  readonly obstructionType: 'cover' | 'concealment' | 'both';

  /**
   * Description of the obstruction (optional)
   * Examples: "behind stone wall", "in dense fog", "partial barricade"
   */
  readonly obstructionDescription?: string;

  /**
   * Weapon used (optional)
   */
  readonly weaponDescription?: string;
};

/**
 * Type guard for CoverVsConcealmentPayload
 */
export function isCoverVsConcealmentPayload(
  payload: unknown
): payload is CoverVsConcealmentPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.declaredAttack === 'string' &&
    typeof p.targetId === 'string' &&
    (p.obstructionType === 'cover' || p.obstructionType === 'concealment' || p.obstructionType === 'both')
  );
}

// ============================================================================
// COST DECLARATIONS (EMITTED REGARDLESS OF OUTCOME)
// ============================================================================

/**
 * Create cost validation for attack against obstructed target
 *
 * CRITICAL: Cost is emitted regardless of cover status.
 * No modifiers. No math.
 * The attempt was made - the cost exists.
 */
function createCostValidation(
  declaredAttack: string,
  obstructionType: 'cover' | 'concealment' | 'both'
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Attack (${declaredAttack}) against target with ${obstructionType}`,
    tags: ['action', 'attack', obstructionType],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: `Attack attempt against obstructed target - action cost applies regardless of ${obstructionType}`,
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for cover/concealment
 *
 * CRITICAL: SoftBlock describes obstruction.
 * It does NOT suppress effects. It does NOT cancel the attack.
 * The engine records the conflict; it does not adjudicate hit probability.
 */
function createObstructionConflict(
  obstructionType: 'cover' | 'concealment' | 'both',
  obstructionDescription: string | undefined
): Conflict {
  const descSuffix = obstructionDescription ? ` (${obstructionDescription})` : '';
  const obstructionLabel = obstructionType === 'both' ? 'cover and concealment' : obstructionType;

  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_COMBAT_003',
    message: `Target has ${obstructionLabel}${descSuffix}. ` +
      'Line of effect is contested. ' +
      'The system does not adjudicate hit probability. Attack attempt is recorded.',
    tags: ['combat', obstructionType, 'obstruction', 'softblock', 'attempt-recorded'],
  };
}

// ============================================================================
// EFFECT EMISSION (REGARDLESS OF OUTCOME)
// ============================================================================

/**
 * Create effects for attack against obstructed target
 *
 * CRITICAL INVARIANT: Effects are emitted REGARDLESS of outcome.
 * Cover does NOT prevent the attempt from occurring.
 * The attack was made. The obstruction was noted.
 */
export function createCoverVsConcealmentEffects(
  characterId: string,
  declaredAttack: string,
  targetId: string,
  obstructionType: 'cover' | 'concealment' | 'both',
  obstructionDescription: string | undefined,
  weaponDescription: string | undefined,
  invocationId: string
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
      outcome: RulesOutcome.AMBIGUOUS, // CRITICAL: Effect exists despite AMBIGUOUS
    },
    parameters: {
      actionLabel: declaredAttack,
      attackerId: characterId,
      narrativeType: 'attack_attempt',
      weaponDescription: weaponDescription || 'weapon',
      targetObstructed: true,
      attemptRecorded: true,
    },
    description: `Character attempts attack: ${declaredAttack} (target obstructed)`,
  });

  // Effect indicating attack was made against partially obstructed target
  effects.push({
    effectId: `${invocationId}_obstruction`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.AMBIGUOUS, // CRITICAL: Effect exists despite AMBIGUOUS
    },
    parameters: {
      narrativeType: 'obstructed_target',
      attackerId: characterId,
      obstructionType,
      obstructionDescription: obstructionDescription || 'obstruction present',
      lineOfEffectContested: true,
      attemptRecorded: true,
    },
    description: `Attack made against target with ${obstructionType}`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate cover vs concealment intent
 *
 * CRITICAL: This function emits AMBIGUOUS but STILL emits effects.
 * Cover does NOT prevent the attack attempt from being recorded.
 * The attack happened. The engine records it.
 */
function validateCoverVsConcealment(
  payload: CoverVsConcealmentPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { declaredAttack, obstructionType, obstructionDescription } = payload;

  // CRITICAL: AMBIGUOUS because line of effect is contested
  // Effects are still emitted
  const ambiguity: RulesAmbiguity = {
    reason: `Line of effect is contested due to ${obstructionType}. ` +
      'The system does not adjudicate hit probability. ' +
      'The attack attempt is recorded.',
    possibleInterpretations: [
      {
        code: 'ATTACK_CONNECTS',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Attack connects despite obstruction (GM decision)',
      },
      {
        code: 'OBSTRUCTION_BLOCKS',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Obstruction blocks the attack (GM decision)',
      },
      {
        code: 'PARTIAL_EFFECT',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Attack has partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createObstructionConflict(obstructionType, obstructionDescription),
  ];

  const costValidation = createCostValidation(declaredAttack, obstructionType);

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
 * Applicability for Cover vs Concealment rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const COVER_VS_CONCEALMENT_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['attack', 'cover', 'concealment', 'obstruction']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const COVER_VS_CONCEALMENT_INTENT_TYPE = 'COVER_VS_CONCEALMENT' as IntentType;

/**
 * Create the Cover vs Concealment rules pipeline
 *
 * CRITICAL: This pipeline emits AMBIGUOUS and still emits effects.
 * Cover does NOT prevent the attack attempt from occurring.
 */
export function createCoverVsConcealmentPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [COVER_VS_CONCEALMENT_INTENT_TYPE],
    applicability: COVER_VS_CONCEALMENT_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isCoverVsConcealmentPayload(payload)) {
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

      const result = validateCoverVsConcealment(payload, invocationId);

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
