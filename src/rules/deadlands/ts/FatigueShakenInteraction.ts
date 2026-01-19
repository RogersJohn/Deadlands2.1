/**
 * Fatigue + Shaken Interaction Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement, no condition precedence.
 * This rule notes that an actor has both fatigue and shaken while acting.
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

export type FatigueShakenInteractionPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly fatigueLevel: number;
  readonly isShaken: true;
  readonly hasFatigue: true;
};

export function isFatigueShakenInteractionPayload(payload: unknown): payload is FatigueShakenInteractionPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && typeof p.fatigueLevel === 'number' && p.isShaken === true && p.hasFatigue === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while fatigued and shaken: ${declaredAction}`, tags: ['action', 'fatigue', 'shaken', 'interaction'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Fatigue and shaken coexist - system does not resolve interaction',
  };
}

function createInteractionConflict(declaredAction: string, fatigueLevel: number): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_FATIGUE_003',
    message: `Action while fatigued (${fatigueLevel}) and shaken: ${declaredAction}. Conditions coexist. System does not resolve interaction.`,
    tags: ['condition', 'fatigue', 'shaken', 'interaction', 'no-precedence', 'no-enforcement'],
  };
}

export function createFatigueShakenInteractionEffects(characterId: string, declaredAction: string, fatigueLevel: number, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, conditionsPresent: ['fatigue', 'shaken'] },
      description: `Character attempts action while fatigued and shaken: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_interaction_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'condition_interaction', conditions: ['fatigue', 'shaken'], fatigueLevel, interactionResolved: false, precedenceApplied: false },
      description: 'Fatigue + Shaken interaction noted - no precedence applied',
    },
  ];
}

export const FATIGUE_SHAKEN_INTERACTION_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['condition', 'fatigue', 'shaken', 'interaction']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const FATIGUE_SHAKEN_INTERACTION_INTENT_TYPE = 'FATIGUE_SHAKEN_INTERACTION' as IntentType;

export function createFatigueShakenInteractionPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [FATIGUE_SHAKEN_INTERACTION_INTENT_TYPE],
    applicability: FATIGUE_SHAKEN_INTERACTION_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isFatigueShakenInteractionPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Fatigue and shaken coexist. System does not resolve interaction.',
        possibleInterpretations: [
          { code: 'INTERACTION_MANAGEABLE', resultingOutcome: RulesOutcome.PASS, description: 'Combined conditions manageable (GM decision)' },
          { code: 'INTERACTION_OVERWHELMING', resultingOutcome: RulesOutcome.FAIL, description: 'Combined conditions overwhelming (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createInteractionConflict(payload.declaredAction, payload.fatigueLevel)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
