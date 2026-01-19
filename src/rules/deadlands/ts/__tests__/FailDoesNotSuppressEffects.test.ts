/**
 * FAIL Does Not Suppress Effects Tests (PR 8.2)
 *
 * CRITICAL INVARIANT: FAIL does not mean "nothing happens."
 *
 * These tests prove that when validation returns FAIL or AMBIGUOUS:
 * - Effects are STILL emitted
 * - The attempt is STILL recorded
 * - Failure describes LEGALITY, not physical reality
 *
 * WHAT THESE TESTS PROVE:
 * - FiringWithNoAmmo: FAIL but effects emit (trigger pull, click)
 * - CalledShots: FAIL but attack effects emit
 * - CoverVsConcealment: AMBIGUOUS but attack effects emit
 *
 * WHAT THESE TESTS DO NOT PROVE:
 * - Hit/miss determination
 * - Damage calculation
 * - Modifier computation
 * - Any arithmetic
 */

import { describe, it, expect } from 'vitest';
import {
  createFiringWithNoAmmoPipeline,
  createFiringWithNoAmmoEffects,
  isFiringWithNoAmmoPayload,
  FIRING_WITH_NO_AMMO_INTENT_TYPE,
  type FiringWithNoAmmoPayload,
} from '../FiringWithNoAmmo';
import {
  createCalledShotsPipeline,
  createCalledShotsEffects,
  isCalledShotsPayload,
  CALLED_SHOTS_INTENT_TYPE,
  type CalledShotsPayload,
} from '../CalledShots';
import {
  createCoverVsConcealmentPipeline,
  createCoverVsConcealmentEffects,
  isCoverVsConcealmentPayload,
  COVER_VS_CONCEALMENT_INTENT_TYPE,
  type CoverVsConcealmentPayload,
} from '../CoverVsConcealment';
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
// FIRING WITH NO AMMO TESTS
// ============================================================================

describe('FiringWithNoAmmo - FAIL Does Not Suppress Effects', () => {
  const pipeline = createFiringWithNoAmmoPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: FiringWithNoAmmoPayload = {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        hasAmmo: false,
      };
      expect(isFiringWithNoAmmoPayload(payload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(isFiringWithNoAmmoPayload(null)).toBe(false);
      expect(isFiringWithNoAmmoPayload({})).toBe(false);
      expect(isFiringWithNoAmmoPayload({ characterId: 'char' })).toBe(false);
    });
  });

  describe('Validation - No Ammo FAILS But Records Attempt', () => {
    it('CRITICAL: should return FAIL when weapon has no ammo', () => {
      const payload: FiringWithNoAmmoPayload = {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        weaponDescription: 'Colt Peacemaker',
        hasAmmo: false,
      };

      const intent = createMockIntent(FIRING_WITH_NO_AMMO_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: FAIL does not mean "nothing happens"
      expect(result.outcome).toBe(RulesOutcome.FAIL);
    });

    it('CRITICAL: should emit violations on FAIL', () => {
      const payload: FiringWithNoAmmoPayload = {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        hasAmmo: false,
      };

      const intent = createMockIntent(FIRING_WITH_NO_AMMO_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].ruleId).toBe('SW_COMBAT_001');
      expect(result.violations[0].severity).toBe('ERROR');
    });

    it('CRITICAL: should emit HardBlock conflict on no ammo', () => {
      const payload: FiringWithNoAmmoPayload = {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        hasAmmo: false,
      };

      const intent = createMockIntent(FIRING_WITH_NO_AMMO_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].kind).toBe(ConflictKind.HardBlock);
      expect(result.conflicts[0].tags).toContain('attempt-recorded');
    });

    it('should return PASS when weapon has ammo', () => {
      const payload: FiringWithNoAmmoPayload = {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        hasAmmo: true,
      };

      const intent = createMockIntent(FIRING_WITH_NO_AMMO_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.PASS);
      expect(result.violations.length).toBe(0);
    });
  });

  describe('Effects - FAIL Still Emits Effects', () => {
    it('CRITICAL: effects.length > 0 even when FAIL', () => {
      const effects = createFiringWithNoAmmoEffects(
        'char-001',
        'weapon-001',
        'Colt Peacemaker',
        'target-001',
        'inv-001'
      );

      // THE CRITICAL INVARIANT: FAIL does not suppress effects
      expect(effects.length).toBeGreaterThan(0);
    });

    it('should emit trigger pull effect despite FAIL', () => {
      const effects = createFiringWithNoAmmoEffects(
        'char-001',
        'weapon-001',
        'Colt Peacemaker',
        undefined,
        'inv-001'
      );

      const triggerPull = effects.find(e => e.effectId.includes('trigger_pull'));
      expect(triggerPull).toBeDefined();
      expect(triggerPull!.authority.outcome).toBe(RulesOutcome.FAIL);
      expect(triggerPull!.parameters.attemptRecorded).toBe(true);
    });

    it('should emit empty chamber effect despite FAIL', () => {
      const effects = createFiringWithNoAmmoEffects(
        'char-001',
        'weapon-001',
        'Colt Peacemaker',
        undefined,
        'inv-001'
      );

      const emptyClick = effects.find(e => e.effectId.includes('empty_chamber'));
      expect(emptyClick).toBeDefined();
      expect(emptyClick!.authority.outcome).toBe(RulesOutcome.FAIL);
      expect(emptyClick!.parameters.soundType).toBe('click');
    });

    it('should emit target attempt effect when target specified', () => {
      const effects = createFiringWithNoAmmoEffects(
        'char-001',
        'weapon-001',
        'Colt Peacemaker',
        'target-001',
        'inv-001'
      );

      const targetAttempt = effects.find(e => e.effectId.includes('target_attempt'));
      expect(targetAttempt).toBeDefined();
      expect(targetAttempt!.authority.outcome).toBe(RulesOutcome.FAIL);
      expect(targetAttempt!.parameters.attackOutcome).toBe('no_ammo');
    });

    it('should not emit target effect when no target', () => {
      const effects = createFiringWithNoAmmoEffects(
        'char-001',
        'weapon-001',
        'Colt Peacemaker',
        undefined,
        'inv-001'
      );

      const targetAttempt = effects.find(e => e.effectId.includes('target_attempt'));
      expect(targetAttempt).toBeUndefined();
    });
  });

  describe('Cost Validation - FAIL Does Not Waive Cost', () => {
    it('should emit cost even when FAIL', () => {
      const payload: FiringWithNoAmmoPayload = {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        hasAmmo: false,
      };

      const intent = createMockIntent(FIRING_WITH_NO_AMMO_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.costValidation).toBeDefined();
      expect(result.costValidation!.cost.kind).toBe('ActionCostEffect');
      expect(result.costValidation!.cost.tags).toContain('attack');
    });
  });
});

// ============================================================================
// CALLED SHOTS TESTS
// ============================================================================

describe('CalledShots - FAIL Does Not Suppress Effects', () => {
  const pipeline = createCalledShotsPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload', () => {
      const payload: CalledShotsPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        calledShotTarget: 'head',
        targetId: 'target-001',
      };
      expect(isCalledShotsPayload(payload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(isCalledShotsPayload(null)).toBe(false);
      expect(isCalledShotsPayload({})).toBe(false);
      expect(isCalledShotsPayload({ characterId: 'char' })).toBe(false);
    });
  });

  describe('Validation - Called Shot FAILS But Records Attack', () => {
    it('CRITICAL: should return FAIL for called shot', () => {
      const payload: CalledShotsPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        calledShotTarget: 'head',
        targetId: 'target-001',
      };

      const intent = createMockIntent(CALLED_SHOTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: FAIL does not mean "nothing happens"
      expect(result.outcome).toBe(RulesOutcome.FAIL);
    });

    it('CRITICAL: should emit WARNING violation on FAIL', () => {
      const payload: CalledShotsPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        calledShotTarget: 'head',
        targetId: 'target-001',
      };

      const intent = createMockIntent(CALLED_SHOTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].severity).toBe('WARNING');
      expect(result.violations[0].message).toContain('attack attempt was made');
    });

    it('CRITICAL: should emit SoftBlock conflict for precision', () => {
      const payload: CalledShotsPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        calledShotTarget: 'arm',
        targetId: 'target-001',
      };

      const intent = createMockIntent(CALLED_SHOTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('attempt-recorded');
    });
  });

  describe('Effects - FAIL Still Emits Attack Effects', () => {
    it('CRITICAL: effects.length > 0 even when FAIL', () => {
      const effects = createCalledShotsEffects(
        'char-001',
        'pistol shot',
        'head',
        'target-001',
        'Colt Peacemaker',
        'inv-001',
        RulesOutcome.FAIL
      );

      // THE CRITICAL INVARIANT: FAIL does not suppress effects
      expect(effects.length).toBeGreaterThan(0);
    });

    it('should emit attack effect despite FAIL', () => {
      const effects = createCalledShotsEffects(
        'char-001',
        'pistol shot',
        'head',
        'target-001',
        'Colt Peacemaker',
        'inv-001',
        RulesOutcome.FAIL
      );

      const attack = effects.find(e => e.effectId.includes('_attack'));
      expect(attack).toBeDefined();
      expect(attack!.authority.outcome).toBe(RulesOutcome.FAIL);
      expect(attack!.parameters.isCalledShot).toBe(true);
      expect(attack!.parameters.attemptRecorded).toBe(true);
    });

    it('should emit called shot targeting effect despite FAIL', () => {
      const effects = createCalledShotsEffects(
        'char-001',
        'pistol shot',
        'leg',
        'target-001',
        'Colt Peacemaker',
        'inv-001',
        RulesOutcome.FAIL
      );

      const calledShot = effects.find(e => e.effectId.includes('_called_shot'));
      expect(calledShot).toBeDefined();
      expect(calledShot!.authority.outcome).toBe(RulesOutcome.FAIL);
      expect(calledShot!.parameters.calledShotTarget).toBe('leg');
      expect(calledShot!.parameters.targetLocation).toBe('leg');
    });

    it('should record various called shot targets', () => {
      const targets = ['head', 'arm', 'leg', 'weapon', 'vital organ'];

      for (const target of targets) {
        const effects = createCalledShotsEffects(
          'char-001',
          'pistol shot',
          target,
          'target-001',
          undefined,
          'inv-001',
          RulesOutcome.FAIL
        );

        expect(effects.length).toBeGreaterThan(0);
        const calledShot = effects.find(e => e.effectId.includes('_called_shot'));
        expect(calledShot!.parameters.calledShotTarget).toBe(target);
      }
    });
  });

  describe('Cost Validation - FAIL Does Not Waive Cost', () => {
    it('should emit cost even when FAIL', () => {
      const payload: CalledShotsPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        calledShotTarget: 'head',
        targetId: 'target-001',
      };

      const intent = createMockIntent(CALLED_SHOTS_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.costValidation).toBeDefined();
      expect(result.costValidation!.cost.tags).toContain('called-shot');
    });
  });
});

// ============================================================================
// COVER VS CONCEALMENT TESTS
// ============================================================================

describe('CoverVsConcealment - AMBIGUOUS Does Not Suppress Effects', () => {
  const pipeline = createCoverVsConcealmentPipeline();

  describe('Type Guard', () => {
    it('should validate correct payload with cover', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'cover',
      };
      expect(isCoverVsConcealmentPayload(payload)).toBe(true);
    });

    it('should validate correct payload with concealment', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'rifle shot',
        targetId: 'target-001',
        obstructionType: 'concealment',
      };
      expect(isCoverVsConcealmentPayload(payload)).toBe(true);
    });

    it('should validate correct payload with both', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'shotgun blast',
        targetId: 'target-001',
        obstructionType: 'both',
      };
      expect(isCoverVsConcealmentPayload(payload)).toBe(true);
    });

    it('should reject invalid payload', () => {
      expect(isCoverVsConcealmentPayload(null)).toBe(false);
      expect(isCoverVsConcealmentPayload({})).toBe(false);
      expect(isCoverVsConcealmentPayload({ obstructionType: 'invalid' })).toBe(false);
    });
  });

  describe('Validation - Cover Returns AMBIGUOUS But Records Attack', () => {
    it('CRITICAL: should return AMBIGUOUS for cover', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'cover',
      };

      const intent = createMockIntent(COVER_VS_CONCEALMENT_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      // CRITICAL: AMBIGUOUS does not suppress effects
      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('CRITICAL: should return AMBIGUOUS for concealment', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'concealment',
      };

      const intent = createMockIntent(COVER_VS_CONCEALMENT_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('CRITICAL: should return AMBIGUOUS for both', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'both',
      };

      const intent = createMockIntent(COVER_VS_CONCEALMENT_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('CRITICAL: should emit SoftBlock conflict for obstruction', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'cover',
        obstructionDescription: 'behind stone wall',
      };

      const intent = createMockIntent(COVER_VS_CONCEALMENT_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
      expect(result.conflicts[0].tags).toContain('attempt-recorded');
      expect(result.conflicts[0].message).toContain('stone wall');
    });

    it('should emit ambiguity with possible interpretations', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'cover',
      };

      const intent = createMockIntent(COVER_VS_CONCEALMENT_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.ambiguity).not.toBeNull();
      expect(result.ambiguity!.possibleInterpretations.length).toBeGreaterThan(0);
      expect(result.ambiguity!.possibleInterpretations.some(
        i => i.code === 'ATTACK_CONNECTS'
      )).toBe(true);
      expect(result.ambiguity!.possibleInterpretations.some(
        i => i.code === 'OBSTRUCTION_BLOCKS'
      )).toBe(true);
    });
  });

  describe('Effects - AMBIGUOUS Still Emits Attack Effects', () => {
    it('CRITICAL: effects.length > 0 even when AMBIGUOUS', () => {
      const effects = createCoverVsConcealmentEffects(
        'char-001',
        'pistol shot',
        'target-001',
        'cover',
        'behind stone wall',
        'Colt Peacemaker',
        'inv-001'
      );

      // THE CRITICAL INVARIANT: AMBIGUOUS does not suppress effects
      expect(effects.length).toBeGreaterThan(0);
    });

    it('should emit attack effect despite AMBIGUOUS', () => {
      const effects = createCoverVsConcealmentEffects(
        'char-001',
        'pistol shot',
        'target-001',
        'cover',
        undefined,
        'Colt Peacemaker',
        'inv-001'
      );

      const attack = effects.find(e => e.effectId.includes('_attack'));
      expect(attack).toBeDefined();
      expect(attack!.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(attack!.parameters.targetObstructed).toBe(true);
      expect(attack!.parameters.attemptRecorded).toBe(true);
    });

    it('should emit obstruction indicator effect despite AMBIGUOUS', () => {
      const effects = createCoverVsConcealmentEffects(
        'char-001',
        'pistol shot',
        'target-001',
        'concealment',
        'dense fog',
        undefined,
        'inv-001'
      );

      const obstruction = effects.find(e => e.effectId.includes('_obstruction'));
      expect(obstruction).toBeDefined();
      expect(obstruction!.authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(obstruction!.parameters.obstructionType).toBe('concealment');
      expect(obstruction!.parameters.lineOfEffectContested).toBe(true);
    });

    it('should handle all obstruction types', () => {
      const types: Array<'cover' | 'concealment' | 'both'> = ['cover', 'concealment', 'both'];

      for (const type of types) {
        const effects = createCoverVsConcealmentEffects(
          'char-001',
          'pistol shot',
          'target-001',
          type,
          undefined,
          undefined,
          'inv-001'
        );

        expect(effects.length).toBeGreaterThan(0);
        const obstruction = effects.find(e => e.effectId.includes('_obstruction'));
        expect(obstruction!.parameters.obstructionType).toBe(type);
      }
    });
  });

  describe('Cost Validation - AMBIGUOUS Still Has Cost', () => {
    it('should emit cost even when AMBIGUOUS', () => {
      const payload: CoverVsConcealmentPayload = {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'cover',
      };

      const intent = createMockIntent(COVER_VS_CONCEALMENT_INTENT_TYPE, payload);
      const result = pipeline.validate(intent, createInvocationId());

      expect(result.costValidation).toBeDefined();
      expect(result.costValidation!.cost.tags).toContain('cover');
    });
  });
});

// ============================================================================
// CROSS-CUTTING INVARIANT TESTS
// ============================================================================

describe('Cross-Cutting: FAIL ≠ NOTHING Invariant', () => {
  it('CRITICAL: All three rules emit effects regardless of outcome', () => {
    // Firing with no ammo - FAIL
    const noAmmoEffects = createFiringWithNoAmmoEffects(
      'char-001', 'weapon-001', 'pistol', 'target-001', 'inv-001'
    );
    expect(noAmmoEffects.length).toBeGreaterThan(0);

    // Called shots - FAIL
    const calledShotEffects = createCalledShotsEffects(
      'char-001', 'pistol shot', 'head', 'target-001', 'pistol', 'inv-002', RulesOutcome.FAIL
    );
    expect(calledShotEffects.length).toBeGreaterThan(0);

    // Cover vs concealment - AMBIGUOUS
    const coverEffects = createCoverVsConcealmentEffects(
      'char-001', 'pistol shot', 'target-001', 'cover', 'wall', 'pistol', 'inv-003'
    );
    expect(coverEffects.length).toBeGreaterThan(0);
  });

  it('CRITICAL: All effects have attemptRecorded = true', () => {
    const noAmmoEffects = createFiringWithNoAmmoEffects(
      'char-001', 'weapon-001', 'pistol', 'target-001', 'inv-001'
    );
    const calledShotEffects = createCalledShotsEffects(
      'char-001', 'pistol shot', 'head', 'target-001', 'pistol', 'inv-002', RulesOutcome.FAIL
    );
    const coverEffects = createCoverVsConcealmentEffects(
      'char-001', 'pistol shot', 'target-001', 'cover', 'wall', 'pistol', 'inv-003'
    );

    for (const effect of noAmmoEffects) {
      expect(effect.parameters.attemptRecorded).toBe(true);
    }
    for (const effect of calledShotEffects) {
      expect(effect.parameters.attemptRecorded).toBe(true);
    }
    for (const effect of coverEffects) {
      expect(effect.parameters.attemptRecorded).toBe(true);
    }
  });

  it('CRITICAL: All conflicts have attempt-recorded tag', () => {
    const noAmmoPipeline = createFiringWithNoAmmoPipeline();
    const calledShotsPipeline = createCalledShotsPipeline();
    const coverPipeline = createCoverVsConcealmentPipeline();

    const noAmmoResult = noAmmoPipeline.validate(
      createMockIntent(FIRING_WITH_NO_AMMO_INTENT_TYPE, {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        hasAmmo: false,
      }),
      createInvocationId()
    );

    const calledShotsResult = calledShotsPipeline.validate(
      createMockIntent(CALLED_SHOTS_INTENT_TYPE, {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        calledShotTarget: 'head',
        targetId: 'target-001',
      }),
      createInvocationId()
    );

    const coverResult = coverPipeline.validate(
      createMockIntent(COVER_VS_CONCEALMENT_INTENT_TYPE, {
        characterId: 'char-001',
        declaredAttack: 'pistol shot',
        targetId: 'target-001',
        obstructionType: 'cover',
      }),
      createInvocationId()
    );

    expect(noAmmoResult.conflicts[0].tags).toContain('attempt-recorded');
    expect(calledShotsResult.conflicts[0].tags).toContain('attempt-recorded');
    expect(coverResult.conflicts[0].tags).toContain('attempt-recorded');
  });

  it('Failure describes legality, not physical reality', () => {
    const noAmmoPipeline = createFiringWithNoAmmoPipeline();
    const result = noAmmoPipeline.validate(
      createMockIntent(FIRING_WITH_NO_AMMO_INTENT_TYPE, {
        characterId: 'char-001',
        weaponId: 'weapon-001',
        hasAmmo: false,
      }),
      createInvocationId()
    );

    // FAIL but still has:
    expect(result.outcome).toBe(RulesOutcome.FAIL);
    expect(result.costValidation).toBeDefined(); // Cost still applies
    expect(result.conflicts.length).toBeGreaterThan(0); // Conflict recorded
    // The attempt was made - the engine records it
  });
});
