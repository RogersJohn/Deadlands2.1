/**
 * Acting in Difficult Terrain Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts an action in difficult terrain.
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

export type ActingInDifficultTerrainPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly terrainType: string;
  readonly isInDifficultTerrain: true;
};

export function isActingInDifficultTerrainPayload(payload: unknown): payload is ActingInDifficultTerrainPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && typeof p.terrainType === 'string' && p.isInDifficultTerrain === true;
}

function createCostValidation(declaredAction: string, terrainType: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action in difficult terrain (${terrainType}): ${declaredAction}`, tags: ['action', 'terrain', 'difficult'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Difficult terrain affects action - system does not quantify impact',
  };
}

function createTerrainConflict(declaredAction: string, terrainType: string): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_POSITION_006',
    message: `Action in difficult terrain (${terrainType}): ${declaredAction}. Terrain affects action. System does not quantify impact.`,
    tags: ['terrain', 'difficult', terrainType, 'no-enforcement'],
  };
}

export function createActingInDifficultTerrainEffects(characterId: string, declaredAction: string, terrainType: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, terrainContext: terrainType },
      description: `Character attempts action in difficult terrain: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_terrain_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'terrain_context', terrainType, impactQuantified: false },
      description: `Difficult terrain (${terrainType}) noted - no impact quantified`,
    },
  ];
}

export const ACTING_IN_DIFFICULT_TERRAIN_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['terrain', 'difficult', 'environment']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const ACTING_IN_DIFFICULT_TERRAIN_INTENT_TYPE = 'ACTING_IN_DIFFICULT_TERRAIN' as IntentType;

export function createActingInDifficultTerrainPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [ACTING_IN_DIFFICULT_TERRAIN_INTENT_TYPE],
    applicability: ACTING_IN_DIFFICULT_TERRAIN_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isActingInDifficultTerrainPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Difficult terrain affects action. System does not quantify impact.',
        possibleInterpretations: [
          { code: 'TERRAIN_NO_IMPACT', resultingOutcome: RulesOutcome.PASS, description: 'Terrain does not hinder action (GM decision)' },
          { code: 'TERRAIN_HINDERS', resultingOutcome: RulesOutcome.FAIL, description: 'Terrain hinders action (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction, payload.terrainType), conflicts: [createTerrainConflict(payload.declaredAction, payload.terrainType)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
