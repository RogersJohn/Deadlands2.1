/**
 * Tests While Impaired Rule (PR 8.3)
 *
 * CRITICAL INVARIANT: An action is an action, even if it doesn't deal damage.
 *
 * This rule validates intents where a Test is declared while the actor is
 * Distracted or Shaken. Impairment does NOT exempt from costs. FAIL does NOT
 * suppress the test attempt.
 *
 * CRITICAL: Category does not change authority.
 * - Tests consume effort even when impaired
 * - Impairment does NOT waive costs
 * - FAIL does NOT suppress effects
 * - The system does NOT compute penalties
 *
 * WHAT THIS RULE DOES:
 * - Detects when a Test is declared while Distracted or Shaken
 * - Emits FAIL or AMBIGUOUS (must not emit PASS)
 * - Emits ActionCostEffect (no waiver due to impairment)
 * - Emits SoftBlock conflict (interference from condition)
 * - Emits test attempt effects DESPITE FAIL
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Suppress effects on FAIL
 * - Compute penalties
 * - Exempt from costs due to impairment
 * - Grant automatic failure enforcement
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
 * Payload for tests while impaired intent
 *
 * CRITICAL: The payload declares a test attempt while impaired.
 * Impairment does NOT waive costs. The attempt still occurred.
 */
export type TestsWhileImpairedPayload = {
  /** ID of the character performing the test */
  readonly characterId: string;

  /**
   * The type of test being performed
   * Examples: "Taunt", "Intimidate", "Trick", "Test of Wills"
   */
  readonly testType: string;

  /**
   * Target of the test
   */
  readonly targetId: string;

  /**
   * The impairment condition affecting the actor
   *
   * CRITICAL: This is CONTEXT, not enforcement.
   * The system does NOT compute penalties.
   */
  readonly impairmentCondition: 'distracted' | 'shaken' | 'both';

  /**
   * Optional description of the test approach
   */
  readonly testDescription?: string;
};

/**
 * Type guard for TestsWhileImpairedPayload
 */
export function isTestsWhileImpairedPayload(
  payload: unknown
): payload is TestsWhileImpairedPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.testType === 'string' &&
    typeof p.targetId === 'string' &&
    (p.impairmentCondition === 'distracted' ||
     p.impairmentCondition === 'shaken' ||
     p.impairmentCondition === 'both')
  );
}

// ============================================================================
// COST DECLARATIONS (IMPAIRMENT DOES NOT WAIVE COST)
// ============================================================================

/**
 * Create cost validation for impaired test
 *
 * CRITICAL: Cost is emitted regardless of impairment.
 * No waiver due to condition.
 * The attempt was made - the cost exists.
 */
function createCostValidation(
  testType: string,
  impairmentCondition: 'distracted' | 'shaken' | 'both'
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Test action while ${impairmentCondition}: ${testType}`,
    tags: ['action', 'test', 'non-attack', 'impaired'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Impaired state affects test reliability - cost applies regardless of condition',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create SoftBlock conflict for impaired test
 *
 * CRITICAL: Conflict describes interference from condition.
 * It does NOT enforce resolution.
 * It does NOT waive costs.
 */
function createImpairedTestConflict(
  testType: string,
  impairmentCondition: 'distracted' | 'shaken' | 'both'
): Conflict {
  const conditionLabel = impairmentCondition === 'both'
    ? 'distracted and shaken'
    : impairmentCondition;
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_TEST_002',
    message: `Test declared while ${conditionLabel}: ${testType}. ` +
      'Impaired state affects test reliability. ' +
      'The system does not compute penalties. ' +
      'Test attempt is recorded despite impairment.',
    tags: ['test', 'non-attack', 'impaired', impairmentCondition, 'attempt-recorded', 'effort-consumed'],
  };
}

// ============================================================================
// EFFECT EMISSION (FAIL DOES NOT SUPPRESS EFFECTS)
// ============================================================================

/**
 * Create effects for impaired test
 *
 * CRITICAL INVARIANT: Effects are emitted DESPITE FAIL.
 * FAIL does NOT suppress the test attempt.
 * The test was attempted. The impairment was noted.
 */
export function createTestsWhileImpairedEffects(
  characterId: string,
  testType: string,
  targetId: string,
  impairmentCondition: 'distracted' | 'shaken' | 'both',
  testDescription: string | undefined,
  invocationId: string,
  outcome: RulesOutcome
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the test attempt (despite impairment)
  effects.push({
    effectId: `${invocationId}_impaired_test_attempt`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome, // CRITICAL: Effect exists regardless of outcome
    },
    parameters: {
      actionLabel: testType,
      testerId: characterId,
      narrativeType: 'test_attempt',
      testType,
      testDescription: testDescription || testType,
      impairmentCondition,
      attemptRecorded: true,
      isNonAttackAction: true,
      attemptedWhileImpaired: true,
    },
    description: `Character attempts test while ${impairmentCondition}: ${testType}`,
  });

  // Effect indicating impairment during test
  effects.push({
    effectId: `${invocationId}_impairment_noted`,
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
      narrativeType: 'impairment_during_action',
      impairmentCondition,
      actionType: 'test',
      testType,
      attemptRecorded: true,
      isNonAttackAction: true,
    },
    description: `Test attempted while ${impairmentCondition} - impairment noted`,
  });

  // Effect indicating target was subjected to test (despite impairment)
  effects.push({
    effectId: `${invocationId}_impaired_test_target`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome, // CRITICAL: Effect exists regardless of outcome
    },
    parameters: {
      narrativeType: 'subjected_to_test',
      testerId: characterId,
      testType,
      testerImpaired: true,
      impairmentCondition,
      attemptRecorded: true,
      isNonAttackAction: true,
    },
    description: `Target was subjected to test from impaired actor`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate tests while impaired intent
 *
 * CRITICAL: Must NOT emit PASS.
 * Impaired state affects test reliability.
 * The system does NOT compute penalties.
 * FAIL does NOT suppress effects.
 */
function validateTestsWhileImpaired(
  payload: TestsWhileImpairedPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { testType, impairmentCondition } = payload;

  const conditionLabel = impairmentCondition === 'both'
    ? 'distracted and shaken'
    : impairmentCondition;

  // CRITICAL: Must not emit PASS
  // Impairment introduces reliability concerns
  const violation: RuleViolation = {
    ruleId: 'SW_TEST_002',
    message: `Test attempted while ${conditionLabel}. ` +
      `Impaired state affects test reliability. ` +
      `The attempt was made and is recorded.`,
    severity: 'WARNING',
  };

  const ambiguity: RulesAmbiguity = {
    reason: 'Impaired state affects test reliability. ' +
      'The system does not compute penalties. ' +
      'Test attempt is recorded despite impairment.',
    possibleInterpretations: [
      {
        code: 'TEST_SUCCEEDS_DESPITE_IMPAIRMENT',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Test succeeds despite impairment (GM decision)',
      },
      {
        code: 'IMPAIRMENT_CAUSES_FAILURE',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Impairment causes test to fail (GM decision)',
      },
      {
        code: 'IMPAIRMENT_PARTIAL_EFFECT',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Impairment reduces effectiveness (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createImpairedTestConflict(testType, impairmentCondition),
  ];

  const costValidation = createCostValidation(testType, impairmentCondition);

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
 * Applicability for Tests While Impaired rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 * No defaults. No inference. Explicit applicability.
 */
export const TESTS_WHILE_IMPAIRED_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['test', 'non-attack', 'impaired', 'distracted', 'shaken']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const TESTS_WHILE_IMPAIRED_INTENT_TYPE = 'TESTS_WHILE_IMPAIRED' as IntentType;

/**
 * Create the Tests While Impaired rules pipeline
 *
 * CRITICAL: Impairment does NOT waive costs.
 * FAIL does NOT suppress effects.
 * Category does not change authority.
 */
export function createTestsWhileImpairedPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [TESTS_WHILE_IMPAIRED_INTENT_TYPE],
    applicability: TESTS_WHILE_IMPAIRED_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isTestsWhileImpairedPayload(payload)) {
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

      const result = validateTestsWhileImpaired(payload, invocationId);

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
