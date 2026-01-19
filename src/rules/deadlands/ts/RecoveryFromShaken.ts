/**
 * Recovery From Shaken Rule (PR 8.5)
 *
 * CRITICAL INVARIANT: Recovery attempts must not imply recovery.
 *
 * This rule validates intents where a Shaken actor declares a recovery
 * attempt. The attempt is recorded but does NOT clear the condition,
 * resolve outcome, or mutate state.
 *
 * CRITICAL: Recovery attempts are facts, not transitions.
 * - Recovery depends on interpretation or roll
 * - The system does NOT resolve outcome
 * - The system does NOT clear Shaken
 * - The system does NOT mutate state
 *
 * WHAT THIS RULE DOES:
 * - Detects when a Shaken actor declares recovery attempt
 * - Emits AMBIGUOUS (recovery depends on interpretation)
 * - Emits ActionCostEffect
 * - Emits SoftBlock conflict (uncertainty of recovery)
 * - Emits effect describing recovery attempt occurred
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Clear Shaken
 * - Resolve outcome
 * - Track attempts
 * - Mutate state
 * - Imply success
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
 * Payload for recovery from shaken intent
 *
 * CRITICAL: The payload declares a recovery attempt.
 * The attempt is a FACT, not a transition.
 * The system does NOT clear Shaken.
 */
export type RecoveryFromShakenPayload = {
  /** ID of the shaken character attempting recovery */
  readonly characterId: string;

  /**
   * Confirmation that actor is Shaken
   */
  readonly isShaken: true;

  /**
   * Declaration that this is a recovery attempt
   */
  readonly isRecoveryAttempt: true;

  /**
   * Optional description of recovery approach
   */
  readonly recoveryApproach?: string;
};

/**
 * Type guard for RecoveryFromShakenPayload
 */
export function isRecoveryFromShakenPayload(
  payload: unknown
): payload is RecoveryFromShakenPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    p.isShaken === true &&
    p.isRecoveryAttempt === true
  );
}

// ============================================================================
// COST DECLARATIONS
// ============================================================================

/**
 * Create cost validation for recovery attempt
 *
 * CRITICAL: Cost is emitted. Recovery attempt consumes effort.
 * The system does NOT resolve outcome.
 */
function createCostValidation(): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: 'Recovery attempt from Shaken',
    tags: ['action', 'recovery', 'shaken'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Recovery depends on interpretation or roll - system does not resolve outcome',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for recovery attempt
 *
 * CRITICAL: Conflict describes uncertainty of recovery.
 * It does NOT resolve outcome. It does NOT clear Shaken.
 */
function createRecoveryConflict(
  recoveryApproach: string | undefined
): Conflict {
  const approachSuffix = recoveryApproach ? ` (approach: ${recoveryApproach})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_RECOVERY_001',
    message: `Recovery attempt from Shaken${approachSuffix}. ` +
      'Recovery depends on interpretation or roll. ' +
      'The system does not resolve outcome or clear conditions.',
    tags: ['recovery', 'shaken', 'no-mutation', 'no-resolution', 'attempt-only'],
  };
}

// ============================================================================
// EFFECT EMISSION
// ============================================================================

/**
 * Create effects for recovery attempt
 *
 * CRITICAL INVARIANT: Effect describes recovery attempt occurred.
 * Does NOT clear Shaken. Does NOT imply success.
 */
export function createRecoveryFromShakenEffects(
  characterId: string,
  recoveryApproach: string | undefined,
  invocationId: string
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the recovery attempt
  effects.push({
    effectId: `${invocationId}_recovery_attempt`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: characterId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome: RulesOutcome.AMBIGUOUS,
    },
    parameters: {
      narrativeType: 'recovery_attempt',
      conditionTargeted: 'shaken',
      recoveryApproach: recoveryApproach || 'unspecified',
      attemptRecorded: true,
      conditionCleared: false,
      outcomeResolved: false,
      stateModified: false,
    },
    description: 'Recovery attempt from Shaken - outcome not resolved',
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate recovery from shaken intent
 *
 * CRITICAL: Emits AMBIGUOUS. Does NOT resolve outcome.
 * Does NOT clear Shaken. Recovery attempt is a fact, not a transition.
 */
function validateRecoveryFromShaken(
  payload: RecoveryFromShakenPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { recoveryApproach } = payload;

  const ambiguity: RulesAmbiguity = {
    reason: 'Recovery depends on interpretation or roll. ' +
      'The system does not resolve outcome.',
    possibleInterpretations: [
      {
        code: 'RECOVERY_SUCCEEDS',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Recovery attempt succeeds (GM decision)',
      },
      {
        code: 'RECOVERY_FAILS',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Recovery attempt fails (GM decision)',
      },
      {
        code: 'RECOVERY_PARTIAL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Recovery has partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createRecoveryConflict(recoveryApproach),
  ];

  const costValidation = createCostValidation();

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
 * Applicability for Recovery From Shaken rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const RECOVERY_FROM_SHAKEN_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['recovery', 'shaken', 'condition']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const RECOVERY_FROM_SHAKEN_INTENT_TYPE = 'RECOVERY_FROM_SHAKEN' as IntentType;

/**
 * Create the Recovery From Shaken rules pipeline
 *
 * CRITICAL: Recovery attempts must not imply recovery.
 * The system does NOT clear conditions.
 */
export function createRecoveryFromShakenPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [RECOVERY_FROM_SHAKEN_INTENT_TYPE],
    applicability: RECOVERY_FROM_SHAKEN_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isRecoveryFromShakenPayload(payload)) {
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

      const result = validateRecoveryFromShaken(payload, invocationId);

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
