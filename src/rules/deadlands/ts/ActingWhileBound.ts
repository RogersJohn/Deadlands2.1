/**
 * Acting While Bound Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts an action while bound.
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

export type ActingWhileBoundPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly isBound: true;
  readonly bindingType?: string;
};

export function isActingWhileBoundPayload(payload: unknown): payload is ActingWhileBoundPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && p.isBound === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while bound: ${declaredAction}`, tags: ['action', 'bound', 'restrained'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Binding severely restricts action - system does not enforce restrictions',
  };
}

function createBoundConflict(declaredAction: string, bindingType: string | undefined): Conflict {
  const typeSuffix = bindingType ? ` (${bindingType})` : '';
  return {
    kind: ConflictKind.HardBlock,
    sourceRule: 'SW_POSITION_005',
    message: `Action while bound${typeSuffix}: ${declaredAction}. Binding severely restricts action. System does not enforce restrictions.`,
    tags: ['condition', 'bound', 'restrained', 'severe', 'no-enforcement'],
  };
}

export function createActingWhileBoundEffects(characterId: string, declaredAction: string, bindingType: string | undefined, invocationId: string, outcome: RulesOutcome): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, conditionContext: 'bound' },
      description: `Character attempts action while bound: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_bound_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome },
      parameters: { narrativeType: 'condition_context', condition: 'bound', bindingType: bindingType || 'unspecified', restrictionEnforced: false },
      description: 'Bound context noted - no restriction enforced',
    },
  ];
}

export const ACTING_WHILE_BOUND_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['condition', 'bound', 'restrained']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const ACTING_WHILE_BOUND_INTENT_TYPE = 'ACTING_WHILE_BOUND' as IntentType;

export function createActingWhileBoundPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [ACTING_WHILE_BOUND_INTENT_TYPE],
    applicability: ACTING_WHILE_BOUND_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isActingWhileBoundPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const violation: RuleViolation = {
        ruleId: 'SW_POSITION_005',
        message: `Action attempted while bound: ${payload.declaredAction}. Binding severely restricts action.`,
        severity: 'WARNING',
      };
      const ambiguity: RulesAmbiguity = {
        reason: 'Binding severely restricts action. System does not enforce restrictions.',
        possibleInterpretations: [
          { code: 'BINDING_ALLOWS', resultingOutcome: RulesOutcome.PASS, description: 'Binding allows limited action (GM decision)' },
          { code: 'BINDING_PREVENTS', resultingOutcome: RulesOutcome.FAIL, description: 'Binding prevents action (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.FAIL, violations: [violation], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createBoundConflict(payload.declaredAction, payload.bindingType)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
