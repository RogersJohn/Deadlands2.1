/**
 * Acting While Exhausted Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an exhausted actor attempts an action.
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

export type ActingWhileExhaustedPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly isExhausted: true;
  readonly exhaustionSource?: string;
};

export function isActingWhileExhaustedPayload(payload: unknown): payload is ActingWhileExhaustedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && p.isExhausted === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while exhausted: ${declaredAction}`, tags: ['action', 'exhausted', 'condition'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Exhaustion severely limits capacity - system does not quantify impact',
  };
}

function createExhaustedConflict(declaredAction: string, exhaustionSource: string | undefined): Conflict {
  const sourceSuffix = exhaustionSource ? ` (source: ${exhaustionSource})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_FATIGUE_004',
    message: `Action while exhausted: ${declaredAction}${sourceSuffix}. Exhaustion severely limits capacity. System does not quantify impact.`,
    tags: ['condition', 'exhausted', 'fatigue', 'severe', 'no-quantification'],
  };
}

export function createActingWhileExhaustedEffects(characterId: string, declaredAction: string, exhaustionSource: string | undefined, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, conditionPresent: 'exhausted' },
      description: `Character attempts action while exhausted: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_exhaustion_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'condition_context', condition: 'exhausted', exhaustionSource: exhaustionSource || 'unspecified', impactQuantified: false, severityLevel: 'severe' },
      description: 'Exhaustion context noted - no impact quantified',
    },
  ];
}

export const ACTING_WHILE_EXHAUSTED_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['condition', 'exhausted', 'fatigue']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const ACTING_WHILE_EXHAUSTED_INTENT_TYPE = 'ACTING_WHILE_EXHAUSTED' as IntentType;

export function createActingWhileExhaustedPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [ACTING_WHILE_EXHAUSTED_INTENT_TYPE],
    applicability: ACTING_WHILE_EXHAUSTED_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isActingWhileExhaustedPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Exhaustion severely limits capacity. System does not quantify impact.',
        possibleInterpretations: [
          { code: 'EXHAUSTION_MANAGEABLE', resultingOutcome: RulesOutcome.PASS, description: 'Exhaustion manageable for this action (GM decision)' },
          { code: 'EXHAUSTION_OVERWHELMING', resultingOutcome: RulesOutcome.FAIL, description: 'Exhaustion overwhelms action attempt (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createExhaustedConflict(payload.declaredAction, payload.exhaustionSource)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
