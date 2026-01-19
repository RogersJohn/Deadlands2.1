/**
 * Acting While Entangled Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts an action while entangled.
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

export type ActingWhileEntangledPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly isEntangled: true;
  readonly entanglementSource?: string;
};

export function isActingWhileEntangledPayload(payload: unknown): payload is ActingWhileEntangledPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && p.isEntangled === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while entangled: ${declaredAction}`, tags: ['action', 'entangled', 'restrained'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Entanglement restricts movement - system does not enforce restrictions',
  };
}

function createEntangledConflict(declaredAction: string, source: string | undefined): Conflict {
  const sourceSuffix = source ? ` (${source})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_POSITION_004',
    message: `Action while entangled${sourceSuffix}: ${declaredAction}. Entanglement restricts movement. System does not enforce restrictions.`,
    tags: ['condition', 'entangled', 'restrained', 'no-enforcement'],
  };
}

export function createActingWhileEntangledEffects(characterId: string, declaredAction: string, source: string | undefined, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, conditionContext: 'entangled' },
      description: `Character attempts action while entangled: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_entangled_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'condition_context', condition: 'entangled', entanglementSource: source || 'unspecified', restrictionEnforced: false },
      description: 'Entanglement context noted - no restriction enforced',
    },
  ];
}

export const ACTING_WHILE_ENTANGLED_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['condition', 'entangled', 'restrained']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const ACTING_WHILE_ENTANGLED_INTENT_TYPE = 'ACTING_WHILE_ENTANGLED' as IntentType;

export function createActingWhileEntangledPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [ACTING_WHILE_ENTANGLED_INTENT_TYPE],
    applicability: ACTING_WHILE_ENTANGLED_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isActingWhileEntangledPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Entanglement restricts movement. System does not enforce restrictions.',
        possibleInterpretations: [
          { code: 'ENTANGLEMENT_NO_IMPACT', resultingOutcome: RulesOutcome.PASS, description: 'Entanglement does not prevent action (GM decision)' },
          { code: 'ENTANGLEMENT_PREVENTS', resultingOutcome: RulesOutcome.FAIL, description: 'Entanglement prevents action (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createEntangledConflict(payload.declaredAction, payload.entanglementSource)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
