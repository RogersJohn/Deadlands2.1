/**
 * Using Improvised Weapon Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor uses an improvised weapon.
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

export type UsingImprovisedWeaponPayload = {
  readonly characterId: string;
  readonly targetId: string;
  readonly improvisedItem: string;
  readonly isImprovised: true;
};

export function isUsingImprovisedWeaponPayload(payload: unknown): payload is UsingImprovisedWeaponPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.targetId === 'string' && typeof p.improvisedItem === 'string' && p.isImprovised === true;
}

function createCostValidation(improvisedItem: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Using improvised weapon: ${improvisedItem}`, tags: ['action', 'attack', 'improvised', 'weapon'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Improvised weapon usage - system does not quantify effectiveness',
  };
}

function createImprovisedWeaponConflict(improvisedItem: string, targetId: string): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_COMBAT_007',
    message: `Using improvised weapon (${improvisedItem}) against ${targetId}. Item not designed as weapon. System does not quantify effectiveness.`,
    tags: ['combat', 'improvised', 'weapon', 'no-quantification'],
  };
}

export function createUsingImprovisedWeaponEffects(characterId: string, targetId: string, improvisedItem: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_attack`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'attack', narrativeType: 'action_attempt', attemptRecorded: true, improvisedItem, attackTarget: targetId, weaponType: 'improvised' },
      description: `Character attacks with improvised weapon: ${improvisedItem} against ${targetId}`,
    },
    {
      effectId: `${invocationId}_improvised_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'equipment_context', equipmentType: 'improvised-weapon', item: improvisedItem, effectivenessQuantified: false, designedAsWeapon: false },
      description: `Improvised weapon context noted - ${improvisedItem} effectiveness not quantified`,
    },
  ];
}

export const USING_IMPROVISED_WEAPON_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['combat', 'improvised', 'weapon']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const USING_IMPROVISED_WEAPON_INTENT_TYPE = 'USING_IMPROVISED_WEAPON' as IntentType;

export function createUsingImprovisedWeaponPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [USING_IMPROVISED_WEAPON_INTENT_TYPE],
    applicability: USING_IMPROVISED_WEAPON_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isUsingImprovisedWeaponPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Improvised weapon usage. System does not quantify effectiveness.',
        possibleInterpretations: [
          { code: 'IMPROVISED_EFFECTIVE', resultingOutcome: RulesOutcome.PASS, description: 'Improvised weapon proves effective (GM decision)' },
          { code: 'IMPROVISED_INEFFECTIVE', resultingOutcome: RulesOutcome.FAIL, description: 'Improvised weapon proves ineffective (GM decision)' },
          { code: 'IMPROVISED_BREAKS', resultingOutcome: RulesOutcome.FAIL, description: 'Improvised weapon breaks on use (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.improvisedItem), conflicts: [createImprovisedWeaponConflict(payload.improvisedItem, payload.targetId)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
