/**
 * Standing Up From Prone Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts to stand from prone.
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

export type StandingUpFromPronePayload = {
  readonly characterId: string;
  readonly isProne: true;
  readonly isStandingUp: true;
};

export function isStandingUpFromPronePayload(payload: unknown): payload is StandingUpFromPronePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && p.isProne === true && p.isStandingUp === true;
}

function createCostValidation(): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: 'Standing up from prone', tags: ['action', 'movement', 'prone'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Standing up consumes effort - system does not enforce cost',
  };
}

function createStandingConflict(): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_POSITION_002',
    message: 'Standing up from prone requires effort. System does not enforce action cost.',
    tags: ['position', 'prone', 'standing', 'no-enforcement'],
  };
}

export function createStandingUpFromProneEffects(characterId: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_standing_attempt`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'stand up', narrativeType: 'movement_attempt', attemptRecorded: true, fromPosition: 'prone' },
      description: 'Character attempts to stand up from prone',
    },
  ];
}

export const STANDING_UP_FROM_PRONE_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['position', 'prone', 'movement']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const STANDING_UP_FROM_PRONE_INTENT_TYPE = 'STANDING_UP_FROM_PRONE' as IntentType;

export function createStandingUpFromPronePipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [STANDING_UP_FROM_PRONE_INTENT_TYPE],
    applicability: STANDING_UP_FROM_PRONE_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isStandingUpFromPronePayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Standing up from prone requires effort. System does not enforce cost.',
        possibleInterpretations: [
          { code: 'STAND_SUCCEEDS', resultingOutcome: RulesOutcome.PASS, description: 'Standing succeeds (GM decision)' },
          { code: 'STAND_PREVENTED', resultingOutcome: RulesOutcome.FAIL, description: 'Standing prevented (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(), conflicts: [createStandingConflict()],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
