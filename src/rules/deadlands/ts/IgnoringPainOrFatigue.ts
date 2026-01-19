/**
 * Ignoring Pain or Fatigue Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts to ignore pain or fatigue to act.
 * The attempt is recorded - GM decides outcome.
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

export type IgnoringPainOrFatiguePayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly ignoringPain: boolean;
  readonly ignoringFatigue: boolean;
  readonly painSource?: string;
  readonly fatigueLevel?: number;
};

export function isIgnoringPainOrFatiguePayload(payload: unknown): payload is IgnoringPainOrFatiguePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && (p.ignoringPain === true || p.ignoringFatigue === true);
}

function createCostValidation(declaredAction: string, ignoringPain: boolean, ignoringFatigue: boolean): CostValidationResult {
  const ignoring = [ignoringPain ? 'pain' : null, ignoringFatigue ? 'fatigue' : null].filter(Boolean).join(' and ');
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while ignoring ${ignoring}: ${declaredAction}`, tags: ['action', 'ignoring', 'willpower', ...(ignoringPain ? ['pain'] : []), ...(ignoringFatigue ? ['fatigue'] : [])] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: `Attempting to ignore ${ignoring} - system does not resolve success`,
  };
}

function createIgnoringConflict(declaredAction: string, ignoringPain: boolean, ignoringFatigue: boolean): Conflict {
  const ignoring = [ignoringPain ? 'pain' : null, ignoringFatigue ? 'fatigue' : null].filter(Boolean).join(' and ');
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_WILLPOWER_001',
    message: `Action while ignoring ${ignoring}: ${declaredAction}. Willpower attempt noted. System does not resolve success.`,
    tags: ['willpower', 'ignoring', ...(ignoringPain ? ['pain'] : []), ...(ignoringFatigue ? ['fatigue'] : []), 'no-resolution'],
  };
}

export function createIgnoringPainOrFatigueEffects(characterId: string, declaredAction: string, ignoringPain: boolean, ignoringFatigue: boolean, painSource: string | undefined, fatigueLevel: number | undefined, invocationId: string): Effect[] {
  const ignoring = [ignoringPain ? 'pain' : null, ignoringFatigue ? 'fatigue' : null].filter(Boolean).join(' and ');
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, willpowerAttempt: true, ignoring },
      description: `Character attempts action while ignoring ${ignoring}: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_ignoring_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'willpower_context', ignoringPain, ignoringFatigue, painSource: painSource || 'unspecified', fatigueLevel: fatigueLevel ?? 0, successResolved: false },
      description: `Ignoring ${ignoring} context noted - success not resolved`,
    },
  ];
}

export const IGNORING_PAIN_OR_FATIGUE_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['willpower', 'pain', 'fatigue', 'ignoring']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const IGNORING_PAIN_OR_FATIGUE_INTENT_TYPE = 'IGNORING_PAIN_OR_FATIGUE' as IntentType;

export function createIgnoringPainOrFatiguePipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [IGNORING_PAIN_OR_FATIGUE_INTENT_TYPE],
    applicability: IGNORING_PAIN_OR_FATIGUE_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isIgnoringPainOrFatiguePayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ignoring = [payload.ignoringPain ? 'pain' : null, payload.ignoringFatigue ? 'fatigue' : null].filter(Boolean).join(' and ');
      const ambiguity: RulesAmbiguity = {
        reason: `Attempting to ignore ${ignoring}. System does not resolve success.`,
        possibleInterpretations: [
          { code: 'WILLPOWER_SUCCEEDS', resultingOutcome: RulesOutcome.PASS, description: `Character successfully ignores ${ignoring} (GM decision)` },
          { code: 'WILLPOWER_FAILS', resultingOutcome: RulesOutcome.FAIL, description: `${ignoring} overwhelms willpower (GM decision)` },
          { code: 'WILLPOWER_PARTIAL', resultingOutcome: RulesOutcome.PASS, description: `Partial success ignoring ${ignoring} (GM decision)` },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction, payload.ignoringPain, payload.ignoringFatigue), conflicts: [createIgnoringConflict(payload.declaredAction, payload.ignoringPain, payload.ignoringFatigue)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
