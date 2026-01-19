/**
 * Tests as Actions Rule (PR 8.3)
 *
 * CRITICAL INVARIANT: An action is an action, even if it doesn't deal damage.
 *
 * This rule validates intents where a Test (Taunt, Intimidate, Trick, etc.)
 * is declared. Tests are NOT special cases. They are subject to the same
 * discipline as attacks.
 *
 * CRITICAL: Category does not change authority.
 * - Tests consume effort like other actions
 * - Tests are NOT "free"
 * - Tests are NOT "lighter"
 * - The system does NOT resolve success
 *
 * WHAT THIS RULE DOES:
 * - Detects when a Test action is declared
 * - Emits PASS or AMBIGUOUS (must not auto-PASS)
 * - Emits ActionCostEffect (non-numeric, descriptive)
 * - May emit Informational or SoftBlock conflict
 * - Emits effect describing test attempt
 *
 * WHAT THIS RULE DOES NOT DO:
 * - Treat tests as "free"
 * - Exempt tests from costs
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
 * Payload for test action intent
 *
 * CRITICAL: The payload declares a test attempt.
 * Tests are NOT "lighter" than attacks. They are actions.
 */
export type TestsAsActionsPayload = {
  /** ID of the character performing the test */
  readonly characterId: string;

  /**
   * The type of test being performed
   * Examples: "Taunt", "Intimidate", "Trick", "Test of Wills"
   *
   * CRITICAL: This is the declared test, not a success determination.
   * The system does NOT resolve success.
   */
  readonly testType: string;

  /**
   * Target of the test
   */
  readonly targetId: string;

  /**
   * Optional description of the test approach
   */
  readonly testDescription?: string;

  /**
   * Situational context (optional)
   * Examples: "in combat", "before negotiation", "during standoff"
   */
  readonly situationalContext?: string;
};

/**
 * Type guard for TestsAsActionsPayload
 */
export function isTestsAsActionsPayload(
  payload: unknown
): payload is TestsAsActionsPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.characterId === 'string' &&
    typeof p.testType === 'string' &&
    typeof p.targetId === 'string'
  );
}

// ============================================================================
// COST DECLARATIONS (TESTS ARE NOT FREE)
// ============================================================================

/**
 * Create cost validation for test action
 *
 * CRITICAL: Tests consume effort like other actions.
 * No cost exemption. No "lighter" handling.
 * Tests are actions.
 */
function createCostValidation(
  testType: string
): CostValidationResult {
  const cost: ActionCostEffect = {
    kind: 'ActionCostEffect',
    description: `Test action: ${testType}`,
    tags: ['action', 'test', 'non-attack'],
  };

  return {
    cost,
    outcome: CostValidationOutcome.AMBIGUOUS,
    reason: 'Tests consume effort like other actions - system does not resolve success',
  };
}

// ============================================================================
// CONFLICT EMISSION
// ============================================================================

/**
 * Create conflict for test action
 *
 * CRITICAL: Conflict describes situational uncertainty.
 * It does NOT grant permission or denial.
 * It does NOT exempt from costs.
 */
function createTestConflict(
  testType: string,
  situationalContext: string | undefined
): Conflict {
  const contextSuffix = situationalContext ? ` (${situationalContext})` : '';
  return {
    kind: ConflictKind.SoftBlock,
    sourceRule: 'SW_TEST_001',
    message: `Test declared: ${testType}${contextSuffix}. ` +
      'Tests are actions and consume effort. ' +
      'Situational uncertainty exists. ' +
      'The system does not resolve success.',
    tags: ['test', 'non-attack', 'action', 'situational-uncertainty', 'effort-consumed'],
  };
}

// ============================================================================
// EFFECT EMISSION (TESTS EMIT EFFECTS LIKE ANY ACTION)
// ============================================================================

/**
 * Create effects for test action
 *
 * CRITICAL INVARIANT: Tests emit effects like any other action.
 * No special treatment. No exemption.
 * The test attempt occurred. The target was subjected to a test.
 */
export function createTestsAsActionsEffects(
  characterId: string,
  testType: string,
  targetId: string,
  testDescription: string | undefined,
  invocationId: string,
  outcome: RulesOutcome
): Effect[] {
  const effects: Effect[] = [];

  // Effect for the test attempt
  effects.push({
    effectId: `${invocationId}_test_attempt`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome,
    },
    parameters: {
      actionLabel: testType,
      testerId: characterId,
      narrativeType: 'test_attempt',
      testType,
      testDescription: testDescription || testType,
      attemptRecorded: true,
      isNonAttackAction: true,
    },
    description: `Character attempts test: ${testType}`,
  });

  // Effect indicating target was subjected to a test
  effects.push({
    effectId: `${invocationId}_test_target`,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: {
      targetId,
      targetType: 'character',
    },
    authority: {
      invocationId,
      source: 'RULES' as const,
      outcome,
    },
    parameters: {
      narrativeType: 'subjected_to_test',
      testerId: characterId,
      testType,
      attemptRecorded: true,
      isNonAttackAction: true,
    },
    description: `Target was subjected to test: ${testType}`,
  });

  return effects;
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate test action intent
 *
 * CRITICAL: Tests are NOT auto-PASS.
 * Tests consume effort like other actions.
 * The system does NOT resolve success.
 */
function validateTestsAsActions(
  payload: TestsAsActionsPayload,
  _invocationId: InvocationId
): {
  outcome: RulesOutcome;
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  conflicts: Conflict[];
  costValidation: CostValidationResult;
} {
  const { testType, situationalContext } = payload;

  // CRITICAL: Must not auto-PASS
  // Tests have situational uncertainty
  const ambiguity: RulesAmbiguity = {
    reason: 'Tests consume effort like other actions. ' +
      'Situational uncertainty exists. ' +
      'The system does not resolve success.',
    possibleInterpretations: [
      {
        code: 'TEST_EFFECTIVE',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Test is effective (GM decision)',
      },
      {
        code: 'TEST_RESISTED',
        resultingOutcome: RulesOutcome.FAIL,
        description: 'Test is resisted (GM decision)',
      },
      {
        code: 'TEST_PARTIAL',
        resultingOutcome: RulesOutcome.PASS,
        description: 'Test has partial effect (GM decision)',
      },
    ],
  };

  const conflicts: Conflict[] = [
    createTestConflict(testType, situationalContext),
  ];

  const costValidation = createCostValidation(testType);

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
 * Applicability for Tests as Actions rule
 *
 * CRITICAL: Combat mode only. Silently skipped outside combat.
 * No defaults. No inference. Explicit applicability.
 */
export const TESTS_AS_ACTIONS_APPLICABILITY: RuleApplicability = createRuleApplicability(
  ['combat'],
  ['test', 'non-attack', 'taunt', 'intimidate', 'trick']
);

// ============================================================================
// PIPELINE IMPLEMENTATION
// ============================================================================

export const DEADLANDS_CORE_RULESET_ID = 'deadlands_core' as RulesetId;
export const TESTS_AS_ACTIONS_INTENT_TYPE = 'TESTS_AS_ACTIONS' as IntentType;

/**
 * Create the Tests as Actions rules pipeline
 *
 * CRITICAL: Tests are actions. They are NOT "lighter".
 * Category does not change authority.
 */
export function createTestsAsActionsPipeline(): RulesPipeline {
  return {
    rulesetId: DEADLANDS_CORE_RULESET_ID,
    handledIntentTypes: [TESTS_AS_ACTIONS_INTENT_TYPE],
    applicability: TESTS_AS_ACTIONS_APPLICABILITY,

    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      const payload = intent.payload;

      if (!isTestsAsActionsPayload(payload)) {
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

      const result = validateTestsAsActions(payload, invocationId);

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
