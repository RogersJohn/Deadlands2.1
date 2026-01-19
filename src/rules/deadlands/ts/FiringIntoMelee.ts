/**
 * Firing Into Melee Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor fires into a melee engagement.
 */

import type { ValidatedIntent, IntentType } from '../../../intent/bridge/ts/ValidatedIntent';
import type {
  InvocationId, RulesPipeline, RulesetId, RuleViolation, ValidationReport,
  Conflict, RulesAmbiguity,
} from '../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome, ConflictKind } from '../../../intent/bridge/ts/RulesPipeline';
import type { CostValidationResult, ActionCostEffect, Effect } from '../../../resolution/ts/types';
import { CostValidationOutcome, EffectType } from '../../../resolution/ts/types';
import type { RuleApplicability } from '../../applicability/ts/types';
import { createRuleApplicability } from '../../applicability/ts/types';

export type FiringIntoMeleePayload = {
  readonly characterId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly meleeParticipants: readonly string[];
  readonly isFiringIntoMelee: true;
};

export function isFiringIntoMeleePayload(payload: unknown): payload is FiringIntoMeleePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.targetId === 'string' && typeof p.weaponId === 'string' && Array.isArray(p.meleeParticipants) && p.isFiringIntoMelee === true;
}

function createCostValidation(targetId: string, weaponId: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Firing ${weaponId} into melee at ${targetId}`, tags: ['action', 'ranged', 'melee', 'firing-into-melee'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Firing into melee - system does not resolve hit allocation',
  };
}

function createFiringIntoMeleeConflict(targetId: string, meleeParticipants: readonly string[]): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_RANGED_006',
    message: `Firing into melee targeting ${targetId}. ${meleeParticipants.length} participants in melee. System does not resolve hit allocation.`,
    tags: ['ranged', 'melee', 'firing-into-melee', 'friendly-fire-risk', 'no-resolution'],
  };
}

export function createFiringIntoMeleeEffects(characterId: string, targetId: string, weaponId: string, meleeParticipants: readonly string[], invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_fire`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'ranged_attack', narrativeType: 'action_attempt', attemptRecorded: true, weaponId, intendedTarget: targetId, firingIntoMelee: true },
      description: `Character fires into melee: ${weaponId} at ${targetId}`,
    },
    {
      effectId: `${invocationId}_melee_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'combat_risk_context', riskType: 'firing-into-melee', meleeParticipants, participantCount: meleeParticipants.length, hitAllocationResolved: false },
      description: `Firing into melee context noted - ${meleeParticipants.length} participants, hit allocation not resolved`,
    },
  ];
}

export const FIRING_INTO_MELEE_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['ranged', 'melee', 'risk']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const FIRING_INTO_MELEE_INTENT_TYPE = 'FIRING_INTO_MELEE' as IntentType;

export function createFiringIntoMeleePipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [FIRING_INTO_MELEE_INTENT_TYPE],
    applicability: FIRING_INTO_MELEE_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isFiringIntoMeleePayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Firing into melee. System does not resolve hit allocation.',
        possibleInterpretations: [
          { code: 'SHOT_HITS_TARGET', resultingOutcome: RulesOutcome.PASS, description: 'Shot hits intended target (GM decision)' },
          { code: 'SHOT_HITS_ALLY', resultingOutcome: RulesOutcome.FAIL, description: 'Shot hits ally in melee (GM decision)' },
          { code: 'SHOT_MISSES', resultingOutcome: RulesOutcome.FAIL, description: 'Shot misses entirely (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.targetId, payload.weaponId), conflicts: [createFiringIntoMeleeConflict(payload.targetId, payload.meleeParticipants)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
