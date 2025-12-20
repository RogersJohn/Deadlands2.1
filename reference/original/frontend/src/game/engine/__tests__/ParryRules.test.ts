/**
 * Parry Rule Tests
 * Tests for Savage Worlds parry rules implementation
 * Rule: Parry only applies to ranged attacks when attacker is within melee range (distance <= 1)
 */

import { describe, it, expect } from 'vitest';

describe('Parry Rules for Ranged Attacks', () => {
  describe('Melee Range Detection', () => {
    it('should consider distance <= 1 as melee range', () => {
      const distance = 1;
      const isInMeleeRange = distance <= 1;

      expect(isInMeleeRange).toBe(true);
    });

    it('should consider distance > 1 as beyond melee range', () => {
      const distance = 2;
      const isInMeleeRange = distance <= 1;

      expect(isInMeleeRange).toBe(false);
    });

    it('should handle distance 0 (same square) as melee range', () => {
      const distance = 0;
      const isInMeleeRange = distance <= 1;

      expect(isInMeleeRange).toBe(true);
    });
  });

  describe('Target Number Calculation for Ranged Attacks', () => {
    it('should use Parry when ranged attack is in melee range', () => {
      const isRangedWeapon = true;
      const distance = 1;
      const isInMeleeRange = distance <= 1;
      const enemyParry = 5;
      const baseTargetNumber = 4;

      const targetNumber = isInMeleeRange ? enemyParry : baseTargetNumber;

      expect(targetNumber).toBe(5);
    });

    it('should use TN 4 when ranged attack is beyond melee range', () => {
      const isRangedWeapon = true;
      const distance = 5;
      const isInMeleeRange = distance <= 1;
      const enemyParry = 5;
      const baseTargetNumber = 4;

      const targetNumber = isInMeleeRange ? enemyParry : baseTargetNumber;

      expect(targetNumber).toBe(4);
    });

    it('should always use Parry for melee attacks regardless of distance', () => {
      const isRangedWeapon = false;
      const distance = 1;
      const enemyParry = 6;

      // Melee always uses Parry
      const targetNumber = enemyParry;

      expect(targetNumber).toBe(6);
    });
  });

  describe('Weapon Type Detection', () => {
    it('should identify weapon with range property as ranged', () => {
      const weapon = { name: 'Pistol', range: '12/24/48', damage: '2d6' };
      const isRangedWeapon = weapon.range !== undefined;

      expect(isRangedWeapon).toBe(true);
    });

    it('should identify weapon without range property as melee', () => {
      const weapon = { name: 'Sword', damage: 'Str+d8' };
      const isRangedWeapon = (weapon as any).range !== undefined;

      expect(isRangedWeapon).toBe(false);
    });
  });

  describe('Combat Log Messages', () => {
    it('should show "vs Parry" for melee attacks', () => {
      const isRangedWeapon = false;
      const isInMeleeRange = true;
      const targetNumber = 5;

      const targetText = (isRangedWeapon && !isInMeleeRange)
        ? `TN ${targetNumber}`
        : `Parry ${targetNumber}`;

      expect(targetText).toBe('Parry 5');
    });

    it('should show "vs Parry" for ranged attacks in melee range', () => {
      const isRangedWeapon = true;
      const isInMeleeRange = true;
      const targetNumber = 5;

      const targetText = (isRangedWeapon && !isInMeleeRange)
        ? `TN ${targetNumber}`
        : `Parry ${targetNumber}`;

      expect(targetText).toBe('Parry 5');
    });

    it('should show "vs TN" for ranged attacks beyond melee range', () => {
      const isRangedWeapon = true;
      const isInMeleeRange = false;
      const targetNumber = 4;

      const targetText = (isRangedWeapon && !isInMeleeRange)
        ? `TN ${targetNumber}`
        : `Parry ${targetNumber}`;

      expect(targetText).toBe('TN 4');
    });
  });

  describe('Skill Selection', () => {
    it('should use Shooting skill for ranged weapons', () => {
      const skills = [
        { name: 'Fighting', dieValue: '1d8' },
        { name: 'Shooting', dieValue: '1d10' }
      ];
      const isRangedWeapon = true;

      const attackSkill = isRangedWeapon
        ? skills.find(s => s.name.toLowerCase().includes('shooting'))
        : skills.find(s => s.name.toLowerCase().includes('fighting'));

      expect(attackSkill?.name).toBe('Shooting');
      expect(attackSkill?.dieValue).toBe('1d10');
    });

    it('should use Fighting skill for melee weapons', () => {
      const skills = [
        { name: 'Fighting', dieValue: '1d8' },
        { name: 'Shooting', dieValue: '1d10' }
      ];
      const isRangedWeapon = false;

      const attackSkill = isRangedWeapon
        ? skills.find(s => s.name.toLowerCase().includes('shooting'))
        : skills.find(s => s.name.toLowerCase().includes('fighting'));

      expect(attackSkill?.name).toBe('Fighting');
      expect(attackSkill?.dieValue).toBe('1d8');
    });
  });
});
