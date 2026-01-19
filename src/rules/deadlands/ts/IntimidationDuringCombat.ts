/**
 * Intimidation During Combat Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts intimidation during combat.
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

export type IntimidationDuringCombatPayload = {
  readonly characterId: string;
  readonly targetId: string;
  readonly intimidationType: string;
  readonly isInCombat: true;
};

export function isIntimidationDuringCombatPayload(payload: unknown): payload is IntimidationDuringCombatPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.targetId === 'string' && typeof p.intimidationType === 'string' && p.isInCombat === true;
}

function createCostValidation(intimidationType: string, targetId: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Intimidation (${intimidationType}) against ${targetId} during combat`, tags: ['action', 'social', 'intimidation', 'combat'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Intimidation during combat - system does not resolve effectiveness',
  };
}

function createIntimidationConflict(intimidationType: string, targetId: string): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_SOCIAL_001',
    message: `Intimidation (${intimidationType}) against ${targetId} during combat. Combat context affects social action. System does not resolve effectiveness.`,
    tags: ['social', 'intimidation', 'combat', 'no-resolution'],
  };
}

export function createIntimidationDuringCombatEffects(characterId: string, targetId: string, intimidationType: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_intimidation`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'intimidation', narrativeType: 'action_attempt', attemptRecorded: true, intimidationType, socialTarget: targetId, combatContext: true },
      description: `Character attempts intimidation during combat: ${intimidationType} against ${targetId}`,
    },
    {
      effectId: `${invocationId}_combat_social_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'social_combat_context', socialActionType: 'intimidation', combatActive: true, effectivenessResolved: false },
      description: 'Combat social context noted - effectiveness not resolved',
    },
  ];
}

export const INTIMIDATION_DURING_COMBAT_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['social', 'intimidation', 'combat']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const INTIMIDATION_DURING_COMBAT_INTENT_TYPE = 'INTIMIDATION_DURING_COMBAT' as IntentType;

export function createIntimidationDuringCombatPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [INTIMIDATION_DURING_COMBAT_INTENT_TYPE],
    applicability: INTIMIDATION_DURING_COMBAT_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isIntimidationDuringCombatPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Intimidation during combat. System does not resolve effectiveness.',
        possibleInterpretations: [
          { code: 'INTIMIDATION_SUCCEEDS', resultingOutcome: RulesOutcome.PASS, description: 'Intimidation succeeds despite combat chaos (GM decision)' },
          { code: 'INTIMIDATION_FAILS', resultingOutcome: RulesOutcome.FAIL, description: 'Combat nullifies intimidation attempt (GM decision)' },
          { code: 'INTIMIDATION_PARTIAL', resultingOutcome: RulesOutcome.PASS, description: 'Partial intimidation effect (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.intimidationType, payload.targetId), conflicts: [createIntimidationConflict(payload.intimidationType, payload.targetId)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
