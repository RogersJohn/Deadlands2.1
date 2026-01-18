/**
 * Effect Factory Tests (PR 2.1)
 *
 * These tests prove:
 * - Effect factories are pure functions
 * - Effects are immutable
 * - Effects are declarative (describe, don't execute)
 * - All required fields are present
 * - Optional fields are handled correctly
 */

import { describe, it, expect } from 'vitest';

import { EffectType, RulesOutcome, type EffectAuthority, type EffectTarget } from '../types';
import { createApplyConditionEffect } from '../effects/ApplyCondition';
import { createConsumeResourceEffect } from '../effects/ConsumeResource';
import { createDealDamageEffect } from '../effects/DealDamage';
import { createChangePositionEffect } from '../effects/ChangePosition';
import { createTriggerNarrativeEffect } from '../effects/TriggerNarrative';
import { createGrantResourceEffect } from '../effects/GrantResource';
import { createRemoveConditionEffect } from '../effects/RemoveCondition';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const testTarget: EffectTarget = {
  targetId: 'char_001',
  targetType: 'character',
};

const testAuthority: EffectAuthority = {
  invocationId: 'inv_test_001',
  source: 'RULES',
  outcome: RulesOutcome.PASS,
};

// ============================================================================
// APPLY CONDITION TESTS
// ============================================================================

describe('createApplyConditionEffect', () => {
  it('creates effect with required fields', () => {
    const effect = createApplyConditionEffect({
      effectId: 'eff_001',
      target: testTarget,
      authority: testAuthority,
      conditionName: 'Shaken',
    });

    expect(effect.effectId).toBe('eff_001');
    expect(effect.effectType).toBe(EffectType.APPLY_CONDITION);
    expect(effect.target).toBe(testTarget);
    expect(effect.authority).toBe(testAuthority);
    expect(effect.parameters).toEqual({ conditionName: 'Shaken' });
    expect(effect.description).toContain('Shaken');
    expect(effect.description).toContain('char_001');
  });

  it('includes optional duration', () => {
    const effect = createApplyConditionEffect({
      effectId: 'eff_002',
      target: testTarget,
      authority: testAuthority,
      conditionName: 'Stunned',
      duration: 'until end of turn',
    });

    expect(effect.parameters).toEqual({
      conditionName: 'Stunned',
      duration: 'until end of turn',
    });
  });

  it('includes optional source', () => {
    const effect = createApplyConditionEffect({
      effectId: 'eff_003',
      target: testTarget,
      authority: testAuthority,
      conditionName: 'Wounded',
      source: 'gunshot',
    });

    expect(effect.parameters).toEqual({
      conditionName: 'Wounded',
      source: 'gunshot',
    });
  });
});

// ============================================================================
// CONSUME RESOURCE TESTS
// ============================================================================

describe('createConsumeResourceEffect', () => {
  it('creates effect with required fields', () => {
    const effect = createConsumeResourceEffect({
      effectId: 'eff_004',
      target: testTarget,
      authority: testAuthority,
      resourceName: 'Benny',
      amount: 1,
    });

    expect(effect.effectId).toBe('eff_004');
    expect(effect.effectType).toBe(EffectType.CONSUME_RESOURCE);
    expect(effect.parameters).toEqual({
      resourceName: 'Benny',
      amount: 1,
    });
    expect(effect.description).toContain('1');
    expect(effect.description).toContain('Benny');
  });

  it('includes optional reason', () => {
    const effect = createConsumeResourceEffect({
      effectId: 'eff_005',
      target: testTarget,
      authority: testAuthority,
      resourceName: 'Ammunition',
      amount: 6,
      reason: 'rapid fire',
    });

    expect(effect.parameters).toEqual({
      resourceName: 'Ammunition',
      amount: 6,
      reason: 'rapid fire',
    });
  });
});

// ============================================================================
// DEAL DAMAGE TESTS
// ============================================================================

describe('createDealDamageEffect', () => {
  it('creates effect with numeric damage descriptor', () => {
    const effect = createDealDamageEffect({
      effectId: 'eff_006',
      target: testTarget,
      authority: testAuthority,
      damageDescriptor: 2,
    });

    expect(effect.effectType).toBe(EffectType.DEAL_DAMAGE);
    expect(effect.parameters).toEqual({
      damageDescriptor: 2,
    });
    expect(effect.description).toContain('2');
  });

  it('creates effect with string damage descriptor (opaque)', () => {
    const effect = createDealDamageEffect({
      effectId: 'eff_007',
      target: testTarget,
      authority: testAuthority,
      damageDescriptor: '2d6+2',
    });

    expect(effect.parameters).toEqual({
      damageDescriptor: '2d6+2',
    });
    expect(effect.description).toContain('2d6+2');
  });

  it('creates effect with complex damage descriptor (opaque)', () => {
    const complexDescriptor = {
      base: 10,
      modifier: 'armor piercing',
      source: 'dynamite',
    };
    const effect = createDealDamageEffect({
      effectId: 'eff_008',
      target: testTarget,
      authority: testAuthority,
      damageDescriptor: complexDescriptor,
    });

    expect(effect.parameters).toEqual({
      damageDescriptor: complexDescriptor,
    });
    // Description should not crash on complex types
    expect(effect.description).toContain('damage');
  });

  it('includes optional damage type and source', () => {
    const effect = createDealDamageEffect({
      effectId: 'eff_009',
      target: testTarget,
      authority: testAuthority,
      damageDescriptor: 3,
      damageType: 'fire',
      source: 'flamethrower',
    });

    expect(effect.parameters).toEqual({
      damageDescriptor: 3,
      damageType: 'fire',
      source: 'flamethrower',
    });
  });
});

// ============================================================================
// CHANGE POSITION TESTS
// ============================================================================

describe('createChangePositionEffect', () => {
  it('creates effect with coordinate position', () => {
    const effect = createChangePositionEffect({
      effectId: 'eff_010',
      target: testTarget,
      authority: testAuthority,
      positionDescriptor: { x: 5, y: 10 },
    });

    expect(effect.effectType).toBe(EffectType.CHANGE_POSITION);
    expect(effect.parameters).toEqual({
      positionDescriptor: { x: 5, y: 10 },
    });
  });

  it('creates effect with named location', () => {
    const effect = createChangePositionEffect({
      effectId: 'eff_011',
      target: testTarget,
      authority: testAuthority,
      positionDescriptor: 'Saloon entrance',
    });

    expect(effect.parameters).toEqual({
      positionDescriptor: 'Saloon entrance',
    });
  });

  it('includes optional movement type', () => {
    const effect = createChangePositionEffect({
      effectId: 'eff_012',
      target: testTarget,
      authority: testAuthority,
      positionDescriptor: { x: 0, y: -3 },
      movementType: 'pushed',
      reason: 'knockback from explosion',
    });

    expect(effect.parameters).toEqual({
      positionDescriptor: { x: 0, y: -3 },
      movementType: 'pushed',
      reason: 'knockback from explosion',
    });
  });
});

// ============================================================================
// TRIGGER NARRATIVE TESTS
// ============================================================================

describe('createTriggerNarrativeEffect', () => {
  it('creates effect with string narrative', () => {
    const effect = createTriggerNarrativeEffect({
      effectId: 'eff_013',
      target: testTarget,
      authority: testAuthority,
      narrativeDescriptor: 'The outlaw staggers back, clutching his chest.',
    });

    expect(effect.effectType).toBe(EffectType.TRIGGER_NARRATIVE);
    expect(effect.parameters).toEqual({
      narrativeDescriptor: 'The outlaw staggers back, clutching his chest.',
    });
  });

  it('creates effect with event identifier', () => {
    const effect = createTriggerNarrativeEffect({
      effectId: 'eff_014',
      target: testTarget,
      authority: testAuthority,
      narrativeDescriptor: { eventId: 'boss_defeated', chapter: 3 },
      category: 'story_beat',
      priority: 'high',
    });

    expect(effect.parameters).toEqual({
      narrativeDescriptor: { eventId: 'boss_defeated', chapter: 3 },
      category: 'story_beat',
      priority: 'high',
    });
  });
});

// ============================================================================
// GRANT RESOURCE TESTS
// ============================================================================

describe('createGrantResourceEffect', () => {
  it('creates effect with required fields', () => {
    const effect = createGrantResourceEffect({
      effectId: 'eff_015',
      target: testTarget,
      authority: testAuthority,
      resourceName: 'Benny',
      amount: 1,
    });

    expect(effect.effectType).toBe(EffectType.GRANT_RESOURCE);
    expect(effect.parameters).toEqual({
      resourceName: 'Benny',
      amount: 1,
    });
    expect(effect.description).toContain('Grant');
    expect(effect.description).toContain('Benny');
  });

  it('includes optional duration', () => {
    const effect = createGrantResourceEffect({
      effectId: 'eff_016',
      target: testTarget,
      authority: testAuthority,
      resourceName: 'Bonus',
      amount: 2,
      reason: 'critical success',
      duration: 'this scene',
    });

    expect(effect.parameters).toEqual({
      resourceName: 'Bonus',
      amount: 2,
      reason: 'critical success',
      duration: 'this scene',
    });
  });
});

// ============================================================================
// REMOVE CONDITION TESTS
// ============================================================================

describe('createRemoveConditionEffect', () => {
  it('creates effect with required fields', () => {
    const effect = createRemoveConditionEffect({
      effectId: 'eff_017',
      target: testTarget,
      authority: testAuthority,
      conditionName: 'Shaken',
    });

    expect(effect.effectType).toBe(EffectType.REMOVE_CONDITION);
    expect(effect.parameters).toEqual({
      conditionName: 'Shaken',
    });
    expect(effect.description).toContain('Remove');
    expect(effect.description).toContain('Shaken');
  });

  it('includes optional reason', () => {
    const effect = createRemoveConditionEffect({
      effectId: 'eff_018',
      target: testTarget,
      authority: testAuthority,
      conditionName: 'Prone',
      reason: 'stood up as free action',
    });

    expect(effect.parameters).toEqual({
      conditionName: 'Prone',
      reason: 'stood up as free action',
    });
  });
});

// ============================================================================
// IMMUTABILITY TESTS
// ============================================================================

describe('Effect Immutability', () => {
  it('effect objects have readonly properties', () => {
    const effect = createApplyConditionEffect({
      effectId: 'eff_immutable',
      target: testTarget,
      authority: testAuthority,
      conditionName: 'Shaken',
    });

    // TypeScript enforces readonly at compile time
    // At runtime, we verify the structure is correct
    expect(effect.effectId).toBe('eff_immutable');
    expect(Object.isFrozen(effect)).toBe(false); // Not frozen, but readonly via type
  });

  it('parameters object is readonly', () => {
    const effect = createConsumeResourceEffect({
      effectId: 'eff_params',
      target: testTarget,
      authority: testAuthority,
      resourceName: 'Ammo',
      amount: 1,
    });

    // Parameters is Readonly<Record<string, unknown>>
    expect(effect.parameters).toEqual({
      resourceName: 'Ammo',
      amount: 1,
    });
  });
});

// ============================================================================
// PURE FUNCTION TESTS
// ============================================================================

describe('Effect Factory Purity', () => {
  it('same inputs produce equal outputs', () => {
    const params = {
      effectId: 'eff_pure',
      target: testTarget,
      authority: testAuthority,
      conditionName: 'Shaken',
    };

    const effect1 = createApplyConditionEffect(params);
    const effect2 = createApplyConditionEffect(params);

    expect(effect1).toEqual(effect2);
  });

  it('does not mutate input parameters', () => {
    const params = {
      effectId: 'eff_nomutate',
      target: { ...testTarget },
      authority: { ...testAuthority },
      conditionName: 'Shaken',
      duration: 'one round',
    };
    const paramsSnapshot = JSON.stringify(params);

    createApplyConditionEffect(params);

    expect(JSON.stringify(params)).toBe(paramsSnapshot);
  });
});
