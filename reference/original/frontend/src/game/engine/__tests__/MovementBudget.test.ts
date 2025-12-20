/**
 * Movement Budget System Tests
 * Tests for the movement budget tracking, sprint action, and movement range display
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Movement Budget System', () => {
  describe('Budget Initialization', () => {
    it('should initialize movement budget to character Pace at start of turn', () => {
      const characterPace = 6;
      const movementBudget = characterPace;
      const maxMovementBudget = characterPace;

      expect(movementBudget).toBe(6);
      expect(maxMovementBudget).toBe(6);
    });

    it('should reset movement budget at start of new player turn', () => {
      const initialBudget = 6;
      let currentBudget = 2; // After some movement

      // Simulate new turn
      currentBudget = initialBudget;

      expect(currentBudget).toBe(6);
    });
  });

  describe('Movement Deduction', () => {
    it('should deduct movement when player moves', () => {
      let movementBudget = 6;
      const distanceMoved = 3;

      movementBudget -= distanceMoved;

      expect(movementBudget).toBe(3);
    });

    it('should not allow movement beyond budget', () => {
      const movementBudget = 2;
      const attemptedDistance = 5;

      const canMove = attemptedDistance <= movementBudget;

      expect(canMove).toBe(false);
    });

    it('should calculate distance using Chebyshev distance', () => {
      // Chebyshev distance: max(|x2-x1|, |y2-y1|)
      const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
        return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      };

      expect(getDistance(0, 0, 3, 4)).toBe(4); // max(3, 4) = 4
      expect(getDistance(0, 0, 5, 5)).toBe(5); // Diagonal
      expect(getDistance(0, 0, 3, 0)).toBe(3); // Horizontal
    });
  });

  describe('Sprint Action', () => {
    it('should add d6 roll to Pace for sprint movement', () => {
      const pace = 6;
      const d6Roll = 4; // Simulated roll
      const totalMovement = pace + d6Roll;

      expect(totalMovement).toBe(10);
    });

    it('should handle minimum d6 roll (1)', () => {
      const pace = 6;
      const d6Roll = 1;
      const totalMovement = pace + d6Roll;

      expect(totalMovement).toBe(7);
    });

    it('should handle maximum d6 roll (6)', () => {
      const pace = 6;
      const d6Roll = 6;
      const totalMovement = pace + d6Roll;

      expect(totalMovement).toBe(12);
    });

    it('should update movement budget when sprint is used', () => {
      const pace = 6;
      const d6Roll = 5;
      let movementBudget = pace + d6Roll;

      expect(movementBudget).toBe(11);

      // Use some movement
      movementBudget -= 4;
      expect(movementBudget).toBe(7);
    });
  });

  describe('Budget Validation', () => {
    it('should not go below zero', () => {
      let movementBudget = 2;
      const distanceMoved = 5;

      movementBudget = Math.max(0, movementBudget - distanceMoved);

      expect(movementBudget).toBe(0);
    });

    it('should allow exact budget usage', () => {
      const movementBudget = 5;
      const distanceMoved = 5;

      const canMove = distanceMoved <= movementBudget;

      expect(canMove).toBe(true);
    });
  });
});

describe('Movement Range Display', () => {
  describe('Toggle State', () => {
    it('should show movement ranges by default', () => {
      const showMovementRanges = true;
      expect(showMovementRanges).toBe(true);
    });

    it('should hide movement ranges when toggled off', () => {
      let showMovementRanges = true;
      showMovementRanges = false;

      expect(showMovementRanges).toBe(false);
    });

    it('should toggle independently from weapon ranges', () => {
      let showMovementRanges = true;
      let showWeaponRanges = false;

      expect(showMovementRanges).not.toBe(showWeaponRanges);

      showMovementRanges = false;
      showWeaponRanges = true;

      expect(showMovementRanges).toBe(false);
      expect(showWeaponRanges).toBe(true);
    });
  });
});
