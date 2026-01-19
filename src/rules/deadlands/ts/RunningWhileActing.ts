/**
 * Running While Performing Another Action Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts to run while performing another action.
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

export type RunningWhileActingPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly isRunning: true;
};

export function isRunningWhileActingPayload(payload: unknown): payload is RunningWhileActingPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && p.isRunning === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while running: ${declaredAction}`, tags: ['action', 'running', 'multi-action'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Running while acting introduces complications - system does not enforce penalties',
  };
}

function createRunningConflict(declaredAction: string): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_POSITION_003',
    message: `Action while running: ${declaredAction}. Running introduces complications. System does not enforce penalties.`,
    tags: ['movement', 'running', 'multi-action', 'no-enforcement'],
  };
}

export function createRunningWhileActingEffects(characterId: string, declaredAction: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, movementContext: 'running' },
      description: `Character attempts action while running: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_running_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'movement_context', movement: 'running', impactQuantified: false },
      description: 'Running context noted - no impact quantified',
    },
  ];
}

export const RUNNING_WHILE_ACTING_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['movement', 'running', 'multi-action']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const RUNNING_WHILE_ACTING_INTENT_TYPE = 'RUNNING_WHILE_ACTING' as IntentType;

export function createRunningWhileActingPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [RUNNING_WHILE_ACTING_INTENT_TYPE],
    applicability: RUNNING_WHILE_ACTING_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isRunningWhileActingPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Running while acting introduces complications. System does not enforce penalties.',
        possibleInterpretations: [
          { code: 'RUNNING_NO_IMPACT', resultingOutcome: RulesOutcome.PASS, description: 'Running does not hinder action (GM decision)' },
          { code: 'RUNNING_HINDERS', resultingOutcome: RulesOutcome.FAIL, description: 'Running hinders action (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createRunningConflict(payload.declaredAction)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
