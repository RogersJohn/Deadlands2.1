/**
 * Commanding Allies Under Fire Rule (PR 9.0)
 *
 * CRITICAL: No math, no penalties, no enforcement.
 * This rule notes that an actor attempts to command allies while under fire.
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

export type CommandingAlliesUnderFirePayload = {
  readonly characterId: string;
  readonly allyIds: readonly string[];
  readonly commandDescription: string;
  readonly isUnderFire: true;
};

export function isCommandingAlliesUnderFirePayload(payload: unknown): payload is CommandingAlliesUnderFirePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return typeof p.characterId === 'string' && Array.isArray(p.allyIds) && typeof p.commandDescription === 'string' && p.isUnderFire === true;
}

function createCostValidation(commandDescription: string, allyCount: number): CostValidationResult {
  return {
    cost: { kind: 'ActionCostEffect', description: `Commanding ${allyCount} allies under fire: ${commandDescription}`, tags: ['action', 'social', 'command', 'leadership', 'under-fire'] },
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Command under fire - system does not resolve compliance',
  };
}

function createCommandingConflict(commandDescription: string, allyCount: number): Conflict {
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_SOCIAL_003',
    message: `Commanding ${allyCount} allies under fire: ${commandDescription}. Fire pressure affects command delivery and compliance. System does not resolve.`,
    tags: ['social', 'command', 'leadership', 'under-fire', 'no-resolution'],
  };
}

export function createCommandingAlliesUnderFireEffects(characterId: string, allyIds: readonly string[], commandDescription: string, invocationId: string): Effect[] {
  return [
    {
      effectId: `${invocationId}_command`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { actionLabel: 'command', narrativeType: 'action_attempt', attemptRecorded: true, commandDescription, allyIds, allyCount: allyIds.length, underFireContext: true },
      description: `Character commands allies under fire: ${commandDescription}`,
    },
    {
      effectId: `${invocationId}_fire_command_context`,
      effectType: EffectType.TRIGGER_NARRATIVE,
      target: { targetId: characterId, targetType: 'character' },
      authority: { invocationId, source: 'RULES' as const, outcome: RulesOutcome.AMBIGUOUS },
      parameters: { narrativeType: 'leadership_pressure_context', pressureType: 'under-fire', commandTargetCount: allyIds.length, complianceResolved: false },
      description: `Command under fire context noted - ${allyIds.length} allies, compliance not resolved`,
    },
  ];
}

export const COMMANDING_ALLIES_UNDER_FIRE_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat'], ['social', 'command', 'leadership', 'pressure']);
export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const COMMANDING_ALLIES_UNDER_FIRE_INTENT_TYPE = 'COMMANDING_ALLIES_UNDER_FIRE' as IntentType;

export function createCommandingAlliesUnderFirePipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [COMMANDING_ALLIES_UNDER_FIRE_INTENT_TYPE],
    applicability: COMMANDING_ALLIES_UNDER_FIRE_APPLICABILITY,
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;
      if (!isCommandingAlliesUnderFirePayload(payload)) {
        return { invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID, outcome: RulesOutcome.PASS, violations: [], ambiguity: null, payload: intent.payload, conflicts: [] };
      }
      const ambiguity: RulesAmbiguity = {
        reason: 'Command under fire. System does not resolve compliance.',
        possibleInterpretations: [
          { code: 'COMMAND_OBEYED', resultingOutcome: RulesOutcome.PASS, description: 'Allies obey despite fire (GM decision)' },
          { code: 'COMMAND_IGNORED', resultingOutcome: RulesOutcome.FAIL, description: 'Fire prevents allies from hearing/obeying (GM decision)' },
          { code: 'COMMAND_PARTIAL', resultingOutcome: RulesOutcome.PASS, description: 'Some allies comply (GM decision)' },
        ],
      };
      return {
        invocationId, sourceIntentId: intent.intentId, intentType: intent.intentType, rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: RulesOutcome.AMBIGUOUS, violations: [], ambiguity, payload: intent.payload,
        costValidation: createCostValidation(payload.commandDescription, payload.allyIds.length), conflicts: [createCommandingConflict(payload.commandDescription, payload.allyIds.length)],
      };
    },
  };
}

export { RulesOutcome, ConflictKind };
