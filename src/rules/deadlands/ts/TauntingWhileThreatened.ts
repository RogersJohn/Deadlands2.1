/**
 * Taunting While Threatened Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts to taunt while threatened.
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

export type TauntingWhileThreatenedPayload = {
  readonly characterId: string;
  readonly targetId: string;
  readonly tauntDescription?: string;
  readonly isThreatened: true;
};

export function isTauntingWhileThreatenedPayload(payload: unknown): payload is TauntingWhileThreatenedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.targetId === 'string' && p.isThreatened === true;
}

function createCostValidation(targetId: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Taunting ${targetId} while threatened`, tags: ['action', 'social', 'taunt', 'threatened'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Taunting while threatened - system does not resolve outcome',
  };
}

function createTauntingConflict(targetId: string, tauntDescription: string | undefined): Conflict {
  const tauntSuffix = tauntDescription ? ` ("${tauntDescription}")` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_SOCIAL_002',
    message: `Taunting ${targetId} while threatened${tauntSuffix}. Threat context affects delivery. System does not resolve outcome.`,
    tags: ['social', 'taunt', 'threatened', 'no-resolution'],
  };
}

export function createTauntingWhileThreatenedEffects(characterId: string, targetId: string, tauntDescription: string | undefined, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_taunt`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'taunt', narrativeType: 'action_attempt', attemptRecorded: true, tauntDescription: tauntDescription || 'unspecified', socialTarget: targetId, threatenedContext: true },
      description: `Character attempts taunt while threatened: against ${targetId}`,
    },
    {
      effectId: `${invocationId}_threat_social_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'social_pressure_context', socialActionType: 'taunt', pressureType: 'threatened', outcomeResolved: false },
      description: 'Threat social context noted - outcome not resolved',
    },
  ];
}

export const TAUNTING_WHILE_THREATENED_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['social', 'taunt', 'pressure']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const TAUNTING_WHILE_THREATENED_INTENT_TYPE = 'TAUNTING_WHILE_THREATENED' as IntentType;

export function createTauntingWhileThreatenedPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [TAUNTING_WHILE_THREATENED_INTENT_TYPE],
    applicability: TAUNTING_WHILE_THREATENED_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isTauntingWhileThreatenedPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Taunting while threatened. System does not resolve outcome.',
        possibleInterpretations: [
          { code: 'TAUNT_LANDS', resultingOutcome: RulesOutcome.PASS, description: 'Taunt lands despite threat (GM decision)' },
          { code: 'TAUNT_BACKFIRES', resultingOutcome: RulesOutcome.FAIL, description: 'Threat undermines taunt (GM decision)' },
          { code: 'TAUNT_PROVOKES', resultingOutcome: RulesOutcome.PASS, description: 'Taunt provokes dangerous response (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.targetId), conflicts: [createTauntingConflict(payload.targetId, payload.tauntDescription)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
