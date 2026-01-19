/**
 * Reloading Under Fire Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts to reload while under fire.
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

export type ReloadingUnderFirePayload = {
  readonly characterId: string;
  readonly weaponId: string;
  readonly isUnderFire: true;
  readonly threatSourceCount?: number;
};

export function isReloadingUnderFirePayload(payload: unknown): payload is ReloadingUnderFirePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && typeof p.weaponId === 'string' && p.isUnderFire === true;
}

function createCostValidation(weaponId: string): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Reloading weapon ${weaponId} while under fire`, tags: ['action', 'reload', 'ranged', 'under-fire'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Reloading under fire - system does not quantify difficulty',
  };
}

function createReloadConflict(weaponId: string, threatSourceCount: number | undefined): Conflict {
  const threatSuffix = threatSourceCount !== undefined ? ` (${threatSourceCount} threat sources)` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_RANGED_004',
    message: `Reloading weapon ${weaponId} while under fire${threatSuffix}. Fire pressure noted. System does not quantify difficulty.`,
    tags: ['ranged', 'reload', 'under-fire', 'pressure', 'no-quantification'],
  };
}

export function createReloadingUnderFireEffects(characterId: string, weaponId: string, threatSourceCount: number | undefined, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_reload`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'reload', narrativeType: 'action_attempt', attemptRecorded: true, weaponId, contextCondition: 'under-fire' },
      description: `Character attempts to reload weapon while under fire: ${weaponId}`,
    },
    {
      effectId: `${invocationId}_fire_pressure_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'combat_pressure_context', pressureType: 'under-fire', threatSourceCount: threatSourceCount ?? 0, difficultyQuantified: false },
      description: 'Under fire pressure context noted - difficulty not quantified',
    },
  ];
}

export const RELOADING_UNDER_FIRE_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['ranged', 'reload', 'pressure']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const RELOADING_UNDER_FIRE_INTENT_TYPE = 'RELOADING_UNDER_FIRE' as IntentType;

export function createReloadingUnderFirePipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [RELOADING_UNDER_FIRE_INTENT_TYPE],
    applicability: RELOADING_UNDER_FIRE_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isReloadingUnderFirePayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Reloading under fire. System does not quantify difficulty.',
        possibleInterpretations: [
          { code: 'RELOAD_SUCCEEDS', resultingOutcome: RulesOutcome.PASS, description: 'Reload completes despite fire (GM decision)' },
          { code: 'RELOAD_INTERRUPTED', resultingOutcome: RulesOutcome.FAIL, description: 'Fire interrupts reload (GM decision)' },
          { code: 'RELOAD_PARTIAL', resultingOutcome: RulesOutcome.PASS, description: 'Partial reload achieved (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.weaponId), conflicts: [createReloadConflict(payload.weaponId, payload.threatSourceCount)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
