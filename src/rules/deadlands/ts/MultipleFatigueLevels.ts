/**
 * Multiple Fatigue Levels Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor has multiple fatigue levels while acting.
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

export type MultipleFatigueLevelsPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly fatigueLevel: number;
  readonly hasMultipleFatigueLevels: true;
};

export function isMultipleFatigueLevelsPayload(payload: unknown): payload is MultipleFatigueLevelsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && typeof p.fatigueLevel === 'number' && p.hasMultipleFatigueLevels === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action with multiple fatigue levels: ${declaredAction}`, tags: ['action', 'fatigue', 'multiple'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Multiple fatigue levels compound - system does not quantify compounding',
  };
}

function createMultipleFatigueConflict(declaredAction: string, fatigueLevel: number): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_FATIGUE_002',
    message: `Action with multiple fatigue levels (${fatigueLevel}): ${declaredAction}. Multiple levels compound. System does not quantify compounding.`,
    tags: ['condition', 'fatigue', 'multiple', 'no-enforcement'],
  };
}

export function createMultipleFatigueLevelsEffects(characterId: string, declaredAction: string, fatigueLevel: number, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, fatigueContext: fatigueLevel },
      description: `Character attempts action with multiple fatigue levels: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_fatigue_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'condition_context', condition: 'fatigue', fatigueLevel, multipleLevels: true, compoundingQuantified: false },
      description: `Multiple fatigue levels (${fatigueLevel}) noted - no compounding quantified`,
    },
  ];
}

export const MULTIPLE_FATIGUE_LEVELS_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['condition', 'fatigue', 'multiple']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const MULTIPLE_FATIGUE_LEVELS_INTENT_TYPE = 'MULTIPLE_FATIGUE_LEVELS' as IntentType;

export function createMultipleFatigueLevelsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [MULTIPLE_FATIGUE_LEVELS_INTENT_TYPE],
    applicability: MULTIPLE_FATIGUE_LEVELS_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isMultipleFatigueLevelsPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Multiple fatigue levels compound. System does not quantify compounding.',
        possibleInterpretations: [
          { code: 'FATIGUE_MANAGEABLE', resultingOutcome: RulesOutcome.PASS, description: 'Multiple fatigue manageable (GM decision)' },
          { code: 'FATIGUE_OVERWHELMING', resultingOutcome: RulesOutcome.FAIL, description: 'Multiple fatigue overwhelming (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createMultipleFatigueConflict(payload.declaredAction, payload.fatigueLevel)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
