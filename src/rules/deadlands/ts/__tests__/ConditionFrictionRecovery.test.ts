/**
 * Condition Friction & Recovery Tests (PR 8.4-8.5)
 *
 * CRITICAL INVARIANTS:
 * - Volume must not create precedence
 * - Recovery attempts must not imply recovery
 *
 * These tests prove that:
 * - Condition stacking produces ambiguity (not FAIL)
 * - Recovery attempts do not mutate state
 * - Repeated recovery attempts are identical
 * - Recovery under threat still emits effects
 *
 * Nothing resolves. Nothing improves. Nothing gets worse.
 * The system only records what was tried, under what conditions.
 */

import { describe, it, expect } from 'vitest';
import {
  createDistractedEffectsPipeline,
  createDistractedEffectsEffects,
  isDistractedEffectsPayload,
  DISTRACTED_EFFECTS_INTENT_TYPE,
  type DistractedEffectsPayload,
} from '../DistractedEffects';
import {
  createVulnerableEffectsPipeline,
  createVulnerableEffectsEffects,
  isVulnerableEffectsPayload,
  VULNERABLE_EFFECTS_INTENT_TYPE,
  type VulnerableEffectsPayload,
} from '../VulnerableEffects';
import {
  createConditionStackingPipeline,
  createConditionStackingEffects,
  isConditionStackingPayload,
  CONDITION_STACKING_INTENT_TYPE,
  type ConditionStackingPayload,
} from '../ConditionStacking';
import {
  createRecoveryFromShakenPipeline,
  createRecoveryFromShakenEffects,
  isRecoveryFromShakenPayload,
  RECOVERY_FROM_SHAKEN_INTENT_TYPE,
  type RecoveryFromShakenPayload,
} from '../RecoveryFromShaken';
import {
  createRecoveryWhileThreatenedPipeline,
  createRecoveryWhileThreatenedEffects,
  isRecoveryWhileThreatenedPayload,
  RECOVERY_WHILE_THREATENED_INTENT_TYPE,
  type RecoveryWhileThreatenedPayload,
} from '../RecoveryWhileThreatened';
import {
  createMultipleRecoveryAttemptsPipeline,
  createMultipleRecoveryAttemptsEffects,
  isMultipleRecoveryAttemptsPayload,
  MULTIPLE_RECOVERY_ATTEMPTS_INTENT_TYPE,
  type MultipleRecoveryAttemptsPayload,
} from '../MultipleRecoveryAttempts';
import { RulesOutcome, ConflictKind } from '../../../../intent/bridge/ts/RulesPipeline';
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
// DISTRACTED EFFECTS TESTS
// ============================================================================

describe('DistractedEffects - Condition Friction', () => {
  const pipeline = createDistractedEffectsPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: DistractedEffectsPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isDistracted: true,
      };
      expect(isDistractedEffectsPayload(payload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(isDistractedEffectsPayload(null)).toBe(false);
      expect(isDistractedEffectsPayload({ isDistracted: false })).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should emit AMBIGUOUS for distracted action', () => {
      const payload: DistractedEffectsPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isDistracted: true,
      };

      const intent = createMockIntent(DISTRACTED_EFFECTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('should emit SoftBlock conflict', () => {
      const payload: DistractedEffectsPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isDistracted: true,
        distractionSource: 'loud noise',
      };

      const intent = createMockIntent(DISTRACTED_EFFECTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('no-quantification');
    });

    it('should emit ActionCostEffect', () => {
      const payload: DistractedEffectsPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isDistracted: true,
      };

      const intent = createMockIntent(DISTRACTED_EFFECTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.costValidation).toBeDefined();
      expect(result.costValidation!.cost.kind).toBe('ActionCostEffect');
    });
  });

  describe('Effects', () => {
    it('should emit effects', () => {
      const effects = createDistractedEffectsEffects(
        'char-001',
        'attack',
        'loud noise',
        'inv-001'
      );

      expect(effects.length).toBeGreaterThan(0);
    });

    it('should note distraction context without quantification', () => {
      const effects = createDistractedEffectsEffects(
        'char-001',
        'attack',
        undefined,
        'inv-001'
      );

      const contextEffect = effects.find(e => e.effectId.includes('_distraction_context'));
      expect(contextEffect).toBeDefined();
      expect(contextEffect!.parameters.impactQuantified).toBe(false);
      expect(contextEffect!.parameters.stateModified).toBe(false);
    });
  });
});

// ============================================================================
// VULNERABLE EFFECTS TESTS
// ============================================================================

describe('VulnerableEffects - Condition Friction', () => {
  const pipeline = createVulnerableEffectsPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: VulnerableEffectsPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isVulnerable: true,
      };
      expect(isVulnerableEffectsPayload(payload)).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should emit AMBIGUOUS for vulnerable action', () => {
      const payload: VulnerableEffectsPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isVulnerable: true,
      };

      const intent = createMockIntent(VULNERABLE_EFFECTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('should emit SoftBlock conflict for exposure risk', () => {
      const payload: VulnerableEffectsPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isVulnerable: true,
      };

      const intent = createMockIntent(VULNERABLE_EFFECTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('no-adjudication');
    });
  });

  describe('Effects', () => {
    it('should emit effects without consequence adjudication', () => {
      const effects = createVulnerableEffectsEffects(
        'char-001',
        'attack',
        'prone',
        'inv-001'
      );

      expect(effects.length).toBeGreaterThan(0);
      const contextEffect = effects.find(e => e.effectId.includes('_vulnerability_context'));
      expect(contextEffect!.parameters.consequenceAdjudicated).toBe(false);
    });
  });
});

// ============================================================================
// CONDITION STACKING TESTS
// ============================================================================

describe('ConditionStacking - Volume Must Not Create Precedence', () => {
  const pipeline = createConditionStackingPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: ConditionStackingPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isShaken: true,
        additionalCondition: 'distracted',
      };
      expect(isConditionStackingPayload(payload)).toBe(true);
    });
  });

  describe('CRITICAL: Stacking Produces Ambiguity, NOT FAIL', () => {
    it('Distracted + Shaken => AMBIGUOUS (not FAIL)', () => {
      const payload: ConditionStackingPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isShaken: true,
        additionalCondition: 'distracted',
      };

      const intent = createMockIntent(CONDITION_STACKING_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: Must NOT collapse into FAIL
      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(result.outcome).not.toBe(RulesOutcome.FAIL);
    });

    it('Vulnerable + Shaken => AMBIGUOUS (not FAIL)', () => {
      const payload: ConditionStackingPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isShaken: true,
        additionalCondition: 'vulnerable',
      };

      const intent = createMockIntent(CONDITION_STACKING_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('Both + Shaken => AMBIGUOUS (not FAIL)', () => {
      const payload: ConditionStackingPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isShaken: true,
        additionalCondition: 'both',
      };

      const intent = createMockIntent(CONDITION_STACKING_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });
  });

  describe('No Precedence or Dominance', () => {
    it('should emit conflict with no-precedence tag', () => {
      const payload: ConditionStackingPayload = {
        characterId: 'char-001',
        declaredAction: 'attack',
        isShaken: true,
        additionalCondition: 'distracted',
      };

      const intent = createMockIntent(CONDITION_STACKING_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts[0].tags).toContain('no-precedence');
      expect(result.conflicts[0].tags).toContain('no-dominance');
    });
  });

  describe('Effects Still Emitted', () => {
    it('should emit effects for stacked conditions', () => {
      const effects = createConditionStackingEffects(
        'char-001',
        'attack',
        'distracted',
        'inv-001'
      );

      expect(effects.length).toBeGreaterThan(0);
    });

    it('should note conditions coexist without dominance', () => {
      const effects = createConditionStackingEffects(
        'char-001',
        'attack',
        'vulnerable',
        'inv-001'
      );

      const stackingEffect = effects.find(e => e.effectId.includes('_stacking_context'));
      expect(stackingEffect).toBeDefined();
      expect(stackingEffect!.parameters.conditionsCoexist).toBe(true);
      expect(stackingEffect!.parameters.dominanceResolved).toBe(false);
      expect(stackingEffect!.parameters.precedenceApplied).toBe(false);
    });
  });
});

// ============================================================================
// RECOVERY FROM SHAKEN TESTS
// ============================================================================

describe('RecoveryFromShaken - Recovery Attempts Do Not Mutate State', () => {
  const pipeline = createRecoveryFromShakenPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: RecoveryFromShakenPayload = {
        characterId: 'char-001',
        isShaken: true,
        isRecoveryAttempt: true,
      };
      expect(isRecoveryFromShakenPayload(payload)).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should emit AMBIGUOUS for recovery attempt', () => {
      const payload: RecoveryFromShakenPayload = {
        characterId: 'char-001',
        isShaken: true,
        isRecoveryAttempt: true,
      };

      const intent = createMockIntent(RECOVERY_FROM_SHAKEN_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('should emit SoftBlock conflict', () => {
      const payload: RecoveryFromShakenPayload = {
        characterId: 'char-001',
        isShaken: true,
        isRecoveryAttempt: true,
      };

      const intent = createMockIntent(RECOVERY_FROM_SHAKEN_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('no-mutation');
      expect(result.conflicts[0].tags).toContain('no-resolution');
    });
  });

  describe('CRITICAL: No State Mutation', () => {
    it('should NOT clear Shaken in effects', () => {
      const effects = createRecoveryFromShakenEffects(
        'char-001',
        'deep breath',
        'inv-001'
      );

      expect(effects.length).toBeGreaterThan(0);
      const attempt = effects[0];
      expect(attempt.parameters.conditionCleared).toBe(false);
      expect(attempt.parameters.stateModified).toBe(false);
      expect(attempt.parameters.outcomeResolved).toBe(false);
    });

    it('Shaken remains present - no condition removed', () => {
      const payload: RecoveryFromShakenPayload = {
        characterId: 'char-001',
        isShaken: true,
        isRecoveryAttempt: true,
      };

      const intent = createMockIntent(RECOVERY_FROM_SHAKEN_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // The system does NOT clear conditions
      // Shaken is still present (the payload says so, and we don't change it)
      expect(result.ambiguity!.reason).toContain('does not resolve outcome');
    });
  });
});

// ============================================================================
// RECOVERY WHILE THREATENED TESTS
// ============================================================================

describe('RecoveryWhileThreatened - FAIL Still Emits Effects', () => {
  const pipeline = createRecoveryWhileThreatenedPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: RecoveryWhileThreatenedPayload = {
        characterId: 'char-001',
        isShaken: true,
        threatStatus: 'threatened',
        isRecoveryAttempt: true,
      };
      expect(isRecoveryWhileThreatenedPayload(payload)).toBe(true);
    });
  });

  describe('CRITICAL: Must NOT Emit PASS', () => {
    it('should emit FAIL when threatened', () => {
      const payload: RecoveryWhileThreatenedPayload = {
        characterId: 'char-001',
        isShaken: true,
        threatStatus: 'threatened',
        isRecoveryAttempt: true,
      };

      const intent = createMockIntent(RECOVERY_WHILE_THREATENED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).not.toBe(RulesOutcome.PASS);
      expect(result.outcome).toBe(RulesOutcome.FAIL);
    });

    it('should emit FAIL when engaged', () => {
      const payload: RecoveryWhileThreatenedPayload = {
        characterId: 'char-001',
        isShaken: true,
        threatStatus: 'engaged',
        isRecoveryAttempt: true,
      };

      const intent = createMockIntent(RECOVERY_WHILE_THREATENED_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).not.toBe(RulesOutcome.PASS);
    });
  });

  describe('CRITICAL: Effects Exist Despite FAIL', () => {
    it('should emit effects.length > 0 even when FAIL', () => {
      const effects = createRecoveryWhileThreatenedEffects(
        'char-001',
        'threatened',
        'enemy nearby',
        'inv-001',
        RulesOutcome.FAIL
      );

      // THE CRITICAL INVARIANT: FAIL does not suppress effects
      expect(effects.length).toBeGreaterThan(0);
    });

    it('should note attempt was under pressure', () => {
      const effects = createRecoveryWhileThreatenedEffects(
        'char-001',
        'engaged',
        undefined,
        'inv-001',
        RulesOutcome.FAIL
      );

      const attempt = effects.find(e => e.effectId.includes('_recovery_attempt'));
      expect(attempt).toBeDefined();
      expect(attempt!.parameters.attemptedUnderPressure).toBe(true);
      expect(attempt!.parameters.conditionCleared).toBe(false);
    });

    it('should emit threat context effect', () => {
      const effects = createRecoveryWhileThreatenedEffects(
        'char-001',
        'both',
        'surrounded',
        'inv-001',
        RulesOutcome.FAIL
      );

      const threatContext = effects.find(e => e.effectId.includes('_threat_context'));
      expect(threatContext).toBeDefined();
      expect(threatContext!.parameters.outcomeDecided).toBe(false);
    });
  });
});

// ============================================================================
// MULTIPLE RECOVERY ATTEMPTS TESTS
// ============================================================================

describe('MultipleRecoveryAttempts - Identical Behavior Every Time', () => {
  const pipeline = createMultipleRecoveryAttemptsPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: MultipleRecoveryAttemptsPayload = {
        characterId: 'char-001',
        conditionTargeted: 'shaken',
        isRecoveryAttempt: true,
      };
      expect(isMultipleRecoveryAttemptsPayload(payload)).toBe(true);
    });
  });

  describe('CRITICAL: Repeated Attempts Are Identical', () => {
    it('two identical intents => identical outputs', () => {
      const payload: MultipleRecoveryAttemptsPayload = {
        characterId: 'char-001',
        conditionTargeted: 'shaken',
        isRecoveryAttempt: true,
      };

      const intent1 = createMockIntent(MULTIPLE_RECOVERY_ATTEMPTS_INTENT_TYPE, payload);
      const intent2 = createMockIntent(MULTIPLE_RECOVERY_ATTEMPTS_INTENT_TYPE, payload);

      const invocationId = createInvocationId();
      const result1 = pipeline.validate(intent1, invocationId);
      const result2 = pipeline.validate(intent2, invocationId);

      // Outcomes are identical
      expect(result1.outcome).toBe(result2.outcome);
      expect(result1.outcome).toBe(RulesOutcome.AMBIGUOUS);

      // Conflict structure is identical
      expect(result1.conflicts.length).toBe(result2.conflicts.length);
      expect(result1.conflicts[0].kind).toBe(result2.conflicts[0].kind);

      // Ambiguity structure is identical
      expect(result1.ambiguity!.possibleInterpretations.length)
        .toBe(result2.ambiguity!.possibleInterpretations.length);
    });

    it('should NOT track frequency', () => {
      const payload: MultipleRecoveryAttemptsPayload = {
        characterId: 'char-001',
        conditionTargeted: 'shaken',
        isRecoveryAttempt: true,
        mayBeRepeated: true,
      };

      const intent = createMockIntent(MULTIPLE_RECOVERY_ATTEMPTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts[0].tags).toContain('no-tracking');
      expect(result.conflicts[0].tags).toContain('no-memory');
    });
  });

  describe('Informational Conflict', () => {
    it('should emit Informational conflict (not SoftBlock)', () => {
      const payload: MultipleRecoveryAttemptsPayload = {
        characterId: 'char-001',
        conditionTargeted: 'shaken',
        isRecoveryAttempt: true,
      };

      const intent = createMockIntent(MULTIPLE_RECOVERY_ATTEMPTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts[0].kind).toBe(ConflictKind.Informational);
    });
  });

  describe('Effects', () => {
    it('should emit identical effects every time', () => {
      const effects1 = createMultipleRecoveryAttemptsEffects(
        'char-001',
        'shaken',
        'inv-001'
      );
      const effects2 = createMultipleRecoveryAttemptsEffects(
        'char-001',
        'shaken',
        'inv-001'
      );

      expect(effects1.length).toBe(effects2.length);
      expect(effects1[0].parameters.attemptTracked).toBe(false);
      expect(effects1[0].parameters.frequencyPenalized).toBe(false);
    });
  });
});

// ============================================================================
// CROSS-CUTTING INVARIANT TESTS
// ============================================================================

describe('Cross-Cutting: Volume Must Not Create Precedence', () => {
  it('CRITICAL: All condition rules emit effects', () => {
    const distractedEffects = createDistractedEffectsEffects(
      'char-001', 'attack', undefined, 'inv-001'
    );
    const vulnerableEffects = createVulnerableEffectsEffects(
      'char-001', 'attack', undefined, 'inv-002'
    );
    const stackingEffects = createConditionStackingEffects(
      'char-001', 'attack', 'distracted', 'inv-003'
    );

    expect(distractedEffects.length).toBeGreaterThan(0);
    expect(vulnerableEffects.length).toBeGreaterThan(0);
    expect(stackingEffects.length).toBeGreaterThan(0);
  });

  it('CRITICAL: All condition rules emit AMBIGUOUS (not FAIL)', () => {
    const distractedPipeline = createDistractedEffectsPipeline();
    const vulnerablePipeline = createVulnerableEffectsPipeline();
    const stackingPipeline = createConditionStackingPipeline();

    const distractedResult = distractedPipeline.validate(
      createMockIntent(DISTRACTED_EFFECTS_INTENT_TYPE, {
        characterId: 'char-001',
        declaredAction: 'attack',
        isDistracted: true,
      }),
      createInvocationId()
    );

    const vulnerableResult = vulnerablePipeline.validate(
      createMockIntent(VULNERABLE_EFFECTS_INTENT_TYPE, {
        characterId: 'char-001',
        declaredAction: 'attack',
        isVulnerable: true,
      }),
      createInvocationId()
    );

    const stackingResult = stackingPipeline.validate(
      createMockIntent(CONDITION_STACKING_INTENT_TYPE, {
        characterId: 'char-001',
        declaredAction: 'attack',
        isShaken: true,
        additionalCondition: 'distracted',
      }),
      createInvocationId()
    );

    expect(distractedResult.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(vulnerableResult.outcome).toBe(RulesOutcome.AMBIGUOUS);
    expect(stackingResult.outcome).toBe(RulesOutcome.AMBIGUOUS);
  });

  it('CRITICAL: No state modification in context effects', () => {
    const distractedEffects = createDistractedEffectsEffects(
      'char-001', 'attack', undefined, 'inv-001'
    );
    const vulnerableEffects = createVulnerableEffectsEffects(
      'char-001', 'attack', undefined, 'inv-002'
    );
    const stackingEffects = createConditionStackingEffects(
      'char-001', 'attack', 'distracted', 'inv-003'
    );

    // Check context effects specifically (they have stateModified)
    const distractedContext = distractedEffects.find(e => e.effectId.includes('_context'));
    expect(distractedContext!.parameters.stateModified).toBe(false);

    const vulnerableContext = vulnerableEffects.find(e => e.effectId.includes('_context'));
    expect(vulnerableContext!.parameters.stateModified).toBe(false);

    const stackingContext = stackingEffects.find(e => e.effectId.includes('_context'));
    expect(stackingContext!.parameters.stateModified).toBe(false);
  });
});

describe('Cross-Cutting: Recovery Attempts Must Not Imply Recovery', () => {
  it('CRITICAL: All recovery rules emit effects', () => {
    const recoveryEffects = createRecoveryFromShakenEffects(
      'char-001', undefined, 'inv-001'
    );
    const threatenedEffects = createRecoveryWhileThreatenedEffects(
      'char-001', 'threatened', undefined, 'inv-002', RulesOutcome.FAIL
    );
    const multipleEffects = createMultipleRecoveryAttemptsEffects(
      'char-001', 'shaken', 'inv-003'
    );

    expect(recoveryEffects.length).toBeGreaterThan(0);
    expect(threatenedEffects.length).toBeGreaterThan(0);
    expect(multipleEffects.length).toBeGreaterThan(0);
  });

  it('CRITICAL: No condition cleared in recovery attempt effects', () => {
    const recoveryEffects = createRecoveryFromShakenEffects(
      'char-001', undefined, 'inv-001'
    );
    const threatenedEffects = createRecoveryWhileThreatenedEffects(
      'char-001', 'threatened', undefined, 'inv-002', RulesOutcome.FAIL
    );

    // Check recovery attempt effects specifically (they have conditionCleared)
    const recoveryAttempt = recoveryEffects.find(e => e.effectId.includes('_recovery_attempt'));
    expect(recoveryAttempt!.parameters.conditionCleared).toBe(false);

    const threatenedAttempt = threatenedEffects.find(e => e.effectId.includes('_recovery_attempt'));
    expect(threatenedAttempt!.parameters.conditionCleared).toBe(false);
  });

  it('CRITICAL: No outcome resolved in any recovery effect', () => {
    const recoveryEffects = createRecoveryFromShakenEffects(
      'char-001', undefined, 'inv-001'
    );

    for (const effect of recoveryEffects) {
      expect(effect.parameters.outcomeResolved).toBe(false);
    }
  });
});
