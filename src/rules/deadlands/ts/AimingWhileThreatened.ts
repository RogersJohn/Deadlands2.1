/**
 * Aiming While Threatened Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts to aim while threatened.
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

export type AimingWhileThreatenedPayload = {
  readonly characterId: string;
  readonly targetId: string;
  readonly isThreatened: true;
  readonly threatDescription?: string;
};

export function isAimingWhileThreatenedPayload(payload: unknown): payload is AimingWhileThreatenedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.targetId === 'string' && p.isThreatened === true;
}

function createCostValidation(targetId: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Aiming at ${targetId} while threatened`, tags: ['action', 'aim', 'ranged', 'threatened'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Aiming while threatened - system does not quantify focus penalty',
  };
}

function createAimingConflict(targetId: string, threatDescription: string | undefined): Conflict {
  const threatSuffix = threatDescription ? ` (threat: ${threatDescription})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_RANGED_005',
    message: `Aiming at ${targetId} while threatened${threatSuffix}. Threat interferes with focus. System does not quantify penalty.`,
    tags: ['ranged', 'aim', 'threatened', 'focus', 'no-quantification'],
  };
}

export function createAimingWhileThreatenedEffects(characterId: string, targetId: string, threatDescription: string | undefined, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_aim`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'aim', narrativeType: 'action_attempt', attemptRecorded: true, aimTarget: targetId, contextCondition: 'threatened' },
      description: `Character attempts to aim while threatened: target ${targetId}`,
    },
    {
      effectId: `${invocationId}_threat_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'combat_pressure_context', pressureType: 'threatened', threatDescription: threatDescription || 'unspecified', focusPenaltyQuantified: false },
      description: 'Threat context noted - focus penalty not quantified',
    },
  ];
}

export const AIMING_WHILE_THREATENED_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['ranged', 'aim', 'pressure']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const AIMING_WHILE_THREATENED_INTENT_TYPE = 'AIMING_WHILE_THREATENED' as IntentType;

export function createAimingWhileThreatenedPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [AIMING_WHILE_THREATENED_INTENT_TYPE],
    applicability: AIMING_WHILE_THREATENED_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isAimingWhileThreatenedPayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Aiming while threatened. System does not quantify focus penalty.',
        possibleInterpretations: [
          { code: 'AIM_MAINTAINED', resultingOutcome: RulesOutcome.PASS, description: 'Aim maintained despite threat (GM decision)' },
          { code: 'AIM_DISRUPTED', resultingOutcome: RulesOutcome.FAIL, description: 'Threat disrupts aim (GM decision)' },
          { code: 'AIM_PARTIAL', resultingOutcome: RulesOutcome.PASS, description: 'Partial aim achieved (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.targetId), conflicts: [createAimingConflict(payload.targetId, payload.threatDescription)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
