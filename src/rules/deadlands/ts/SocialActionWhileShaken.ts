/**
 * Social Action While Shaken Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that a shaken actor attempts a social action.
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

export type SocialActionWhileShakenPayload = {
  readonly characterId: string;
  readonly targetId: string;
  readonly socialActionType: string;
  readonly isShaken: true;
};

export function isSocialActionWhileShakenPayload(payload: unknown): payload is SocialActionWhileShakenPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.targetId === 'string' && typeof p.socialActionType === 'string' && p.isShaken === true;
}

function createCostValidation(socialActionType: string, targetId: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Social action (${socialActionType}) against ${targetId} while shaken`, tags: ['action', 'social', socialActionType, 'shaken'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Social action while shaken - system does not resolve impact',
  };
}

function createSocialActionConflict(socialActionType: string, targetId: string): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_SOCIAL_004',
    message: `Social action (${socialActionType}) against ${targetId} while shaken. Shaken condition affects composure. System does not resolve impact.`,
    tags: ['social', socialActionType, 'shaken', 'composure', 'no-resolution'],
  };
}

export function createSocialActionWhileShakenEffects(characterId: string, targetId: string, socialActionType: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_social_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: socialActionType, narrativeType: 'action_attempt', attemptRecorded: true, socialTarget: targetId, conditionPresent: 'shaken' },
      description: `Character attempts social action while shaken: ${socialActionType} against ${targetId}`,
    },
    {
      effectId: `${invocationId}_shaken_social_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'condition_social_context', condition: 'shaken', socialActionType, impactResolved: false, composureAffected: true },
      description: 'Shaken social context noted - impact not resolved',
    },
  ];
}

export const SOCIAL_ACTION_WHILE_SHAKEN_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['social', 'shaken', 'condition']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const SOCIAL_ACTION_WHILE_SHAKEN_INTENT_TYPE = 'SOCIAL_ACTION_WHILE_SHAKEN' as IntentType;

export function createSocialActionWhileShakenPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [SOCIAL_ACTION_WHILE_SHAKEN_INTENT_TYPE],
    applicability: SOCIAL_ACTION_WHILE_SHAKEN_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isSocialActionWhileShakenPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Social action while shaken. System does not resolve impact.',
        possibleInterpretations: [
          { code: 'SOCIAL_SUCCEEDS', resultingOutcome: RulesOutcome.PASS, description: 'Social action succeeds despite shaken (GM decision)' },
          { code: 'SOCIAL_FAILS', resultingOutcome: RulesOutcome.FAIL, description: 'Shaken undermines social action (GM decision)' },
          { code: 'SOCIAL_COMPROMISED', resultingOutcome: RulesOutcome.PASS, description: 'Social action compromised but proceeds (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.socialActionType, payload.targetId), conflicts: [createSocialActionConflict(payload.socialActionType, payload.targetId)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
