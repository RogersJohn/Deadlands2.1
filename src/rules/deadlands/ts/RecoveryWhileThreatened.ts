/**
 * Recovery While Threatened Rule (PR 8.5)
 *
 * CRITICAL INVARIANT: Recovery attempts must not imply recovery.
 *
 * This rule validates intents where a Shaken actor who is also Threatened
 * or Engaged declares a recovery attempt. Pressure interferes with recovery
 * but the attempt is still recorded and effects still emit.
 *
 * CRITICAL: Recovery attempts are facts, not transitions.
 * - Pressure interferes with recovery
 * - The system does NOT decide outcome
 * - The system does NOT clear Shaken
 * - The system does NOT mutate state
 * - FAIL does NOT suppress effects
 *
 * WHAT THIS RULE DOES:
 * - Detects when Shaken + Threatened/Engaged actor declares recovery
 * - Emits FAIL or AMBIGUOUS (must NOT emit PASS)
 * - Emits ActionCostEffect
 * - Emits SoftBlock conflict (interference from pressure)
 * - Emits recovery attempt effect DESPITE FAIL
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Clear Shaken
 * - Decide outcome
 * - Suppress effects on FAIL
 * - Mutate state
 * - Imply success or failure
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
 * Payload for recovery while threatened intent
 *
 * CRITICAL: The payload declares a recovery attempt under pressure.
 * The attempt is a FACT, not a transition.
 * The system does NOT decide outcome.
 */
export type RecoveryWhileThreatenedPayload = {
  /** ID of the shaken character attempting recovery */
  readonly characterId: string;

  /**
   * Confirmation that actor is Shaken
   */
  readonly isShaken: true;

  /**
   * Confirmation that actor is Threatened or Engaged
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The system does NOT decide outcome.
   */
  readonly threatStatus: 'threatened' | 'engaged' | 'both';

  /**
   * Declaration that this is a recovery attempt
   */
  readonly isRecoveryAttempt: true;

  /**
   * Optional description of threat source
   */
  readonly threatSource?: string;
};

/**
 * Type guard for RecoveryWhileThreatenedPayload
 */
export function isRecoveryWhileThreatenedPayload(
  payload: unknown
): payload is RecoveryWhileThreatenedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    p.isShaken === true &&
    p.isRecoveryAttempt === true &&
    (p.threatStatus === 'threatened' ||
     p.threatStatus === 'engaged' ||
     p.threatStatus === 'both')
  );
}

// ============================================================================
// COST DECLARATIONS
// ============================================================================

/**
 * Create cost validation for recovery attempt while threatened
 *
 * CRITICAL: Cost is emitted. Recovery attempt consumes effort.
 * The system does NOT decide outcome.
 */
function createCostValidation(
  threatStatus: 'threatened' | 'engaged' | 'both'
): CostValidationResult {
  const threatLabel = threatStatus === 'both' ? 'threatened and engaged' : threatStatus;
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Recovery attempt while ${threatLabel}`,
    tags: ['action', 'recovery', 'shaken', threatStatus],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Pressure interferes with recovery - system does not decide outcome',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for recovery while threatened
 *
 * CRITICAL: Conflict describes interference from pressure.
 * It does NOT decide outcome. It does NOT clear Shaken.
 */
function createThreatenedRecoveryConflict(
  threatStatus: 'threatened' | 'engaged' | 'both',
  threatSource: string | undefined
): Conflict {
  const threatLabel = threatStatus === 'both' ? 'threatened and engaged' : threatStatus;
  const sourceSuffix = threatSource ? ` (source: ${threatSource})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_RECOVERY_002',
    message: `Recovery attempt while ${threatLabel}${sourceSuffix}. ` +
      'Pressure interferes with recovery. ' +
      'The system does not decide outcome.',
    tags: ['recovery', 'shaken', threatStatus, 'pressure', 'no-resolution', 'attempt-recorded'],
  };
}

// ============================================================================
// EFFECT EMISSION (DESPITE FAIL)
// ============================================================================

/**
 * Create effects for recovery attempt while threatened
 *
 * CRITICAL INVARIANT: Effects are emitted DESPITE FAIL.
 * FAIL does NOT suppress effects.
 * Does NOT clear Shaken. Does NOT decide outcome.
 */
export function createRecoveryWhileThreatenedEffects(
  characterId: string,
  threatStatus: 'threatened' | 'engaged' | 'both',
  threatSource: string | undefined,
  invocationId: string,
  outcome: RulesOutcome
): Effect[] {
  const effects: Effect[] = [];

  const threatLabel = threatStatus === 'both' ? 'threatened and engaged' : threatStatus;

  // Effect for the recovery attempt (despite pressure)
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
      outcome, // CRITICAL: Effect exists regardless of outcome
    },
    parameters: {
      narrativeType: 'recovery_attempt',
      conditionTargeted: 'shaken',
      attemptRecorded: true,
      conditionCleared: false,
      outcomeResolved: false,
      stateModified: false,
      attemptedUnderPressure: true,
    },
    description: 'Recovery attempt while under pressure - outcome not decided',
  });

  // Effect noting the threat context
  effects.push({
    effectId: `${invocationId}_threat_context`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId: characterId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome, // CRITICAL: Effect exists regardless of outcome
    },
    parameters: {
      narrativeType: 'recovery_pressure_context',
      threatStatus,
      threatSource: threatSource || 'unspecified',
      pressureInterferes: true,
      outcomeDecided: false,
    },
    description: `Recovery attempted while ${threatLabel} - pressure noted`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate recovery while threatened intent
 *
 * CRITICAL: Emits FAIL or AMBIGUOUS. Must NOT emit PASS.
 * Does NOT decide outcome. Does NOT clear Shaken.
 * FAIL does NOT suppress effects.
 */
function validateRecoveryWhileThreatened(
  payload: RecoveryWhileThreatenedPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { threatStatus, threatSource } = payload;

  const threatLabel = threatStatus === 'both' ? 'threatened and engaged' : threatStatus;

  // CRITICAL: Must NOT emit PASS
  const violation: RuleViolation = {
    ruleId: 'SW_RECOVERY_002',
    message: `Recovery attempt while ${threatLabel}. ` +
      `Pressure interferes with recovery. ` +
      `The attempt was made and is recorded.`,
    severity: 'WARNING',
  };

  const ambiguity: RulesAmbiguity = {
    reason: 'Pressure interferes with recovery. ' +
      'The system does not decide outcome.',
    possibleInterpretations: [
      {
        code: 'RECOVERY_DESPITE_PRESSURE',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Recovery succeeds despite pressure (GM decision)',
      },
      {
        code: 'PRESSURE_PREVENTS_RECOVERY',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Pressure prevents recovery (GM decision)',
      },
      {
        code: 'PARTIAL_RECOVERY',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Partial recovery occurs (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createThreatenedRecoveryConflict(threatStatus, threatSource),
  ];

  const costValidation = createCostValidation(threatStatus);

  // Emit FAIL to prove FAIL does not suppress effects
  return {
    outcome: RulesOutcome.FAIL,
    violations: [violation],
    ambiguity,
    conflicts,
    costValidation,
  };
}

// ============================================================================
// RULE APPLICABILITY (PR 6.1)
// ============================================================================

/**
 * Applicability for Recovery While Threatened rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 */
export const RECOVERY_WHILE_THREATENED_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['recovery', 'shaken', 'threatened', 'engaged', 'pressure']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const RECOVERY_WHILE_THREATENED_INTENT_TYPE = 'RECOVERY_WHILE_THREATENED' as IntentType;

/**
 * Create the Recovery While Threatened rules pipeline
 *
 * CRITICAL: Recovery attempts must not imply recovery.
 * FAIL does NOT suppress effects.
 */
export function createRecoveryWhileThreatenedPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [RECOVERY_WHILE_THREATENED_INTENT_TYPE],
    applicability: RECOVERY_WHILE_THREATENED_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isRecoveryWhileThreatenedPayload(payload)) {
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

      const result = validateRecoveryWhileThreatened(payload, invocationId);

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
