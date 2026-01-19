/**
 * Temporary Incapacitation Attempt Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an incapacitated actor attempts to act.
 * Incapacitation is noted, not enforced - GM decides if action proceeds.
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

export type TemporaryIncapacitationAttemptPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly isIncapacitated: true;
  readonly incapacitationReason?: string;
};

export function isTemporaryIncapacitationAttemptPayload(payload: unknown): payload is TemporaryIncapacitationAttemptPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && p.isIncapacitated === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while incapacitated: ${declaredAction}`, tags: ['action', 'incapacitated', 'condition'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Incapacitation noted - system does not enforce inability',
  };
}

function createIncapacitationConflict(declaredAction: string, incapacitationReason: string | undefined): Conflict {
  const reasonSuffix = incapacitationReason ? ` (reason: ${incapacitationReason})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_INCAP_001',
    message: `Action while incapacitated: ${declaredAction}${reasonSuffix}. Incapacitation noted. System does not enforce inability.`,
    tags: ['condition', 'incapacitated', 'temporary', 'no-enforcement'],
  };
}

export function createTemporaryIncapacitationAttemptEffects(characterId: string, declaredAction: string, incapacitationReason: string | undefined, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, conditionPresent: 'incapacitated' },
      description: `Character attempts action while incapacitated: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_incapacitation_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'condition_context', condition: 'incapacitated', incapacitationReason: incapacitationReason || 'unspecified', abilityEnforced: false, gmDecisionRequired: true },
      description: 'Incapacitation context noted - ability not enforced',
    },
  ];
}

export const TEMPORARY_INCAPACITATION_ATTEMPT_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['condition', 'incapacitated', 'temporary']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const TEMPORARY_INCAPACITATION_ATTEMPT_INTENT_TYPE = 'TEMPORARY_INCAPACITATION_ATTEMPT' as IntentType;

export function createTemporaryIncapacitationAttemptPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [TEMPORARY_INCAPACITATION_ATTEMPT_INTENT_TYPE],
    applicability: TEMPORARY_INCAPACITATION_ATTEMPT_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isTemporaryIncapacitationAttemptPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Incapacitation noted. System does not enforce inability.',
        possibleInterpretations: [
          { code: 'INCAPACITATION_PREVENTS', resultingOutcome: RulesOutcome.FAIL, description: 'Incapacitation prevents action (GM decision)' },
          { code: 'INCAPACITATION_PARTIAL', resultingOutcome: RulesOutcome.PASS, description: 'Partial action possible despite incapacitation (GM decision)' },
          { code: 'INCAPACITATION_TEMPORARY_LIFT', resultingOutcome: RulesOutcome.PASS, description: 'Temporary lift of incapacitation (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createIncapacitationConflict(payload.declaredAction, payload.incapacitationReason)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
