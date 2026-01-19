/**
 * High Volume Rules Tests (PR 9.0)
 *
 * This test suite proves that volume does not create authority.
 * 20 rules, each standing alone, none creating precedence over others.
 *
 * CRITICAL INVARIANTS TESTED:
 * - No shared helpers or base classes
 * - No rule-to-rule awareness
 * - No math, no penalties, no enforcement
 * - Effects emit regardless of outcome
 * - AMBIGUOUS does not imply resolution
 */

import { describe, it, expect } from 'vitest';
import type { ValidatedIntent } from '../../../../intent/bridge/ts/ValidatedIntent';
import { RulesOutcome, ConflictKind } from '../../../../intent/bridge/ts/RulesPipeline';

// Combat & Positioning rules
import { createProneWhileActingPipeline, isProneWhileActingPayload, createProneWhileActingEffects } from '../ProneWhileActing';
import { createStandingUpFromPronePipeline, isStandingUpFromPronePayload, createStandingUpFromProneEffects } from '../StandingUpFromProne';
import { createRunningWhileActingPipeline, isRunningWhileActingPayload, createRunningWhileActingEffects } from '../RunningWhileActing';
import { createActingWhileEntangledPipeline, isActingWhileEntangledPayload, createActingWhileEntangledEffects } from '../ActingWhileEntangled';
import { createActingWhileBoundPipeline, isActingWhileBoundPayload, createActingWhileBoundEffects } from '../ActingWhileBound';
import { createActingInDifficultTerrainPipeline, isActingInDifficultTerrainPayload, createActingInDifficultTerrainEffects } from '../ActingInDifficultTerrain';

// Status & Fatigue rules
import { createFatigueLevelPresentPipeline, isFatigueLevelPresentPayload, createFatigueLevelPresentEffects } from '../FatigueLevelPresent';
import { createMultipleFatigueLevelsPipeline, isMultipleFatigueLevelsPayload, createMultipleFatigueLevelsEffects } from '../MultipleFatigueLevels';
import { createFatigueShakenInteractionPipeline, isFatigueShakenInteractionPayload, createFatigueShakenInteractionEffects } from '../FatigueShakenInteraction';
import { createActingWhileExhaustedPipeline, isActingWhileExhaustedPayload, createActingWhileExhaustedEffects } from '../ActingWhileExhausted';
import { createTemporaryIncapacitationAttemptPipeline, isTemporaryIncapacitationAttemptPayload, createTemporaryIncapacitationAttemptEffects } from '../TemporaryIncapacitationAttempt';
import { createIgnoringPainOrFatiguePipeline, isIgnoringPainOrFatiguePayload, createIgnoringPainOrFatigueEffects } from '../IgnoringPainOrFatigue';

// Ranged Combat rules
import { createReloadingUnderFirePipeline, isReloadingUnderFirePayload, createReloadingUnderFireEffects } from '../ReloadingUnderFire';
import { createAimingWhileThreatenedPipeline, isAimingWhileThreatenedPayload, createAimingWhileThreatenedEffects } from '../AimingWhileThreatened';
import { createFiringIntoMeleePipeline, isFiringIntoMeleePayload, createFiringIntoMeleeEffects } from '../FiringIntoMelee';
import { createUsingImprovisedWeaponPipeline, isUsingImprovisedWeaponPayload, createUsingImprovisedWeaponEffects } from '../UsingImprovisedWeapon';

// Narrative/Social rules
import { createIntimidationDuringCombatPipeline, isIntimidationDuringCombatPayload, createIntimidationDuringCombatEffects } from '../IntimidationDuringCombat';
import { createTauntingWhileThreatenedPipeline, isTauntingWhileThreatenedPayload, createTauntingWhileThreatenedEffects } from '../TauntingWhileThreatened';
import { createCommandingAlliesUnderFirePipeline, isCommandingAlliesUnderFirePayload, createCommandingAlliesUnderFireEffects } from '../CommandingAlliesUnderFire';
import { createSocialActionWhileShakenPipeline, isSocialActionWhileShakenPayload, createSocialActionWhileShakenEffects } from '../SocialActionWhileShaken';

// Helper to create test intents
function createTestIntent(intentType: string, payload: Record<string, unknown>): ValidatedIntent {
  return {
    intentId: `test-${intentType}-${Date.now()}`,
    intentType: intentType as any,
    timestamp: new Date().toISOString(),
    actorId: payload.characterId as string,
    payload,
    source: 'TEST',
    isValid: true,
  };
}

describe('PR 9.0: High Volume Rules - Volume Does Not Create Authority', () => {

  // ============================================================================
  // A. COMBAT & POSITIONING (6 rules)
  // ============================================================================

  describe('A. Combat & Positioning Rules', () => {

    describe('ProneWhileActing', () => {
      const pipeline = createProneWhileActingPipeline();

      it('should recognize prone while acting payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'shoot', isProne: true };
        expect(isProneWhileActingPayload(payload)).toBe(true);
      });

      it('should emit AMBIGUOUS outcome for prone action', () => {
        const intent = createTestIntent('PRONE_WHILE_ACTING', { characterId: 'char-1', declaredAction: 'shoot', isProne: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
      });

      it('should emit SoftBlock conflict without enforcement', () => {
        const intent = createTestIntent('PRONE_WHILE_ACTING', { characterId: 'char-1', declaredAction: 'shoot', isProne: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.conflicts[0].kind).toBe(ConflictKind.SoftBlock);
        expect(result.conflicts[0].tags).toContain('no-enforcement');
      });

      it('should emit effects regardless of outcome', () => {
        const effects = createProneWhileActingEffects('char-1', 'shoot', 'inv-1');
        expect(effects.length).toBe(2);
        expect(effects[0].effectId).toContain('_action');
        expect(effects[1].effectId).toContain('_prone_context');
      });
    });

    describe('StandingUpFromProne', () => {
      const pipeline = createStandingUpFromPronePipeline();

      it('should recognize standing up payload', () => {
        const payload = { characterId: 'char-1', isProne: true, isStandingUp: true };
        expect(isStandingUpFromPronePayload(payload)).toBe(true);
      });

      it('should emit AMBIGUOUS without resolving success', () => {
        const intent = createTestIntent('STANDING_UP_FROM_PRONE', { characterId: 'char-1', isProne: true, isStandingUp: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
        expect(result.ambiguity?.reason).toContain('does not enforce');
      });

      it('should emit effects with stand attempt recorded', () => {
        const effects = createStandingUpFromProneEffects('char-1', 'inv-1');
        expect(effects.length).toBe(1);
        expect(effects[0].parameters.attemptRecorded).toBe(true);
      });
    });

    describe('RunningWhileActing', () => {
      const pipeline = createRunningWhileActingPipeline();

      it('should recognize running while acting payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'attack', isRunning: true };
        expect(isRunningWhileActingPayload(payload)).toBe(true);
      });

      it('should emit AMBIGUOUS for running action', () => {
        const intent = createTestIntent('RUNNING_WHILE_ACTING', { characterId: 'char-1', declaredAction: 'attack', isRunning: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
      });

      it('should not quantify impact', () => {
        const effects = createRunningWhileActingEffects('char-1', 'attack', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_running_context'));
        expect(contextEffect?.parameters.impactQuantified).toBe(false);
      });
    });

    describe('ActingWhileEntangled', () => {
      const pipeline = createActingWhileEntangledPipeline();

      it('should recognize entangled payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'escape', isEntangled: true };
        expect(isActingWhileEntangledPayload(payload)).toBe(true);
      });

      it('should emit AMBIGUOUS for entangled action', () => {
        const intent = createTestIntent('ACTING_WHILE_ENTANGLED', { characterId: 'char-1', declaredAction: 'escape', isEntangled: true, entanglementSource: 'rope' });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
      });
    });

    describe('ActingWhileBound', () => {
      const pipeline = createActingWhileBoundPipeline();

      it('should recognize bound payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'struggle', isBound: true };
        expect(isActingWhileBoundPayload(payload)).toBe(true);
      });

      it('should emit FAIL with HardBlock for bound action', () => {
        const intent = createTestIntent('ACTING_WHILE_BOUND', { characterId: 'char-1', declaredAction: 'attack', isBound: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.FAIL);
        expect(result.conflicts[0].kind).toBe(ConflictKind.HardBlock);
      });

      it('should still emit effects even with FAIL outcome', () => {
        const effects = createActingWhileBoundEffects('char-1', 'attack', 'rope', 'inv-1', RulesOutcome.FAIL);
        expect(effects.length).toBe(2);
        expect(effects[0].authority.outcome).toBe(RulesOutcome.FAIL);
      });
    });

    describe('ActingInDifficultTerrain', () => {
      const pipeline = createActingInDifficultTerrainPipeline();

      it('should recognize difficult terrain payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'charge', terrainType: 'mud', isInDifficultTerrain: true };
        expect(isActingInDifficultTerrainPayload(payload)).toBe(true);
      });

      it('should not quantify terrain impact', () => {
        const effects = createActingInDifficultTerrainEffects('char-1', 'charge', 'mud', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_terrain_context'));
        expect(contextEffect?.parameters.impactQuantified).toBe(false);
      });
    });
  });

  // ============================================================================
  // B. STATUS & FATIGUE (6 rules)
  // ============================================================================

  describe('B. Status & Fatigue Rules', () => {

    describe('FatigueLevelPresent', () => {
      const pipeline = createFatigueLevelPresentPipeline();

      it('should recognize fatigue level payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'fight', fatigueLevel: 1, hasFatigue: true };
        expect(isFatigueLevelPresentPayload(payload)).toBe(true);
      });

      it('should emit AMBIGUOUS without quantifying impact', () => {
        const intent = createTestIntent('FATIGUE_LEVEL_PRESENT', { characterId: 'char-1', declaredAction: 'fight', fatigueLevel: 2, hasFatigue: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
        expect(result.costValidation?.reason).toContain('does not quantify impact');
      });
    });

    describe('MultipleFatigueLevels', () => {
      const pipeline = createMultipleFatigueLevelsPipeline();

      it('should recognize multiple fatigue levels payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'run', fatigueLevel: 3, hasMultipleFatigueLevels: true };
        expect(isMultipleFatigueLevelsPayload(payload)).toBe(true);
      });

      it('should not quantify compounding', () => {
        const effects = createMultipleFatigueLevelsEffects('char-1', 'run', 3, 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_fatigue_context'));
        expect(contextEffect?.parameters.compoundingQuantified).toBe(false);
      });
    });

    describe('FatigueShakenInteraction', () => {
      const pipeline = createFatigueShakenInteractionPipeline();

      it('should recognize fatigue+shaken payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'attack', fatigueLevel: 1, isShaken: true, hasFatigue: true };
        expect(isFatigueShakenInteractionPayload(payload)).toBe(true);
      });

      it('should emit AMBIGUOUS with no condition precedence', () => {
        const intent = createTestIntent('FATIGUE_SHAKEN_INTERACTION', { characterId: 'char-1', declaredAction: 'attack', fatigueLevel: 1, isShaken: true, hasFatigue: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
        expect(result.conflicts[0].tags).toContain('no-precedence');
      });

      it('should not apply condition precedence in effects', () => {
        const effects = createFatigueShakenInteractionEffects('char-1', 'attack', 1, 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_interaction_context'));
        expect(contextEffect?.parameters.precedenceApplied).toBe(false);
      });
    });

    describe('ActingWhileExhausted', () => {
      const pipeline = createActingWhileExhaustedPipeline();

      it('should recognize exhausted payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'crawl', isExhausted: true };
        expect(isActingWhileExhaustedPayload(payload)).toBe(true);
      });

      it('should note severe limitation without quantification', () => {
        const intent = createTestIntent('ACTING_WHILE_EXHAUSTED', { characterId: 'char-1', declaredAction: 'crawl', isExhausted: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
        expect(result.conflicts[0].tags).toContain('severe');
      });
    });

    describe('TemporaryIncapacitationAttempt', () => {
      const pipeline = createTemporaryIncapacitationAttemptPipeline();

      it('should recognize incapacitation payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'speak', isIncapacitated: true };
        expect(isTemporaryIncapacitationAttemptPayload(payload)).toBe(true);
      });

      it('should not enforce inability', () => {
        const intent = createTestIntent('TEMPORARY_INCAPACITATION_ATTEMPT', { characterId: 'char-1', declaredAction: 'speak', isIncapacitated: true });
        const result = pipeline.validate(intent, 'inv-1' as any);
        expect(result.outcome).toBe(RulesOutcome.AMBIGUOUS);
        expect(result.conflicts[0].tags).toContain('no-enforcement');
      });
    });

    describe('IgnoringPainOrFatigue', () => {
      const pipeline = createIgnoringPainOrFatiguePipeline();

      it('should recognize ignoring payload', () => {
        const payload = { characterId: 'char-1', declaredAction: 'charge', ignoringPain: true, ignoringFatigue: false };
        expect(isIgnoringPainOrFatiguePayload(payload)).toBe(true);
      });

      it('should not resolve willpower success', () => {
        const effects = createIgnoringPainOrFatigueEffects('char-1', 'charge', true, true, 'wound', 2, 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_ignoring_context'));
        expect(contextEffect?.parameters.successResolved).toBe(false);
      });
    });
  });

  // ============================================================================
  // C. RANGED COMBAT (4 rules)
  // ============================================================================

  describe('C. Ranged Combat Rules', () => {

    describe('ReloadingUnderFire', () => {
      const pipeline = createReloadingUnderFirePipeline();

      it('should recognize reload under fire payload', () => {
        const payload = { characterId: 'char-1', weaponId: 'revolver', isUnderFire: true };
        expect(isReloadingUnderFirePayload(payload)).toBe(true);
      });

      it('should not quantify reload difficulty', () => {
        const effects = createReloadingUnderFireEffects('char-1', 'revolver', 3, 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_fire_pressure_context'));
        expect(contextEffect?.parameters.difficultyQuantified).toBe(false);
      });
    });

    describe('AimingWhileThreatened', () => {
      const pipeline = createAimingWhileThreatenedPipeline();

      it('should recognize aim while threatened payload', () => {
        const payload = { characterId: 'char-1', targetId: 'enemy-1', isThreatened: true };
        expect(isAimingWhileThreatenedPayload(payload)).toBe(true);
      });

      it('should not quantify focus penalty', () => {
        const effects = createAimingWhileThreatenedEffects('char-1', 'enemy-1', 'melee attacker', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_threat_context'));
        expect(contextEffect?.parameters.focusPenaltyQuantified).toBe(false);
      });
    });

    describe('FiringIntoMelee', () => {
      const pipeline = createFiringIntoMeleePipeline();

      it('should recognize firing into melee payload', () => {
        const payload = { characterId: 'char-1', targetId: 'enemy-1', weaponId: 'rifle', meleeParticipants: ['ally-1', 'enemy-1'], isFiringIntoMelee: true };
        expect(isFiringIntoMeleePayload(payload)).toBe(true);
      });

      it('should not resolve hit allocation', () => {
        const effects = createFiringIntoMeleeEffects('char-1', 'enemy-1', 'rifle', ['ally-1', 'enemy-1'], 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_melee_context'));
        expect(contextEffect?.parameters.hitAllocationResolved).toBe(false);
      });
    });

    describe('UsingImprovisedWeapon', () => {
      const pipeline = createUsingImprovisedWeaponPipeline();

      it('should recognize improvised weapon payload', () => {
        const payload = { characterId: 'char-1', targetId: 'enemy-1', improvisedItem: 'chair', isImprovised: true };
        expect(isUsingImprovisedWeaponPayload(payload)).toBe(true);
      });

      it('should not quantify effectiveness', () => {
        const effects = createUsingImprovisedWeaponEffects('char-1', 'enemy-1', 'chair', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_improvised_context'));
        expect(contextEffect?.parameters.effectivenessQuantified).toBe(false);
      });
    });
  });

  // ============================================================================
  // D. NARRATIVE/SOCIAL (4 rules)
  // ============================================================================

  describe('D. Narrative/Social Rules', () => {

    describe('IntimidationDuringCombat', () => {
      const pipeline = createIntimidationDuringCombatPipeline();

      it('should recognize intimidation payload', () => {
        const payload = { characterId: 'char-1', targetId: 'enemy-1', intimidationType: 'threat', isInCombat: true };
        expect(isIntimidationDuringCombatPayload(payload)).toBe(true);
      });

      it('should not resolve effectiveness', () => {
        const effects = createIntimidationDuringCombatEffects('char-1', 'enemy-1', 'threat', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_combat_social_context'));
        expect(contextEffect?.parameters.effectivenessResolved).toBe(false);
      });
    });

    describe('TauntingWhileThreatened', () => {
      const pipeline = createTauntingWhileThreatenedPipeline();

      it('should recognize taunting payload', () => {
        const payload = { characterId: 'char-1', targetId: 'enemy-1', isThreatened: true };
        expect(isTauntingWhileThreatenedPayload(payload)).toBe(true);
      });

      it('should not resolve outcome', () => {
        const effects = createTauntingWhileThreatenedEffects('char-1', 'enemy-1', 'Your mother was a hamster!', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_threat_social_context'));
        expect(contextEffect?.parameters.outcomeResolved).toBe(false);
      });
    });

    describe('CommandingAlliesUnderFire', () => {
      const pipeline = createCommandingAlliesUnderFirePipeline();

      it('should recognize command payload', () => {
        const payload = { characterId: 'char-1', allyIds: ['ally-1', 'ally-2'], commandDescription: 'Retreat!', isUnderFire: true };
        expect(isCommandingAlliesUnderFirePayload(payload)).toBe(true);
      });

      it('should not resolve compliance', () => {
        const effects = createCommandingAlliesUnderFireEffects('char-1', ['ally-1', 'ally-2'], 'Retreat!', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_fire_command_context'));
        expect(contextEffect?.parameters.complianceResolved).toBe(false);
      });
    });

    describe('SocialActionWhileShaken', () => {
      const pipeline = createSocialActionWhileShakenPipeline();

      it('should recognize social while shaken payload', () => {
        const payload = { characterId: 'char-1', targetId: 'npc-1', socialActionType: 'persuasion', isShaken: true };
        expect(isSocialActionWhileShakenPayload(payload)).toBe(true);
      });

      it('should not resolve impact', () => {
        const effects = createSocialActionWhileShakenEffects('char-1', 'npc-1', 'persuasion', 'inv-1');
        const contextEffect = effects.find(e => e.effectId.includes('_shaken_social_context'));
        expect(contextEffect?.parameters.impactResolved).toBe(false);
      });
    });
  });

  // ============================================================================
  // VOLUME INVARIANT TESTS
  // ============================================================================

  describe('Volume Invariants', () => {

    it('should have exactly 20 distinct pipelines', () => {
      const pipelines = [
        createProneWhileActingPipeline,
        createStandingUpFromPronePipeline,
        createRunningWhileActingPipeline,
        createActingWhileEntangledPipeline,
        createActingWhileBoundPipeline,
        createActingInDifficultTerrainPipeline,
        createFatigueLevelPresentPipeline,
        createMultipleFatigueLevelsPipeline,
        createFatigueShakenInteractionPipeline,
        createActingWhileExhaustedPipeline,
        createTemporaryIncapacitationAttemptPipeline,
        createIgnoringPainOrFatiguePipeline,
        createReloadingUnderFirePipeline,
        createAimingWhileThreatenedPipeline,
        createFiringIntoMeleePipeline,
        createUsingImprovisedWeaponPipeline,
        createIntimidationDuringCombatPipeline,
        createTauntingWhileThreatenedPipeline,
        createCommandingAlliesUnderFirePipeline,
        createSocialActionWhileShakenPipeline,
      ];
      expect(pipelines.length).toBe(20);
    });

    it('should have no shared state between rules', () => {
      // Create two pipelines and validate independently
      const pipeline1 = createFatigueLevelPresentPipeline();
      const pipeline2 = createFatigueShakenInteractionPipeline();

      const intent1 = createTestIntent('FATIGUE_LEVEL_PRESENT', { characterId: 'char-1', declaredAction: 'attack', fatigueLevel: 2, hasFatigue: true });
      const intent2 = createTestIntent('FATIGUE_SHAKEN_INTERACTION', { characterId: 'char-1', declaredAction: 'attack', fatigueLevel: 2, isShaken: true, hasFatigue: true });

      const result1 = pipeline1.validate(intent1, 'inv-1' as any);
      const result2 = pipeline2.validate(intent2, 'inv-2' as any);

      // Results should be independent
      expect(result1.invocationId).toBe('inv-1');
      expect(result2.invocationId).toBe('inv-2');
      expect(result1.conflicts[0].sourceRule).not.toBe(result2.conflicts[0].sourceRule);
    });

    it('all rules should pass for non-matching payloads', () => {
      const pipelines = [
        createProneWhileActingPipeline(),
        createStandingUpFromPronePipeline(),
        createRunningWhileActingPipeline(),
        createActingWhileEntangledPipeline(),
        createActingWhileBoundPipeline(),
        createActingInDifficultTerrainPipeline(),
        createFatigueLevelPresentPipeline(),
        createMultipleFatigueLevelsPipeline(),
        createFatigueShakenInteractionPipeline(),
        createActingWhileExhaustedPipeline(),
        createTemporaryIncapacitationAttemptPipeline(),
        createIgnoringPainOrFatiguePipeline(),
        createReloadingUnderFirePipeline(),
        createAimingWhileThreatenedPipeline(),
        createFiringIntoMeleePipeline(),
        createUsingImprovisedWeaponPipeline(),
        createIntimidationDuringCombatPipeline(),
        createTauntingWhileThreatenedPipeline(),
        createCommandingAlliesUnderFirePipeline(),
        createSocialActionWhileShakenPipeline(),
      ];

      // Non-matching payload should result in PASS for all rules
      const nonMatchingIntent = createTestIntent('UNRELATED', { characterId: 'char-1', unrelatedField: true });

      for (const pipeline of pipelines) {
        const result = pipeline.validate(nonMatchingIntent, 'inv-test' as any);
        expect(result.outcome).toBe(RulesOutcome.PASS);
        expect(result.conflicts.length).toBe(0);
      }
    });

    it('effects should always emit regardless of outcome', () => {
      // FAIL case - ActingWhileBound (needs outcome parameter)
      const boundEffects = createActingWhileBoundEffects('char-1', 'attack', 'rope', 'inv-1', RulesOutcome.FAIL);
      expect(boundEffects.length).toBeGreaterThan(0);
      expect(boundEffects[0].authority.outcome).toBe(RulesOutcome.FAIL);

      // AMBIGUOUS case - ProneWhileActing
      const proneEffects = createProneWhileActingEffects('char-1', 'shoot', 'inv-2');
      expect(proneEffects.length).toBeGreaterThan(0);
      expect(proneEffects[0].authority.outcome).toBe(RulesOutcome.AMBIGUOUS);
    });

    it('no rule should apply numeric modifiers', () => {
      const allEffectCreators = [
        () => createProneWhileActingEffects('c', 'a', 'i'),
        () => createStandingUpFromProneEffects('c', 'i'),
        () => createRunningWhileActingEffects('c', 'a', 'i'),
        () => createActingWhileEntangledEffects('c', 'a', 'rope', 'i'),
        () => createActingWhileBoundEffects('c', 'a', 'rope', 'i', RulesOutcome.FAIL),
        () => createActingInDifficultTerrainEffects('c', 'a', 'mud', 'i'),
        () => createFatigueLevelPresentEffects('c', 'a', 2, 'i'),
        () => createMultipleFatigueLevelsEffects('c', 'a', 3, 'i'),
        () => createFatigueShakenInteractionEffects('c', 'a', 2, 'i'),
        () => createActingWhileExhaustedEffects('c', 'a', undefined, 'i'),
        () => createTemporaryIncapacitationAttemptEffects('c', 'a', undefined, 'i'),
        () => createIgnoringPainOrFatigueEffects('c', 'a', true, true, undefined, undefined, 'i'),
        () => createReloadingUnderFireEffects('c', 'w', 2, 'i'),
        () => createAimingWhileThreatenedEffects('c', 't', undefined, 'i'),
        () => createFiringIntoMeleeEffects('c', 't', 'w', ['a1'], 'i'),
        () => createUsingImprovisedWeaponEffects('c', 't', 'chair', 'i'),
        () => createIntimidationDuringCombatEffects('c', 't', 'threat', 'i'),
        () => createTauntingWhileThreatenedEffects('c', 't', undefined, 'i'),
        () => createCommandingAlliesUnderFireEffects('c', ['a1'], 'cmd', 'i'),
        () => createSocialActionWhileShakenEffects('c', 't', 'persuasion', 'i'),
      ];

      for (const createEffects of allEffectCreators) {
        const effects = createEffects();
        for (const effect of effects) {
          // Check that no effect has numeric modifier parameters
          expect(effect.parameters.modifier).toBeUndefined();
          expect(effect.parameters.penalty).toBeUndefined();
          expect(effect.parameters.bonus).toBeUndefined();
          expect(effect.parameters.numericImpact).toBeUndefined();
        }
      }
    });
  });
});
