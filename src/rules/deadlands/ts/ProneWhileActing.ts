/**
 * Prone While Acting Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor is prone while attempting an action.
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

export type ProneWhileActingPayload = {
  readonly characterId: string;
  readonly declaredAction: string;
  readonly isProne: true;
};

export function isProneWhileActingPayload(payload: unknown): payload is ProneWhileActingPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.declaredAction === 'string' && p.isProne === true;
}

function createCostValidation(declaredAction: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Action while prone: ${declaredAction}`, tags: ['action', 'prone'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Prone position affects action - system does not quantify impact',
  };
}

function createProneConflict(declaredAction: string): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_POSITION_001',
    message: `Action while prone: ${declaredAction}. Prone position introduces complications. System does not enforce penalties.`,
    tags: ['position', 'prone', 'no-enforcement'],
  };
}

export function createProneWhileActingEffects(characterId: string, declaredAction: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_action`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: declaredAction, narrativeType: 'action_attempt', attemptRecorded: true, positionContext: 'prone' },
      description: `Character attempts action while prone: ${declaredAction}`,
    },
    {
      effectId: `${invocationId}_prone_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'position_context', position: 'prone', impactQuantified: false },
      description: 'Prone position noted - no impact quantified',
    },
  ];
}

export const PRONE_WHILE_ACTING_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['position', 'prone']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const PRONE_WHILE_ACTING_INTENT_TYPE = 'PRONE_WHILE_ACTING' as IntentType;

export function createProneWhileActingPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [PRONE_WHILE_ACTING_INTENT_TYPE],
    applicability: PRONE_WHILE_ACTING_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isProneWhileActingPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Prone position affects action. System does not quantify impact.',
        possibleInterpretations: [
          { code: 'PRONE_IRRELEVANT', resultingOutcome: RulesOutcome.PASS, description: 'Prone does not affect this action (GM decision)' },
          { code: 'PRONE_HINDERS', resultingOutcome: RulesOutcome.FAIL, description: 'Prone hinders the action (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.declaredAction), conflicts: [createProneConflict(payload.declaredAction)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
