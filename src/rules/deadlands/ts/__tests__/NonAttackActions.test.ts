/**
 * Non-Attack Actions Tests (PR 8.3)
 *
 * CRITICAL INVARIANT: An action is an action, even if it doesn't deal damage.
 *
 * These tests prove that non-attack actions (Tests, Support) are treated
 * with the same discipline as attacks:
 * - They incur action costs
 * - They emit conflicts
 * - They emit effects
 * - FAIL does NOT suppress effects
 * - Category does NOT change authority
 *
 * WHAT THESE TESTS PROVE:
 * - Tests incur ActionCostEffect
 * - Support incurs ActionCostEffect and emits SoftBlock conflict
 * - Tests while impaired emit effects despite FAIL
 * - Non-attack actions behave structurally identical to attack intents
 *
 * WHAT THESE TESTS DO NOT PROVE:
 * - Success determination
 * - Penalty computation
 * - Bonus calculation
 * - Any arithmetic
 */

import { describe, it, expect } from 'vitest';
import {
  createTestsAsActionsPipeline,
  createTestsAsActionsEffects,
  isTestsAsActionsPayload,
  TESTS_AS_ACTIONS_INTENT_TYPE,
  type TestsAsActionsPayload,
} from '../TestsAsActions';
import {
  createSupportActionsPipeline,
  createSupportActionsEffects,
  isSupportActionsPayload,
  SUPPORT_ACTIONS_INTENT_TYPE,
  type SupportActionsPayload,
} from '../SupportActions';
import {
  createTestsWhileImpairedPipeline,
  createTestsWhileImpairedEffects,
  isTestsWhileImpairedPayload,
  TESTS_WHILE_IMPAIRED_INTENT_TYPE,
  type TestsWhileImpairedPayload,
} from '../TestsWhileImpaired';
import { RulesOutcome, ConflictKind } from '../../../../intent/bridge/ts/RulesPipeline';
import { CostValidationOutcome } from '../../../../resolution/ts/types';
import type { ValidatedIntent } from '../../../../intent/bridge/ts/ValidatedIntent';
import type { InvocationId } from '../../../../intent/bridge/ts/RulesPipeline';

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockIntent<T>(
  intentType: string,
  payload: T
): ValidatedIntent {
  return {
    intentId: 'test-intent-001',
    intentType: intentType as ValidatedIntent['intentType'],
    timestamp: new Date().toISOString(),
    payload,
  };
}

function createInvocationId(): InvocationId {
  return 'test-invocation-001' as InvocationId;
}

// ============================================================================
// TESTS AS ACTIONS TESTS
// ============================================================================

describe('TestsAsActions - Tests Are Real Actions', () => {
  const pipeline = createTestsAsActionsPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: TestsAsActionsPayload = {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
      };
      expect(isTestsAsActionsPayload(payload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(isTestsAsActionsPayload(null)).toBe(false);
      expect(isTestsAsActionsPayload({})).toBe(false);
      expect(isTestsAsActionsPayload({ characterId: 'char' })).toBe(false);
    });
  });

  describe('CRITICAL: Tests Incur Action Cost', () => {
    it('should emit ActionCostEffect', () => {
      const payload: TestsAsActionsPayload = {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
      };

      const intent = createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: Tests are NOT free
      expect(result.costValidation).toBeDefined();
      expect(result.costValidation!.cost.kind).toBe('ActionCostEffect');
      expect(result.costValidation!.cost.tags).toContain('action');
      expect(result.costValidation!.cost.tags).toContain('test');
    });

    it('should NOT auto-PASS - must be AMBIGUOUS', () => {
      const payload: TestsAsActionsPayload = {
        characterId: 'char-001',
        testType: 'Intimidate',
        targetId: 'target-001',
      };

      const intent = createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: Must not auto-PASS
      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('should emit conflict describing situational uncertainty', () => {
      const payload: TestsAsActionsPayload = {
        characterId: 'char-001',
        testType: 'Trick',
        targetId: 'target-001',
        situationalContext: 'during combat',
      };

      const intent = createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('effort-consumed');
    });
  });

  describe('Tests Emit Effects Like Any Action', () => {
    it('should emit effects.length > 0', () => {
      const effects = createTestsAsActionsEffects(
        'char-001',
        'Taunt',
        'target-001',
        'mocking words',
        'inv-001',
        RulesOutcome.AMBIGUOUS
      );

      expect(effects.length).toBeGreaterThan(0);
    });

    it('should emit test attempt effect', () => {
      const effects = createTestsAsActionsEffects(
        'char-001',
        'Intimidate',
        'target-001',
        undefined,
        'inv-001',
        RulesOutcome.AMBIGUOUS
      );

      const attempt = effects.find(e => e.effectId.includes('_test_attempt'));
      expect(attempt).toBeDefined();
      expect(attempt!.parameters.attemptRecorded).toBe(true);
      expect(attempt!.parameters.isNonAttackAction).toBe(true);
    });

    it('should emit effect indicating target was subjected to test', () => {
      const effects = createTestsAsActionsEffects(
        'char-001',
        'Trick',
        'target-001',
        undefined,
        'inv-001',
        RulesOutcome.AMBIGUOUS
      );

      const targetEffect = effects.find(e => e.effectId.includes('_test_target'));
      expect(targetEffect).toBeDefined();
      expect(targetEffect!.parameters.narrativeType).toBe('subjected_to_test');
    });

    it('should handle various test types', () => {
      const testTypes = ['Taunt', 'Intimidate', 'Trick', 'Test of Wills'];

      for (const testType of testTypes) {
        const effects = createTestsAsActionsEffects(
          'char-001',
          testType,
          'target-001',
          undefined,
          'inv-001',
          RulesOutcome.AMBIGUOUS
        );

        expect(effects.length).toBeGreaterThan(0);
        expect(effects[0].parameters.testType).toBe(testType);
      }
    });
  });

  describe('Ambiguity and Possible Interpretations', () => {
    it('should emit ambiguity with GM decision options', () => {
      const payload: TestsAsActionsPayload = {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
      };

      const intent = createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.ambiguity).not.toBeNull();
      expect(result.ambiguity!.possibleInterpretations.length).toBeGreaterThan(0);
      expect(result.ambiguity!.reason).toContain('consume effort');
    });
  });
});

// ============================================================================
// SUPPORT ACTIONS TESTS
// ============================================================================

describe('SupportActions - Support Is Not Less Than An Action', () => {
  const pipeline = createSupportActionsPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: SupportActionsPayload = {
        characterId: 'char-001',
        supportType: 'Aid',
        beneficiaryId: 'ally-001',
      };
      expect(isSupportActionsPayload(payload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(isSupportActionsPayload(null)).toBe(false);
      expect(isSupportActionsPayload({})).toBe(false);
      expect(isSupportActionsPayload({ characterId: 'char' })).toBe(false);
    });
  });

  describe('CRITICAL: Support Incurs Action Cost', () => {
    it('should emit ActionCostEffect', () => {
      const payload: SupportActionsPayload = {
        characterId: 'char-001',
        supportType: 'Aid',
        beneficiaryId: 'ally-001',
      };

      const intent = createMockIntent(SUPPORT_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: Support is NOT free
      expect(result.costValidation).toBeDefined();
      expect(result.costValidation!.cost.kind).toBe('ActionCostEffect');
      expect(result.costValidation!.cost.tags).toContain('action');
      expect(result.costValidation!.cost.tags).toContain('support');
    });

    it('should return AMBIGUOUS - support depends on interpretation', () => {
      const payload: SupportActionsPayload = {
        characterId: 'char-001',
        supportType: 'Assist',
        beneficiaryId: 'ally-001',
      };

      const intent = createMockIntent(SUPPORT_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('should emit SoftBlock conflict for coordination/timing', () => {
      const payload: SupportActionsPayload = {
        characterId: 'char-001',
        supportType: 'Cover Fire',
        beneficiaryId: 'ally-001',
        supportedAction: 'attack',
      };

      const intent = createMockIntent(SUPPORT_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('coordination');
      expect(result.conflicts[0].tags).toContain('effort-consumed');
    });
  });

  describe('Support Emits Effects Like Any Action', () => {
    it('should emit effects.length > 0', () => {
      const effects = createSupportActionsEffects(
        'char-001',
        'Aid',
        'ally-001',
        undefined,
        undefined,
        'inv-001'
      );

      expect(effects.length).toBeGreaterThan(0);
    });

    it('should emit support attempt effect', () => {
      const effects = createSupportActionsEffects(
        'char-001',
        'Coordinate',
        'ally-001',
        'tactical coordination',
        'attack',
        'inv-001'
      );

      const attempt = effects.find(e => e.effectId.includes('_support_attempt'));
      expect(attempt).toBeDefined();
      expect(attempt!.parameters.attemptRecorded).toBe(true);
      expect(attempt!.parameters.isNonAttackAction).toBe(true);
    });

    it('should emit effect identifying intended beneficiary', () => {
      const effects = createSupportActionsEffects(
        'char-001',
        'Distraction',
        'ally-001',
        undefined,
        undefined,
        'inv-001'
      );

      const beneficiaryEffect = effects.find(e => e.effectId.includes('_beneficiary'));
      expect(beneficiaryEffect).toBeDefined();
      expect(beneficiaryEffect!.parameters.beneficiaryId).toBe('ally-001');
    });

    it('should handle various support types', () => {
      const supportTypes = ['Aid', 'Assist', 'Cover Fire', 'Distraction', 'Coordinate'];

      for (const supportType of supportTypes) {
        const effects = createSupportActionsEffects(
          'char-001',
          supportType,
          'ally-001',
          undefined,
          undefined,
          'inv-001'
        );

        expect(effects.length).toBeGreaterThan(0);
        expect(effects[0].parameters.supportType).toBe(supportType);
      }
    });
  });

  describe('Ambiguity and Possible Interpretations', () => {
    it('should emit ambiguity stating support depends on interpretation', () => {
      const payload: SupportActionsPayload = {
        characterId: 'char-001',
        supportType: 'Aid',
        beneficiaryId: 'ally-001',
      };

      const intent = createMockIntent(SUPPORT_ACTIONS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.ambiguity).not.toBeNull();
      expect(result.ambiguity!.reason).toContain('interpretation');
      expect(result.ambiguity!.reason).toContain('timing');
    });
  });
});

// ============================================================================
// TESTS WHILE IMPAIRED TESTS
// ============================================================================

describe('TestsWhileImpaired - FAIL Does Not Suppress Effects', () => {
  const pipeline = createTestsWhileImpairedPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload with distracted', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
        impairmentCondition: 'distracted',
      };
      expect(isTestsWhileImpairedPayload(payload)).toBe(true);
    });

    it('should validate correct payload with shaken', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Intimidate',
        targetId: 'target-001',
        impairmentCondition: 'shaken',
      };
      expect(isTestsWhileImpairedPayload(payload)).toBe(true);
    });

    it('should validate correct payload with both', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Trick',
        targetId: 'target-001',
        impairmentCondition: 'both',
      };
      expect(isTestsWhileImpairedPayload(payload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(isTestsWhileImpairedPayload(null)).toBe(false);
      expect(isTestsWhileImpairedPayload({})).toBe(false);
      expect(isTestsWhileImpairedPayload({ impairmentCondition: 'invalid' })).toBe(false);
    });
  });

  describe('CRITICAL: Must NOT Emit PASS', () => {
    it('should return FAIL when distracted', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
        impairmentCondition: 'distracted',
      };

      const intent = createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).not.toBe(RulesOutcome.PASS);
      expect(result.outcome).toBe(RulesOutcome.FAIL);
    });

    it('should return FAIL when shaken', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Intimidate',
        targetId: 'target-001',
        impairmentCondition: 'shaken',
      };

      const intent = createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).not.toBe(RulesOutcome.PASS);
    });

    it('should return FAIL when both distracted and shaken', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Trick',
        targetId: 'target-001',
        impairmentCondition: 'both',
      };

      const intent = createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).not.toBe(RulesOutcome.PASS);
    });
  });

  describe('CRITICAL: Impairment Does NOT Waive Cost', () => {
    it('should emit ActionCostEffect despite impairment', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
        impairmentCondition: 'distracted',
      };

      const intent = createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: Cost is NOT waived due to impairment
      expect(result.costValidation).toBeDefined();
      expect(result.costValidation!.cost.kind).toBe('ActionCostEffect');
      expect(result.costValidation!.cost.tags).toContain('impaired');
    });
  });

  describe('CRITICAL: Effects Emit Despite FAIL', () => {
    it('should emit effects.length > 0 even when FAIL', () => {
      const effects = createTestsWhileImpairedEffects(
        'char-001',
        'Taunt',
        'target-001',
        'distracted',
        undefined,
        'inv-001',
        RulesOutcome.FAIL
      );

      // THE CRITICAL INVARIANT: FAIL does not suppress effects
      expect(effects.length).toBeGreaterThan(0);
    });

    it('should emit test attempt effect despite FAIL', () => {
      const effects = createTestsWhileImpairedEffects(
        'char-001',
        'Intimidate',
        'target-001',
        'shaken',
        undefined,
        'inv-001',
        RulesOutcome.FAIL
      );

      const attempt = effects.find(e => e.effectId.includes('_impaired_test_attempt'));
      expect(attempt).toBeDefined();
      expect(attempt!.authority.outcome).toBe(RulesOutcome.FAIL);
      expect(attempt!.parameters.attemptRecorded).toBe(true);
      expect(attempt!.parameters.attemptedWhileImpaired).toBe(true);
    });

    it('should emit impairment noted effect despite FAIL', () => {
      const effects = createTestsWhileImpairedEffects(
        'char-001',
        'Trick',
        'target-001',
        'both',
        undefined,
        'inv-001',
        RulesOutcome.FAIL
      );

      const impairmentEffect = effects.find(e => e.effectId.includes('_impairment_noted'));
      expect(impairmentEffect).toBeDefined();
      expect(impairmentEffect!.authority.outcome).toBe(RulesOutcome.FAIL);
      expect(impairmentEffect!.parameters.impairmentCondition).toBe('both');
    });

    it('should emit target subjected effect despite FAIL', () => {
      const effects = createTestsWhileImpairedEffects(
        'char-001',
        'Taunt',
        'target-001',
        'distracted',
        undefined,
        'inv-001',
        RulesOutcome.FAIL
      );

      const targetEffect = effects.find(e => e.effectId.includes('_impaired_test_target'));
      expect(targetEffect).toBeDefined();
      expect(targetEffect!.parameters.testerImpaired).toBe(true);
    });

    it('should handle all impairment conditions', () => {
      const conditions: Array<'distracted' | 'shaken' | 'both'> = ['distracted', 'shaken', 'both'];

      for (const condition of conditions) {
        const effects = createTestsWhileImpairedEffects(
          'char-001',
          'Taunt',
          'target-001',
          condition,
          undefined,
          'inv-001',
          RulesOutcome.FAIL
        );

        expect(effects.length).toBeGreaterThan(0);
        const attempt = effects.find(e => e.effectId.includes('_impaired_test_attempt'));
        expect(attempt!.parameters.impairmentCondition).toBe(condition);
      }
    });
  });

  describe('Conflict and Violation Emission', () => {
    it('should emit SoftBlock conflict describing impairment interference', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
        impairmentCondition: 'distracted',
      };

      const intent = createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('attempt-recorded');
    });

    it('should emit violation with WARNING severity', () => {
      const payload: TestsWhileImpairedPayload = {
        characterId: 'char-001',
        testType: 'Intimidate',
        targetId: 'target-001',
        impairmentCondition: 'shaken',
      };

      const intent = createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].severity).toBe('WARNING');
      expect(result.violations[0].message).toContain('attempt was made');
    });
  });
});

// ============================================================================
// CROSS-CUTTING INVARIANT TESTS
// ============================================================================

describe('Cross-Cutting: Category Does Not Change Authority', () => {
  it('CRITICAL: All non-attack actions emit ActionCostEffect', () => {
    const testPipeline = createTestsAsActionsPipeline();
    const supportPipeline = createSupportActionsPipeline();
    const impairedPipeline = createTestsWhileImpairedPipeline();

    const testResult = testPipeline.validate(
      createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
      }),
      createInvocationId()
    );

    const supportResult = supportPipeline.validate(
      createMockIntent(SUPPORT_ACTIONS_INTENT_TYPE, {
        characterId: 'char-001',
        supportType: 'Aid',
        beneficiaryId: 'ally-001',
      }),
      createInvocationId()
    );

    const impairedResult = impairedPipeline.validate(
      createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
        impairmentCondition: 'distracted',
      }),
      createInvocationId()
    );

    // CRITICAL: ALL non-attack actions have costs
    expect(testResult.costValidation!.cost.kind).toBe('ActionCostEffect');
    expect(supportResult.costValidation!.cost.kind).toBe('ActionCostEffect');
    expect(impairedResult.costValidation!.cost.kind).toBe('ActionCostEffect');
  });

  it('CRITICAL: All non-attack actions emit effects', () => {
    const testEffects = createTestsAsActionsEffects(
      'char-001', 'Taunt', 'target-001', undefined, 'inv-001', RulesOutcome.AMBIGUOUS
    );
    const supportEffects = createSupportActionsEffects(
      'char-001', 'Aid', 'ally-001', undefined, undefined, 'inv-002'
    );
    const impairedEffects = createTestsWhileImpairedEffects(
      'char-001', 'Taunt', 'target-001', 'distracted', undefined, 'inv-003', RulesOutcome.FAIL
    );

    expect(testEffects.length).toBeGreaterThan(0);
    expect(supportEffects.length).toBeGreaterThan(0);
    expect(impairedEffects.length).toBeGreaterThan(0);
  });

  it('CRITICAL: All effects have isNonAttackAction = true', () => {
    const testEffects = createTestsAsActionsEffects(
      'char-001', 'Taunt', 'target-001', undefined, 'inv-001', RulesOutcome.AMBIGUOUS
    );
    const supportEffects = createSupportActionsEffects(
      'char-001', 'Aid', 'ally-001', undefined, undefined, 'inv-002'
    );
    const impairedEffects = createTestsWhileImpairedEffects(
      'char-001', 'Taunt', 'target-001', 'distracted', undefined, 'inv-003', RulesOutcome.FAIL
    );

    for (const effect of testEffects) {
      expect(effect.parameters.isNonAttackAction).toBe(true);
    }
    for (const effect of supportEffects) {
      expect(effect.parameters.isNonAttackAction).toBe(true);
    }
    for (const effect of impairedEffects) {
      expect(effect.parameters.isNonAttackAction).toBe(true);
    }
  });

  it('CRITICAL: All non-attack actions emit conflicts', () => {
    const testPipeline = createTestsAsActionsPipeline();
    const supportPipeline = createSupportActionsPipeline();
    const impairedPipeline = createTestsWhileImpairedPipeline();

    const testResult = testPipeline.validate(
      createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
      }),
      createInvocationId()
    );

    const supportResult = supportPipeline.validate(
      createMockIntent(SUPPORT_ACTIONS_INTENT_TYPE, {
        characterId: 'char-001',
        supportType: 'Aid',
        beneficiaryId: 'ally-001',
      }),
      createInvocationId()
    );

    const impairedResult = impairedPipeline.validate(
      createMockIntent(TESTS_WHILE_IMPAIRED_INTENT_TYPE, {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
        impairmentCondition: 'distracted',
      }),
      createInvocationId()
    );

    expect(testResult.conflicts.length).toBeGreaterThan(0);
    expect(supportResult.conflicts.length).toBeGreaterThan(0);
    expect(impairedResult.conflicts.length).toBeGreaterThan(0);
  });

  it('Non-attack action behaves structurally identical to attack intent', () => {
    // Test action has the same structure as an attack action would
    const testPipeline = createTestsAsActionsPipeline();
    const result = testPipeline.validate(
      createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
      }),
      createInvocationId()
    );

    // Same structural elements as attack rules:
    expect(result.outcome).toBeDefined(); // Has outcome
    expect(result.costValidation).toBeDefined(); // Has cost
    expect(result.costValidation!.cost.kind).toBe('ActionCostEffect'); // Is action cost
    expect(result.conflicts.length).toBeGreaterThan(0); // Has conflicts
    expect(result.ambiguity).not.toBeNull(); // Has ambiguity

    // Effects can be generated with same pattern
    const effects = createTestsAsActionsEffects(
      'char-001', 'Taunt', 'target-001', undefined, 'inv-001', result.outcome
    );
    expect(effects.length).toBeGreaterThan(0); // Effects exist
  });

  it('CRITICAL: No category shortcuts - tests are NOT free', () => {
    const testPipeline = createTestsAsActionsPipeline();
    const result = testPipeline.validate(
      createMockIntent(TESTS_AS_ACTIONS_INTENT_TYPE, {
        characterId: 'char-001',
        testType: 'Taunt',
        targetId: 'target-001',
      }),
      createInvocationId()
    );

    // Tests MUST have action cost
    expect(result.costValidation).toBeDefined();
    expect(result.costValidation!.cost.tags).toContain('action');

    // Tests MUST NOT auto-pass
    expect(result.outcome).not.toBe(RulesOutcome.PASS);
  });

  it('CRITICAL: No category shortcuts - support is NOT free', () => {
    const supportPipeline = createSupportActionsPipeline();
    const result = supportPipeline.validate(
      createMockIntent(SUPPORT_ACTIONS_INTENT_TYPE, {
        characterId: 'char-001',
        supportType: 'Aid',
        beneficiaryId: 'ally-001',
      }),
      createInvocationId()
    );

    // Support MUST have action cost
    expect(result.costValidation).toBeDefined();
    expect(result.costValidation!.cost.tags).toContain('action');

    // Support MUST be AMBIGUOUS
    expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });
});
