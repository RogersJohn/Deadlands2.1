/**
 * Multiple Recovery Attempts Rule (PR 8.5)
 *
 * CRITICAL INVARIANT: Recovery attempts must not imply recovery.
 *
 * This rule validates intents where a recovery attempt is declared. The system
 * has NO knowledge of prior attempts and behaves IDENTICALLY on every attempt.
 *
 * CRITICAL: The system does NOT track frequency.
 * - Repeated attempts are context-dependent
 * - The system does NOT track frequency
 * - The system behaves identically on every attempt
 * - No "too many attempts" logic
 * - No memory of previous attempts
 *
 * WHAT THIS RULE DOES:
 * - Validates any recovery attempt declaration
 * - Emits AMBIGUOUS (repeated attempts are context-dependent)
 * - Emits ActionCostEffect
 * - Emits Informational conflict (describes repeated attempt context)
 * - Emits recovery attempt effect
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Track attempts
 * - Remember previous attempts
 * - Penalize repeated attempts
 * - Limit attempt frequency
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
 * Payload for multiple recovery attempts intent
 *
 * CRITICAL: The payload declares a recovery attempt.
 * No knowledge of prior attempts is assumed.
 * The system behaves identically on every attempt.
 */
export type MultipleRecoveryAttemptsPayload = {
  /** ID of the character attempting recovery */
  readonly characterId: string;

  /**
   * The condition being recovered from
   */
  readonly conditionTargeted: string;

  /**
   * Declaration that this is a recovery attempt
   */
  readonly isRecoveryAttempt: true;

  /**
   * Optional note that this may be a repeated attempt
   *
   * CRITICAL: This is DESCRIPTIVE only.
   * The system does NOT track frequency.
   * The system does NOT remember previous attempts.
   */
  readonly mayBeRepeated?: boolean;
};

/**
 * Type guard for MultipleRecoveryAttemptsPayload
 */
export function isMultipleRecoveryAttemptsPayload(
  payload: unknown
): payload is MultipleRecoveryAttemptsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.conditionTargeted === 'string' &&
    p.isRecoveryAttempt === true
  );
}

// ============================================================================
// COST DECLARATIONS
// ============================================================================

/**
 * Create cost validation for recovery attempt
 *
 * CRITICAL: Cost is emitted. Same cost every time.
 * The system does NOT track frequency.
 */
function createCostValidation(
  conditionTargeted: string
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Recovery attempt from ${conditionTargeted}`,
    tags: ['action', 'recovery', 'attempt'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Repeated attempts are context-dependent - system does not track frequency',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create Informational conflict for recovery attempt
 *
 * CRITICAL: Conflict describes repeated attempt context.
 * It does NOT penalize. It does NOT limit.
 * It does NOT remember previous attempts.
 */
function createRepeatedAttemptConflict(
  conditionTargeted: string
): Conflict {
  return {
    kind: ConflictKind.Informational,
    sourceRule: 'SW_RECOVERY_003',
    message: `Recovery attempt from ${conditionTargeted}. ` +
      'Repeated attempts are context-dependent. ' +
      'The system does not track frequency or penalize repetition.',
    tags: ['recovery', 'attempt', 'no-tracking', 'no-memory', 'identical-behavior'],
  };
}

// ============================================================================
// EFFECT EMISSION
// ============================================================================

/**
 * Create effects for recovery attempt
 *
 * CRITICAL INVARIANT: Effects are identical on every attempt.
 * The system behaves the same regardless of attempt count.
 */
export function createMultipleRecoveryAttemptsEffects(
  characterId: string,
  conditionTargeted: string,
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
      conditionTargeted,
      attemptRecorded: true,
      conditionCleared: false,
      outcomeResolved: false,
      stateModified: false,
      attemptTracked: false,
      frequencyPenalized: false,
    },
    description: `Recovery attempt from ${conditionTargeted} - identical behavior on every attempt`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate multiple recovery attempts intent
 *
 * CRITICAL: Emits AMBIGUOUS. Behaves identically on every attempt.
 * Does NOT track frequency. Does NOT remember previous attempts.
 */
function validateMultipleRecoveryAttempts(
  payload: MultipleRecoveryAttemptsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { conditionTargeted } = payload;

  // CRITICAL: Same ambiguity every time
  // The system does NOT track frequency
  const ambiguity: RulesAmbiguity = {
    reason: 'Repeated attempts are context-dependent. ' +
      'The system does not track frequency.',
    possibleInterpretations: [
      {
        code: 'ATTEMPT_SUCCEEDS',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Recovery attempt succeeds (GM decision)',
      },
      {
        code: 'ATTEMPT_FAILS',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Recovery attempt fails (GM decision)',
      },
      {
        code: 'ATTEMPT_PARTIAL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Recovery has partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createRepeatedAttemptConflict(conditionTargeted),
  ];

  const costValidation = createCostValidation(conditionTargeted);

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
 * Applicability for Multiple Recovery Attempts rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const MULTIPLE_RECOVERY_ATTEMPTS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['recovery', 'attempt', 'repeated']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const MULTIPLE_RECOVERY_ATTEMPTS_INTENT_TYPE = 'MULTIPLE_RECOVERY_ATTEMPTS' as IntentType;

/**
 * Create the Multiple Recovery Attempts rules pipeline
 *
 * CRITICAL: The system behaves identically on every attempt.
 * No tracking. No memory. No frequency penalties.
 */
export function createMultipleRecoveryAttemptsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [MULTIPLE_RECOVERY_ATTEMPTS_INTENT_TYPE],
    applicability: MULTIPLE_RECOVERY_ATTEMPTS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isMultipleRecoveryAttemptsPayload(payload)) {
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

      const result = validateMultipleRecoveryAttempts(payload, invocationId);

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
