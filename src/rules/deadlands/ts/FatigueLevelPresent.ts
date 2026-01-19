/**
 * Fatigue Level Present Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor has a fatigue level while acting.
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

export type FatigueLevelPresentPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly fatigueLevel: number;
  readonly hasFatigue: true;
};

export function isFatigueLevelPresentPayload(payload: unknown): payload is FatigueLevelPresentPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && typeof p.fatigueLevel === 'number' && p.hasFatigue === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while fatigued: ${declaredAction}`, tags: ['action', 'fatigue'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Fatigue affects performance - system does not quantify impact',
  };
}

function createFatigueConflict(declaredAction: string, fatigueLevel: number): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_FATIGUE_001',
    message: `Action while fatigued (level ${fatigueLevel}): ${declaredAction}. Fatigue affects performance. System does not quantify impact.`,
    tags: ['condition', 'fatigue', 'no-enforcement'],
  };
}

export function createFatigueLevelPresentEffects(characterId: string, declaredAction: string, fatigueLevel: number, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, fatigueContext: fatigueLevel },
      description: `Character attempts action while fatigued: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_fatigue_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'condition_context', condition: 'fatigue', fatigueLevel, impactQuantified: false },
      description: `Fatigue level ${fatigueLevel} noted - no impact quantified`,
    },
  ];
}

export const FATIGUE_LEVEL_PRESENT_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['condition', 'fatigue']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const FATIGUE_LEVEL_PRESENT_INTENT_TYPE = 'FATIGUE_LEVEL_PRESENT' as IntentType;

export function createFatigueLevelPresentPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [FATIGUE_LEVEL_PRESENT_INTENT_TYPE],
    applicability: FATIGUE_LEVEL_PRESENT_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isFatigueLevelPresentPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Fatigue affects performance. System does not quantify impact.',
        possibleInterpretations: [
          { code: 'FATIGUE_NO_IMPACT', resultingOutcome: RulesOutcome.PASS, description: 'Fatigue does not hinder action (GM decision)' },
          { code: 'FATIGUE_HINDERS', resultingOutcome: RulesOutcome.FAIL, description: 'Fatigue hinders action (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createFatigueConflict(payload.declaredAction, payload.fatigueLevel)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
