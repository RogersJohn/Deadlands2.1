/**
 * Support Actions Rule (PR 8.3)
 *
 * CRITICAL INVARIANT: An action is an action, even if it doesn't deal damage.
 *
 * This rule validates intents where a Support action is declared for another
 * character. Support is NOT "less than" an action. It is subject to the same
 * discipline as attacks.
 *
 * CRITICAL: Category does not change authority.
 * - Support consumes effort like other actions
 * - Support is NOT "free"
 * - Support is NOT exempt from costs
 * - The system does NOT enforce outcome
 *
 * WHAT THIS RULE DOES:
 * - Detects when a Support action is declared
 * - Emits AMBIGUOUS (support depends on interpretation and timing)
 * - Emits ActionCostEffect (no cost exemption)
 * - Emits SoftBlock conflict (reliance on coordination/timing)
 * - Emits effect describing support attempt and intended beneficiary
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Treat support as "free"
 * - Exempt support from costs
 * - Grant automatic success
 * - Compute modifiers or bonuses
 * - Enforce outcomes
 * - Mutate state
 *
 * This rule operates independently. It does not coordinate with other rules.
 */

import type { ValidatedIntent } from '../../../intent/bridge/ts/ValidatedIntent';
import type { IntentType } from '../../../intent/bridge/ts/ValidatedIntent';
import type {
  InvocationId,
  RulesPipeline,
  RulesetId,
  RuleViolation,
  ValidationReport,
  Conflict,
  RulesAmbiguity,
} from '../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome, ConflictKind } from '../../../intent/bridge/ts/RulesPipeline';
import type { CostValidationResult, ActionCostEffect, Effect } from '../../../resolution/ts/types';
import { CostValidationOutcome, EffectType } from '../../../resolution/ts/types';
import type { RuleApplicability } from '../../applicability/ts/types';
import { createRuleApplicability } from '../../applicability/ts/types';

// ============================================================================
// INTENT PAYLOAD TYPES
// ============================================================================

/**
 * Payload for support action intent
 *
 * CRITICAL: The payload declares a support attempt for another character.
 * Support is NOT "less than" an action. It consumes effort.
 */
export type SupportActionsPayload = {
  /** ID of the character providing support */
  readonly characterId: string;

  /**
   * The type of support being provided
   * Examples: "Aid", "Assist", "Cover Fire", "Distraction", "Coordinate"
   *
   * CRITICAL: This is the declared support, not an outcome.
   * The system does NOT enforce outcome.
   */
  readonly supportType: string;

  /**
   * ID of the character being supported (the beneficiary)
   */
  readonly beneficiaryId: string;

  /**
   * Optional description of the support action
   */
  readonly supportDescription?: string;

  /**
   * The action being supported (optional)
   * Examples: "attack", "skill check", "defense"
   */
  readonly supportedAction?: string;
};

/**
 * Type guard for SupportActionsPayload
 */
export function isSupportActionsPayload(
  payload: unknown
): payload is SupportActionsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.supportType === 'string' &&
    typeof p.beneficiaryId === 'string'
  );
}

// ============================================================================
// COST DECLARATIONS (SUPPORT IS NOT FREE)
// ============================================================================

/**
 * Create cost validation for support action
 *
 * CRITICAL: Support consumes effort like other actions.
 * No cost exemption. Support is NOT "free".
 * Support is an action.
 */
function createCostValidation(
  supportType: string,
  beneficiaryId: string
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Support action: ${supportType} for ${beneficiaryId}`,
    tags: ['action', 'support', 'non-attack'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Support depends on interpretation and timing - system does not enforce outcome',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for support action
 *
 * CRITICAL: Conflict describes reliance on coordination/timing.
 * It does NOT grant exemption from costs.
 * It does NOT enforce outcome.
 */
function createSupportConflict(
  supportType: string,
  beneficiaryId: string,
  supportedAction: string | undefined
): Conflict {
  const actionSuffix = supportedAction ? ` for ${supportedAction}` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_SUPPORT_001',
    message: `Support declared: ${supportType}${actionSuffix} for beneficiary ${beneficiaryId}. ` +
      'Support actions consume effort. ' +
      'Reliance on coordination and timing introduces uncertainty. ' +
      'The system does not enforce outcome.',
    tags: ['support', 'non-attack', 'action', 'coordination', 'timing', 'effort-consumed'],
  };
}

// ============================================================================
// EFFECT EMISSION (SUPPORT EMITS EFFECTS LIKE ANY ACTION)
// ============================================================================

/**
 * Create effects for support action
 *
 * CRITICAL INVARIANT: Support emits effects like any other action.
 * No special treatment. No exemption.
 * The support attempt occurred. The intended beneficiary was identified.
 */
export function createSupportActionsEffects(
  characterId: string,
  supportType: string,
  beneficiaryId: string,
  supportDescription: string | undefined,
  supportedAction: string | undefined,
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the support attempt
  effects.push({
    effectId: `${invocationId}_support_attempt`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: beneficiaryId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.AMBIGUOUS,
    },
    parameters: {
      actionLabel: supportType,
      supporterId: characterId,
      narrativeType: 'support_attempt',
      supportType,
      supportDescription: supportDescription || supportType,
      supportedAction: supportedAction || 'unspecified',
      attemptRecorded: true,
      isNonAttackAction: true,
    },
    description: `Character attempts support: ${supportType}`,
  });

  // Effect indicating intended beneficiary was identified
  effects.push({
    effectId: `${invocationId}_beneficiary`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: beneficiaryId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.AMBIGUOUS,
    },
    parameters: {
      narrativeType: 'support_beneficiary',
      supporterId: characterId,
      supportType,
      beneficiaryId,
      attemptRecorded: true,
      isNonAttackAction: true,
    },
    description: `Intended beneficiary identified for support: ${supportType}`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate support action intent
 *
 * CRITICAL: Support is NOT auto-PASS. Always AMBIGUOUS.
 * Support depends on interpretation and timing.
 * The system does NOT enforce outcome.
 */
function validateSupportActions(
  payload: SupportActionsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { supportType, beneficiaryId, supportedAction } = payload;

  // CRITICAL: Always AMBIGUOUS
  // Support depends on interpretation and timing
  const ambiguity: RulesAmbiguity = {
    reason: 'Support depends on interpretation and timing. ' +
      'Support actions consume effort. ' +
      'The system does not enforce outcome.',
    possibleInterpretations: [
      {
        code: 'SUPPORT_EFFECTIVE',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Support is effective (GM decision)',
      },
      {
        code: 'SUPPORT_INEFFECTIVE',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Support is ineffective due to timing/coordination (GM decision)',
      },
      {
        code: 'SUPPORT_PARTIAL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Support has partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createSupportConflict(supportType, beneficiaryId, supportedAction),
  ];

  const costValidation = createCostValidation(supportType, beneficiaryId);

  return {
    outcome: RulesOutcome.AMBIGUOUS,
    violations: [],
    ambiguity,
    conflicts,
    costValidation,
  };
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * Applicability for Support Actions rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 * No defaults. No inference. Explicit applicability.
 */
export const SUPPORT_ACTIONS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['support', 'non-attack', 'aid', 'assist', 'coordinate']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const SUPPORT_ACTIONS_INTENT_TYPE = 'SUPPORT_ACTIONS' as IntentType;

/**
 * Create the Support Actions rules pipeline
 *
 * CRITICAL: Support is an action. It is NOT "less than" an action.
 * Category does not change authority.
 */
export function createSupportActionsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [SUPPORT_ACTIONS_INTENT_TYPE],
    applicability: SUPPORT_ACTIONS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isSupportActionsPayload(payload)) {
        return {
          invocationId,
          sourceIntentId: intent.intentId,
          intentType: intent.intentType,
          rulesetId: DEADLANDS_CORE_RULESET_ID,
          outcome: RulesOutcome.PASS,
          violations: [],
          ambiguity: null,
          payload: intent.payload,
          conflicts: [],
        };
      }

      const result = validateSupportActions(payload, invocationId);

      return {
        invocationId,
        sourceIntentId: intent.intentId,
        intentType: intent.intentType,
        rulesetId: DEADLANDS_CORE_RULESET_ID,
        outcome: result.outcome,
        violations: result.violations,
        ambiguity: result.ambiguity,
        payload: intent.payload,
        costValidation: result.costValidation,
        conflicts: result.conflicts,
      };
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RulesOutcome, ConflictKind };
