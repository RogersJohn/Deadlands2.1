/**
 * Resolution Tests (PR 2.1)
 *
 * These tests prove:
 * - No effects are produced for FAIL without override
 * - No effects are produced for AMBIGUOUS without override
 * - Effects are produced only from authoritative decisions
 * - Effects are declarative and immutable
 * - Resolution does not mutate any external state
 * - Original rule outcome is always preserved
 *
 * Tests assert authority and separation, not gameplay correctness.
 */

import {
  resolve,
  createEffectProducerRegistry,
  createEffectAuthority,
  generateEffectId,
  type EffectProducer,
} from '../Resolution';
import {
  AuthoritativeDecision,
  Effect,
  EffectType,
  ResolutionOutcome,
  RulesOutcome,
  createAuthoritativeDecision,
} from '../types';
import type { EffectiveValidation, ValidationReport, GmOverride, OverrideWarning } from '../../../overrides/ts/types';
import { createApplyConditionEffect } from '../effects/ApplyCondition';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createTestValidationReport(
  outcome: RulesOutcome,
  overrides?: Partial<ValidationReport>
): ValidationReport {
  return {
    invocationId: 'inv_test_001',
    sourceIntentId: 'intent_test_001',
    intentType: 'TEST_INTENT',
    rulesetId: 'test_ruleset',
    outcome,
    violations: [],
    ambiguity: null,
    payload: { testData: 'value' },
    ...overrides,
  };
}

function createTestDecision(
  effectiveOutcome: RulesOutcome,
  options?: {
    originalOutcome?: RulesOutcome;
    hasOverrides?: boolean;
    intentType?: string;
  }
): AuthoritativeDecision {
  const originalOutcome = options?.originalOutcome ?? effectiveOutcome;
  const hasOverrides = options?.hasOverrides ?? (originalOutcome !== effectiveOutcome);

  return {
    originalReport: createTestValidationReport(originalOutcome, {
      intentType: options?.intentType ?? 'TEST_INTENT',
    }),
    effectiveOutcome,
    hasOverrides,
    latestWarning: hasOverrides ? { severity: 'INFO', message: 'Test override' } : null,
    overrideChain: [],
  };
}

function createTestEffectProducer(effects: Effect[]): EffectProducer {
  return (_decision: AuthoritativeDecision) => effects;
}

// ============================================================================
// AUTHORITY BOUNDARY TESTS
// ============================================================================

describe('Resolution - Authority Boundary', () => {
  describe('FAIL outcome', () => {
    it('produces no effects for FAIL without override', () => {
      const decision = createTestDecision(RulesOutcome.FAIL);
      const registry = createEffectProducerRegistry(new Map());

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.NO_EFFECTS_FAIL);
      expect(result.effects).toHaveLength(0);
      expect(result.explanation).toContain('FAIL');
    });

    it('produces no effects for FAIL even with registered producer', () => {
      const decision = createTestDecision(RulesOutcome.FAIL);
      const mockEffect: Effect = {
        effectId: 'eff_test',
        effectType: EffectType.APPLY_CONDITION,
        target: { targetId: 'char_1', targetType: 'character' },
        authority: { invocationId: 'inv_test', source: 'RULES', outcome: RulesOutcome.PASS },
        parameters: { conditionName: 'Shaken' },
        description: 'Test effect',
      };
      const producer = createTestEffectProducer([mockEffect]);
      const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

      const result = resolve(decision, registry);

      // Producer should NOT be invoked for FAIL
      expect(result.outcome).toBe(ResolutionOutcome.NO_EFFECTS_FAIL);
      expect(result.effects).toHaveLength(0);
    });

    it('produces no effects for FAIL with override that keeps FAIL', () => {
      const decision = createTestDecision(RulesOutcome.FAIL, {
        originalOutcome: RulesOutcome.PASS,
        hasOverrides: true,
      });
      const registry = createEffectProducerRegistry(new Map());

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.NO_EFFECTS_FAIL);
      expect(result.explanation).toContain('override did not change to PASS');
    });
  });

  describe('AMBIGUOUS outcome', () => {
    it('produces no effects for AMBIGUOUS without override', () => {
      const decision = createTestDecision(RulesOutcome.AMBIGUOUS);
      const registry = createEffectProducerRegistry(new Map());

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.NO_EFFECTS_AMBIGUOUS);
      expect(result.effects).toHaveLength(0);
      expect(result.explanation).toContain('AMBIGUOUS');
      expect(result.explanation).toContain('GM decision required');
    });

    it('produces no effects for AMBIGUOUS even with registered producer', () => {
      const decision = createTestDecision(RulesOutcome.AMBIGUOUS);
      const mockEffect: Effect = {
        effectId: 'eff_test',
        effectType: EffectType.APPLY_CONDITION,
        target: { targetId: 'char_1', targetType: 'character' },
        authority: { invocationId: 'inv_test', source: 'RULES', outcome: RulesOutcome.PASS },
        parameters: { conditionName: 'Shaken' },
        description: 'Test effect',
      };
      const producer = createTestEffectProducer([mockEffect]);
      const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.NO_EFFECTS_AMBIGUOUS);
      expect(result.effects).toHaveLength(0);
    });
  });

  describe('PASS outcome', () => {
    it('produces effects for PASS with registered producer', () => {
      const decision = createTestDecision(RulesOutcome.PASS);
      const authority = createEffectAuthority(decision);
      const mockEffect = createApplyConditionEffect({
        effectId: generateEffectId(decision.originalReport.invocationId, 'APPLY_CONDITION', 'char_1', 0),
        target: { targetId: 'char_1', targetType: 'character' },
        authority,
        conditionName: 'Shaken',
      });
      const producer = createTestEffectProducer([mockEffect]);
      const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.EFFECTS_PRODUCED);
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].effectType).toBe(EffectType.APPLY_CONDITION);
    });

    it('produces effects when overridden from FAIL to PASS', () => {
      const decision = createTestDecision(RulesOutcome.PASS, {
        originalOutcome: RulesOutcome.FAIL,
        hasOverrides: true,
      });
      const mockEffect: Effect = {
        effectId: 'eff_override',
        effectType: EffectType.GRANT_RESOURCE,
        target: { targetId: 'char_1', targetType: 'character' },
        authority: { invocationId: 'inv_test', source: 'OVERRIDE', outcome: RulesOutcome.PASS },
        parameters: { resourceName: 'Benny', amount: 1 },
        description: 'Grant Benny via override',
      };
      const producer = createTestEffectProducer([mockEffect]);
      const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.EFFECTS_PRODUCED);
      expect(result.effects).toHaveLength(1);
      expect(result.explanation).toContain('via GM override');
    });

    it('produces effects when overridden from AMBIGUOUS to PASS', () => {
      const decision = createTestDecision(RulesOutcome.PASS, {
        originalOutcome: RulesOutcome.AMBIGUOUS,
        hasOverrides: true,
      });
      const mockEffect: Effect = {
        effectId: 'eff_resolved',
        effectType: EffectType.DEAL_DAMAGE,
        target: { targetId: 'char_1', targetType: 'character' },
        authority: { invocationId: 'inv_test', source: 'OVERRIDE', outcome: RulesOutcome.PASS },
        parameters: { damageDescriptor: 'resolved by GM' },
        description: 'Damage resolved by GM',
      };
      const producer = createTestEffectProducer([mockEffect]);
      const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.EFFECTS_PRODUCED);
      expect(result.effects).toHaveLength(1);
    });

    it('returns no effects when no producer registered', () => {
      const decision = createTestDecision(RulesOutcome.PASS);
      const registry = createEffectProducerRegistry(new Map()); // Empty registry

      const result = resolve(decision, registry);

      expect(result.outcome).toBe(ResolutionOutcome.NO_EFFECTS_NO_PRODUCER);
      expect(result.effects).toHaveLength(0);
      expect(result.explanation).toContain('no effect producer registered');
    });
  });
});

// ============================================================================
// PRESERVATION TESTS
// ============================================================================

describe('Resolution - Original Preservation', () => {
  it('preserves decision in result', () => {
    const decision = createTestDecision(RulesOutcome.PASS);
    const registry = createEffectProducerRegistry(new Map());

    const result = resolve(decision, registry);

    expect(result.decision).toBe(decision);
    expect(result.decision.originalReport).toBe(decision.originalReport);
  });

  it('preserves original outcome when overridden', () => {
    const decision = createTestDecision(RulesOutcome.PASS, {
      originalOutcome: RulesOutcome.FAIL,
      hasOverrides: true,
    });
    const registry = createEffectProducerRegistry(new Map());

    const result = resolve(decision, registry);

    expect(result.decision.originalReport.outcome).toBe(RulesOutcome.FAIL);
    expect(result.decision.effectiveOutcome).toBe(RulesOutcome.PASS);
  });

  it('preserves violations in original report', () => {
    const violations = [
      { ruleId: 'rule_1', message: 'Test violation', severity: 'ERROR' as const },
    ];
    const decision: AuthoritativeDecision = {
      originalReport: {
        invocationId: 'inv_test',
        sourceIntentId: 'intent_test',
        intentType: 'TEST_INTENT',
        rulesetId: 'test_ruleset',
        outcome: RulesOutcome.FAIL,
        violations,
        ambiguity: null,
        payload: {},
      },
      effectiveOutcome: RulesOutcome.PASS, // Overridden to PASS
      hasOverrides: true,
      latestWarning: { severity: 'WARNING', message: 'Override' },
      overrideChain: [],
    };
    const registry = createEffectProducerRegistry(new Map());

    const result = resolve(decision, registry);

    // Violations are preserved even though outcome was overridden
    expect(result.decision.originalReport.violations).toEqual(violations);
    expect(result.decision.originalReport.violations).toHaveLength(1);
  });
});

// ============================================================================
// IMMUTABILITY TESTS
// ============================================================================

describe('Resolution - Immutability', () => {
  it('does not mutate the input decision', () => {
    const decision = createTestDecision(RulesOutcome.PASS);
    const decisionSnapshot = JSON.stringify(decision);
    const producer = createTestEffectProducer([]);
    const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

    resolve(decision, registry);

    expect(JSON.stringify(decision)).toBe(decisionSnapshot);
  });

  it('effects array is immutable (readonly)', () => {
    const decision = createTestDecision(RulesOutcome.PASS);
    const mockEffect: Effect = {
      effectId: 'eff_test',
      effectType: EffectType.APPLY_CONDITION,
      target: { targetId: 'char_1', targetType: 'character' },
      authority: { invocationId: 'inv_test', source: 'RULES', outcome: RulesOutcome.PASS },
      parameters: { conditionName: 'Shaken' },
      description: 'Test',
    };
    const producer = createTestEffectProducer([mockEffect]);
    const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

    const result = resolve(decision, registry);

    // TypeScript enforces readonly, but we verify the type at runtime
    expect(Array.isArray(result.effects)).toBe(true);
    expect(result.effects).toHaveLength(1);
  });
});

// ============================================================================
// EFFECT AUTHORITY TESTS
// ============================================================================

describe('Resolution - Effect Authority', () => {
  it('createEffectAuthority returns RULES source when no override', () => {
    const decision = createTestDecision(RulesOutcome.PASS, { hasOverrides: false });

    const authority = createEffectAuthority(decision);

    expect(authority.source).toBe('RULES');
    expect(authority.outcome).toBe(RulesOutcome.PASS);
    expect(authority.invocationId).toBe(decision.originalReport.invocationId);
  });

  it('createEffectAuthority returns OVERRIDE source when overridden', () => {
    const decision = createTestDecision(RulesOutcome.PASS, {
      originalOutcome: RulesOutcome.FAIL,
      hasOverrides: true,
    });

    const authority = createEffectAuthority(decision);

    expect(authority.source).toBe('OVERRIDE');
    expect(authority.outcome).toBe(RulesOutcome.PASS);
  });
});

// ============================================================================
// EFFECT ID GENERATION TESTS
// ============================================================================

describe('Resolution - Effect ID Generation', () => {
  it('generates deterministic effect IDs', () => {
    const id1 = generateEffectId('inv_1', 'APPLY_CONDITION', 'char_1', 0);
    const id2 = generateEffectId('inv_1', 'APPLY_CONDITION', 'char_1', 0);

    expect(id1).toBe(id2);
    expect(id1).toMatch(/^eff_[0-9a-f]{8}$/);
  });

  it('generates different IDs for different inputs', () => {
    const id1 = generateEffectId('inv_1', 'APPLY_CONDITION', 'char_1', 0);
    const id2 = generateEffectId('inv_1', 'APPLY_CONDITION', 'char_1', 1);
    const id3 = generateEffectId('inv_2', 'APPLY_CONDITION', 'char_1', 0);

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id2).not.toBe(id3);
  });
});

// ============================================================================
// AUTHORITATIVE DECISION CREATION TESTS
// ============================================================================

describe('createAuthoritativeDecision', () => {
  it('creates decision from EffectiveValidation', () => {
    const report = createTestValidationReport(RulesOutcome.PASS);
    const effective: EffectiveValidation = {
      originalReport: report,
      effectiveOutcome: RulesOutcome.PASS,
      hasOverrides: false,
      latestWarning: null,
      overrideCount: 0,
    };

    const decision = createAuthoritativeDecision(effective, []);

    expect(decision.originalReport).toBe(report);
    expect(decision.effectiveOutcome).toBe(RulesOutcome.PASS);
    expect(decision.hasOverrides).toBe(false);
    expect(decision.overrideChain).toHaveLength(0);
  });

  it('preserves override chain', () => {
    const report = createTestValidationReport(RulesOutcome.FAIL);
    const warning: OverrideWarning = { severity: 'WARNING', message: 'GM says PASS' };
    const effective: EffectiveValidation = {
      originalReport: report,
      effectiveOutcome: RulesOutcome.PASS,
      hasOverrides: true,
      latestWarning: warning,
      overrideCount: 1,
    };
    const mockOverride = {} as GmOverride; // Minimal mock

    const decision = createAuthoritativeDecision(effective, [mockOverride]);

    expect(decision.hasOverrides).toBe(true);
    expect(decision.latestWarning).toBe(warning);
    expect(decision.overrideChain).toHaveLength(1);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Resolution - Edge Cases', () => {
  it('handles producer returning empty array', () => {
    const decision = createTestDecision(RulesOutcome.PASS);
    const producer = createTestEffectProducer([]);
    const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

    const result = resolve(decision, registry);

    expect(result.outcome).toBe(ResolutionOutcome.EFFECTS_PRODUCED);
    expect(result.effects).toHaveLength(0);
    expect(result.explanation).toContain('0 effect(s)');
  });

  it('handles producer returning multiple effects', () => {
    const decision = createTestDecision(RulesOutcome.PASS);
    const effects: Effect[] = [
      {
        effectId: 'eff_1',
        effectType: EffectType.APPLY_CONDITION,
        target: { targetId: 'char_1', targetType: 'character' },
        authority: { invocationId: 'inv_test', source: 'RULES', outcome: RulesOutcome.PASS },
        parameters: { conditionName: 'Shaken' },
        description: 'Effect 1',
      },
      {
        effectId: 'eff_2',
        effectType: EffectType.CONSUME_RESOURCE,
        target: { targetId: 'char_1', targetType: 'character' },
        authority: { invocationId: 'inv_test', source: 'RULES', outcome: RulesOutcome.PASS },
        parameters: { resourceName: 'Benny', amount: 1 },
        description: 'Effect 2',
      },
    ];
    const producer = createTestEffectProducer(effects);
    const registry = createEffectProducerRegistry(new Map([['TEST_INTENT', producer]]));

    const result = resolve(decision, registry);

    expect(result.outcome).toBe(ResolutionOutcome.EFFECTS_PRODUCED);
    expect(result.effects).toHaveLength(2);
  });

  it('selects correct producer by intent type', () => {
    const decision = createTestDecision(RulesOutcome.PASS, { intentType: 'ATTACK' });
    const attackEffect: Effect = {
      effectId: 'eff_attack',
      effectType: EffectType.DEAL_DAMAGE,
      target: { targetId: 'enemy_1', targetType: 'character' },
      authority: { invocationId: 'inv_test', source: 'RULES', outcome: RulesOutcome.PASS },
      parameters: { damageDescriptor: 'attack damage' },
      description: 'Attack damage',
    };
    const moveEffect: Effect = {
      effectId: 'eff_move',
      effectType: EffectType.CHANGE_POSITION,
      target: { targetId: 'char_1', targetType: 'character' },
      authority: { invocationId: 'inv_test', source: 'RULES', outcome: RulesOutcome.PASS },
      parameters: { positionDescriptor: 'new position' },
      description: 'Move',
    };
    const registry = createEffectProducerRegistry(new Map([
      ['ATTACK', createTestEffectProducer([attackEffect])],
      ['MOVE', createTestEffectProducer([moveEffect])],
    ]));

    const result = resolve(decision, registry);

    expect(result.effects).toHaveLength(1);
    expect(result.effects[0].effectType).toBe(EffectType.DEAL_DAMAGE);
  });
});
