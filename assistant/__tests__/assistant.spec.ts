/**
 * Assistant Layer Tests
 *
 * Comprehensive test suite for the Rules Assistant Logic Layer.
 * Tests verify:
 * - Natural language produces deterministic output
 * - Assumptions are always present when data is missing
 * - Modifiers sum correctly
 * - Output shape is stable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAssistantEngine,
  createAssistantInput,
  AssistantEngine,
} from '../index';

describe('AssistantEngine', () => {
  let engine: AssistantEngine;

  beforeEach(() => {
    engine = createAssistantEngine();
  });

  // ==========================================================================
  // Core Contract Tests
  // ==========================================================================

  describe('Core Contract', () => {
    it('always produces a suggestion (never UNRESOLVED)', () => {
      const inputs = [
        'Alice shoots at Bob',
        'attack the bandit',
        'some random text',
        '',
        'xyzzy',
      ];

      for (const rawText of inputs) {
        const input = createAssistantInput(rawText);
        const result = engine.process(input);

        expect(result.suggestedRoll).toBeDefined();
        expect(result.suggestedRoll.trait).toBeDefined();
        expect(typeof result.suggestedRoll.trait).toBe('string');
        expect(result.suggestedRoll.targetNumber).toBe(4);
      }
    });

    it('has stable output shape', () => {
      const input = createAssistantInput('Alice shoots at Bob');
      const result = engine.process(input);

      // Verify all required fields exist
      expect(result).toHaveProperty('suggestedRoll');
      expect(result).toHaveProperty('modifiers');
      expect(result).toHaveProperty('netModifier');
      expect(result).toHaveProperty('assumptions');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('originalInput');

      // Verify types
      expect(typeof result.suggestedRoll.trait).toBe('string');
      expect(typeof result.suggestedRoll.targetNumber).toBe('number');
      expect(Array.isArray(result.modifiers)).toBe(true);
      expect(typeof result.netModifier).toBe('number');
      expect(Array.isArray(result.assumptions)).toBe(true);
      expect(Array.isArray(result.notes)).toBe(true);
      expect(typeof result.originalInput).toBe('string');
    });

    it('preserves original input text', () => {
      const rawText = 'Alice shoots at Bob while galloping on a horse';
      const input = createAssistantInput(rawText);
      const result = engine.process(input);

      expect(result.originalInput).toBe(rawText);
    });

    it('netModifier equals sum of all modifier values', () => {
      const input = createAssistantInput(
        'Alice shoots at Bob 100 yards away while galloping on a horse in the dark'
      );
      const result = engine.process(input);

      const calculatedSum = result.modifiers.reduce((sum, mod) => sum + mod.value, 0);
      expect(result.netModifier).toBe(calculatedSum);
    });
  });

  // ==========================================================================
  // Assumption Tracking Tests
  // ==========================================================================

  describe('Assumption Tracking', () => {
    it('records assumptions when data is missing', () => {
      // Minimal input - should require many assumptions
      const input = createAssistantInput('shoot');
      const result = engine.process(input);

      expect(result.assumptions.length).toBeGreaterThan(0);
    });

    it('assumptions have required fields', () => {
      const input = createAssistantInput('Alice shoots');
      const result = engine.process(input);

      for (const assumption of result.assumptions) {
        expect(assumption).toHaveProperty('statement');
        expect(assumption).toHaveProperty('confidence');
        expect(assumption).toHaveProperty('category');
        expect(assumption).toHaveProperty('reason');

        expect(typeof assumption.statement).toBe('string');
        expect(['high', 'medium', 'low']).toContain(assumption.confidence);
        expect(typeof assumption.category).toBe('string');
        expect(typeof assumption.reason).toBe('string');
      }
    });

    it('makes weapon assumption when weapon not specified for shooting', () => {
      const input = createAssistantInput('Alice shoots at Bob');
      const result = engine.process(input);

      const weaponAssumption = result.assumptions.find(
        (a) => a.category === 'weapon'
      );
      expect(weaponAssumption).toBeDefined();
    });

    it('makes range assumption when distance not specified', () => {
      const input = createAssistantInput('Alice shoots at Bob');
      const result = engine.process(input);

      const rangeAssumption = result.assumptions.find(
        (a) => a.category === 'range'
      );
      expect(rangeAssumption).toBeDefined();
    });

    it('does not assume range when explicitly provided', () => {
      const input = createAssistantInput('Alice shoots at Bob, 50 yards away');
      const result = engine.process(input);

      // Should still have range-related info but as a fact, not assumption
      // The range assumption about "distance not specified" should NOT appear
      const rangeAssumption = result.assumptions.find(
        (a) => a.category === 'range' && a.reason.includes('No distance specified')
      );
      expect(rangeAssumption).toBeUndefined();
    });

    it('makes movement assumption when not specified', () => {
      const input = createAssistantInput('Alice shoots at Bob');
      const result = engine.process(input);

      const movementAssumption = result.assumptions.find(
        (a) => a.category === 'movement'
      );
      expect(movementAssumption).toBeDefined();
      expect(movementAssumption?.statement).toContain('stationary');
    });
  });

  // ==========================================================================
  // Shooting Tests
  // ==========================================================================

  describe('Shooting Actions', () => {
    it('identifies shooting from "shoot" verb', () => {
      const input = createAssistantInput('Alice shoots at Bob');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Shooting');
    });

    it('identifies shooting from "fire" verb', () => {
      const input = createAssistantInput('Fire at the bandit');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Shooting');
    });

    it('identifies shooting from weapon mention', () => {
      const input = createAssistantInput('Use my pistol on the outlaw');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Shooting');
    });

    it('applies range modifier for medium range', () => {
      // Default pistol ranges: 12/24/48 (short/medium/long)
      // 20 yards is within medium range (13-24)
      const input = createAssistantInput('Alice shoots at Bob, 20 yards away');
      const result = engine.process(input);

      const rangeModifier = result.modifiers.find((m) => m.label.includes('Range'));
      expect(rangeModifier).toBeDefined();
      expect(rangeModifier?.value).toBe(-2); // Medium range
    });

    it('applies range modifier for long range', () => {
      // Default pistol ranges: 12/24/48 (short/medium/long)
      // 40 yards is within long range (25-48)
      const input = createAssistantInput('Alice shoots at Bob, 40 yards away');
      const result = engine.process(input);

      const rangeModifier = result.modifiers.find((m) => m.label.includes('Range'));
      expect(rangeModifier).toBeDefined();
      expect(rangeModifier?.value).toBe(-4); // Long range
    });

    it('applies range modifier for extreme range', () => {
      const input = createAssistantInput('Alice shoots at Bob, 100 yards away');
      const result = engine.process(input);

      const rangeModifier = result.modifiers.find((m) => m.label.includes('Range'));
      expect(rangeModifier).toBeDefined();
      expect(rangeModifier?.value).toBe(-8); // Extreme range
    });

    it('no range modifier for short range', () => {
      const input = createAssistantInput('Alice shoots at Bob, 5 yards away');
      const result = engine.process(input);

      const rangeModifier = result.modifiers.find((m) => m.label.includes('Range'));
      // Short range should have no penalty (0), so modifier might not be added
      if (rangeModifier) {
        expect(rangeModifier.value).toBe(0);
      }
    });
  });

  // ==========================================================================
  // Fighting Tests
  // ==========================================================================

  describe('Fighting Actions', () => {
    it('identifies fighting from "attack" verb', () => {
      const input = createAssistantInput('Attack the bandit');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Fighting');
    });

    it('identifies fighting from "punch" verb', () => {
      const input = createAssistantInput('Punch the outlaw');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Fighting');
    });

    it('identifies fighting from melee weapon mention', () => {
      const input = createAssistantInput('Use my knife on the bandit');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Fighting');
    });

    it('adds note about Parry for fighting', () => {
      const input = createAssistantInput('Attack the bandit with my knife');
      const result = engine.process(input);

      const parryNote = result.notes.find((n) => n.includes('Parry'));
      expect(parryNote).toBeDefined();
    });
  });

  // ==========================================================================
  // Movement Modifier Tests
  // ==========================================================================

  describe('Movement Modifiers', () => {
    it('applies mounted/unstable platform modifier', () => {
      const input = createAssistantInput(
        'Alice shoots at Bob while galloping on a horse'
      );
      const result = engine.process(input);

      const mountedModifier = result.modifiers.find(
        (m) => m.label.includes('Unstable')
      );
      expect(mountedModifier).toBeDefined();
      expect(mountedModifier?.value).toBe(-2);
    });

    it('applies running modifier', () => {
      const input = createAssistantInput('Shoot while running');
      const result = engine.process(input);

      const runningModifier = result.modifiers.find(
        (m) => m.label === 'Running'
      );
      expect(runningModifier).toBeDefined();
      expect(runningModifier?.value).toBe(-2);
    });

    it('applies target running modifier', () => {
      const input = createAssistantInput(
        'Shoot at the target who is running away'
      );
      const result = engine.process(input);

      const targetRunningModifier = result.modifiers.find(
        (m) => m.label === 'Target Running'
      );
      expect(targetRunningModifier).toBeDefined();
      expect(targetRunningModifier?.value).toBe(-2);
    });
  });

  // ==========================================================================
  // Cover Modifier Tests
  // ==========================================================================

  describe('Cover Modifiers', () => {
    it('applies light cover modifier', () => {
      const input = createAssistantInput(
        'Shoot at the bandit who has light cover'
      );
      const result = engine.process(input);

      const coverModifier = result.modifiers.find(
        (m) => m.label.includes('Cover')
      );
      expect(coverModifier).toBeDefined();
      expect(coverModifier?.value).toBe(-2);
    });

    it('applies medium cover modifier', () => {
      const input = createAssistantInput(
        'Shoot at the bandit behind medium cover'
      );
      const result = engine.process(input);

      const coverModifier = result.modifiers.find(
        (m) => m.label.includes('Cover')
      );
      expect(coverModifier).toBeDefined();
      expect(coverModifier?.value).toBe(-4);
    });

    it('applies heavy cover modifier', () => {
      const input = createAssistantInput(
        'Shoot at the outlaw in heavy cover'
      );
      const result = engine.process(input);

      const coverModifier = result.modifiers.find(
        (m) => m.label.includes('Cover')
      );
      expect(coverModifier).toBeDefined();
      expect(coverModifier?.value).toBe(-6);
    });
  });

  // ==========================================================================
  // Lighting Modifier Tests
  // ==========================================================================

  describe('Lighting Modifiers', () => {
    it('applies dim lighting modifier', () => {
      const input = createAssistantInput('Shoot at Bob in the dim saloon');
      const result = engine.process(input);

      const lightingModifier = result.modifiers.find(
        (m) => m.label.includes('Lighting')
      );
      expect(lightingModifier).toBeDefined();
      expect(lightingModifier?.value).toBe(-2);
    });

    it('applies dark lighting modifier', () => {
      const input = createAssistantInput('Shoot in the dark');
      const result = engine.process(input);

      const lightingModifier = result.modifiers.find(
        (m) => m.label.includes('Lighting')
      );
      expect(lightingModifier).toBeDefined();
      expect(lightingModifier?.value).toBe(-4);
    });

    it('applies pitch black modifier', () => {
      const input = createAssistantInput('Attack in pitch black darkness');
      const result = engine.process(input);

      const lightingModifier = result.modifiers.find(
        (m) => m.label.includes('Lighting')
      );
      expect(lightingModifier).toBeDefined();
      expect(lightingModifier?.value).toBe(-6);
    });
  });

  // ==========================================================================
  // Situational Modifier Tests
  // ==========================================================================

  describe('Situational Modifiers', () => {
    it('applies aiming bonus', () => {
      const input = createAssistantInput('Take aim and shoot at Bob');
      const result = engine.process(input);

      const aimModifier = result.modifiers.find((m) => m.label === 'Aiming');
      expect(aimModifier).toBeDefined();
      expect(aimModifier?.value).toBe(2);
    });

    it('applies called shot head penalty', () => {
      const input = createAssistantInput('Head shot at the bandit');
      const result = engine.process(input);

      const calledShotModifier = result.modifiers.find(
        (m) => m.label.includes('Called Shot') && m.label.includes('Head')
      );
      expect(calledShotModifier).toBeDefined();
      expect(calledShotModifier?.value).toBe(-4);
    });

    it('applies The Drop bonus', () => {
      const input = createAssistantInput(
        'Shoot the villain before he can draw'
      );
      const result = engine.process(input);

      const dropModifier = result.modifiers.find(
        (m) => m.label === 'The Drop'
      );
      expect(dropModifier).toBeDefined();
      expect(dropModifier?.value).toBe(4);
    });

    it('applies higher ground bonus', () => {
      const input = createAssistantInput('Shoot from the balcony');
      const result = engine.process(input);

      const groundModifier = result.modifiers.find(
        (m) => m.label === 'Higher Ground'
      );
      expect(groundModifier).toBeDefined();
      expect(groundModifier?.value).toBe(1);
    });
  });

  // ==========================================================================
  // Arcane/Spellcasting Tests
  // ==========================================================================

  describe('Arcane Actions', () => {
    it('identifies spellcasting from "cast" verb', () => {
      const input = createAssistantInput('Cast a bolt at the enemy');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toContain('Spellcasting');
    });

    it('identifies huckster arcane background', () => {
      const input = createAssistantInput('The huckster casts a hex');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Spellcasting (Huckster)');
    });

    it('identifies blessed arcane background', () => {
      const input = createAssistantInput('The blessed prays for a miracle');
      const result = engine.process(input);

      expect(result.suggestedRoll.trait).toBe('Faith');
    });

    it('adds arcane notes', () => {
      const input = createAssistantInput('Cast a bolt');
      const result = engine.process(input);

      const arcaneNote = result.notes.find((n) => n.includes('Power Points'));
      expect(arcaneNote).toBeDefined();
    });
  });

  // ==========================================================================
  // Complex Scenario Tests
  // ==========================================================================

  describe('Complex Scenarios', () => {
    it('handles the example from the spec: Alice shoots at Bob while galloping', () => {
      const input = createAssistantInput(
        'Alice shoots at Bob while galloping on a horse, Bob is 100 yards away'
      );
      const result = engine.process(input);

      // Should have Shooting roll
      expect(result.suggestedRoll.trait).toBe('Shooting');
      expect(result.suggestedRoll.targetNumber).toBe(4);

      // Should have long/extreme range modifier
      const rangeModifier = result.modifiers.find((m) => m.label.includes('Range'));
      expect(rangeModifier).toBeDefined();
      expect(rangeModifier?.value).toBeLessThan(0); // Negative modifier for range

      // Should have mounted/unstable modifier
      const mountedModifier = result.modifiers.find(
        (m) => m.label.includes('Unstable')
      );
      expect(mountedModifier).toBeDefined();
      expect(mountedModifier?.value).toBe(-2);

      // Should have assumptions about weapon, aim, lighting
      expect(result.assumptions.length).toBeGreaterThan(0);

      // Net modifier should be sum of all
      const expectedSum = result.modifiers.reduce((sum, m) => sum + m.value, 0);
      expect(result.netModifier).toBe(expectedSum);
    });

    it('handles multiple modifiers stacking', () => {
      const input = createAssistantInput(
        'Shoot at the running bandit behind cover in the dark, 50 yards away while mounted'
      );
      const result = engine.process(input);

      // Should have multiple modifiers
      expect(result.modifiers.length).toBeGreaterThan(2);

      // Net modifier should be the sum
      const expectedSum = result.modifiers.reduce((sum, m) => sum + m.value, 0);
      expect(result.netModifier).toBe(expectedSum);

      // Should have significant negative modifier
      expect(result.netModifier).toBeLessThan(-4);
    });

    it('produces deterministic output for same input', () => {
      const input = createAssistantInput(
        'Alice shoots at Bob, 30 yards away, in dim lighting'
      );

      const result1 = engine.process(input);
      const result2 = engine.process(input);

      expect(result1.suggestedRoll.trait).toBe(result2.suggestedRoll.trait);
      expect(result1.suggestedRoll.targetNumber).toBe(result2.suggestedRoll.targetNumber);
      expect(result1.netModifier).toBe(result2.netModifier);
      expect(result1.modifiers.length).toBe(result2.modifiers.length);
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles empty input', () => {
      const input = createAssistantInput('');
      const result = engine.process(input);

      expect(result.suggestedRoll).toBeDefined();
      expect(result.assumptions.length).toBeGreaterThan(0);
    });

    it('handles gibberish input', () => {
      const input = createAssistantInput('asdf jkl; qwerty');
      const result = engine.process(input);

      expect(result.suggestedRoll).toBeDefined();
      // Should have low-confidence assumptions
      const lowConfidence = result.assumptions.filter(
        (a) => a.confidence === 'low'
      );
      expect(lowConfidence.length).toBeGreaterThan(0);
    });

    it('handles very long input', () => {
      const longInput =
        'Alice the cowboy gunslinger shoots at Bob the notorious outlaw bandit ' +
        'while galloping on her trusty horse across the dusty plains of Texas ' +
        'in the dim light of the setting sun with her trusty Colt revolver';

      const input = createAssistantInput(longInput);
      const result = engine.process(input);

      expect(result.suggestedRoll).toBeDefined();
      expect(result.suggestedRoll.trait).toBe('Shooting');
    });

    it('handles special characters in input', () => {
      const input = createAssistantInput('Shoot! @#$% Bob... 50 yards!!!');
      const result = engine.process(input);

      expect(result.suggestedRoll).toBeDefined();
    });
  });

  // ==========================================================================
  // Modifier Source Tracking Tests
  // ==========================================================================

  describe('Modifier Sources', () => {
    it('all modifiers have source information', () => {
      const input = createAssistantInput(
        'Shoot at Bob 50 yards away while running in the dark'
      );
      const result = engine.process(input);

      for (const modifier of result.modifiers) {
        expect(modifier.source).toBeDefined();
        expect(typeof modifier.source).toBe('string');
        expect(modifier.source.length).toBeGreaterThan(0);
      }
    });

    it('all modifiers have labels', () => {
      const input = createAssistantInput(
        'Shoot at Bob 50 yards away while running'
      );
      const result = engine.process(input);

      for (const modifier of result.modifiers) {
        expect(modifier.label).toBeDefined();
        expect(typeof modifier.label).toBe('string');
        expect(modifier.label.length).toBeGreaterThan(0);
      }
    });
  });
});
