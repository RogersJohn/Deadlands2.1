/**
 * ValidatedIntent Tests
 *
 * These tests prove the authority boundaries of the ValidatedIntent type:
 * - Raw intents cannot become ValidatedIntents without validation
 * - Only createValidatedIntent() produces ValidatedIntents
 * - The brand prevents accidental misuse at compile time
 */

import {
  createValidatedIntent,
  IntentValidationResult,
  isValidatedIntentStructure,
  RawIntent,
  ValidatedIntent,
  ValidationSummary,
} from '../ValidatedIntent';

// Test fixtures
const validSummary: ValidationSummary = {
  validatedAt: 1000,
  validatorVersion: '1.0.0',
  structuralChecks: ['field_presence', 'type_check'],
};

const rawIntent: RawIntent = {
  intentId: 'intent_123',
  intentType: 'CREATE_CHARACTER',
  payload: { name: 'Test' },
};

describe('ValidatedIntent', () => {
  describe('createValidatedIntent', () => {
    it('returns ValidatedIntent for valid results', () => {
      const validResult: IntentValidationResult = {
        kind: 'valid',
        intent: rawIntent,
        summary: validSummary,
      };

      const validated = createValidatedIntent(validResult);

      expect(validated).not.toBeNull();
      expect(validated?.intentId).toBe('intent_123');
      expect(validated?.intentType).toBe('CREATE_CHARACTER');
      expect(validated?.payload).toEqual({ name: 'Test' });
      expect(validated?.validationSummary).toBe(validSummary);
    });

    it('returns null for invalid results', () => {
      const invalidResult: IntentValidationResult = {
        kind: 'invalid',
        errors: ['Missing required field'],
      };

      const validated = createValidatedIntent(invalidResult);

      expect(validated).toBeNull();
    });

    it('preserves payload without modification', () => {
      const complexPayload = {
        nested: { value: 42 },
        array: [1, 2, 3],
        nullField: null,
      };

      const validResult: IntentValidationResult = {
        kind: 'valid',
        intent: { ...rawIntent, payload: complexPayload },
        summary: validSummary,
      };

      const validated = createValidatedIntent(validResult);

      expect(validated?.payload).toEqual(complexPayload);
      // Verify it's the same reference (not deep copied)
      expect(validated?.payload).toBe(complexPayload);
    });
  });

  describe('Type Safety (Compile-Time)', () => {
    /**
     * NOTE: These tests document compile-time guarantees.
     * The actual type errors are caught by TypeScript, not at runtime.
     * These tests verify the runtime behavior when types are correct.
     */

    it('createValidatedIntent requires IntentValidationResult', () => {
      // This would be a compile error if we tried:
      // createValidatedIntent(rawIntent) // Error: not assignable to IntentValidationResult
      // createValidatedIntent({ kind: 'valid', intent: rawIntent }) // Error: missing summary

      // Valid call works
      const result: IntentValidationResult = {
        kind: 'valid',
        intent: rawIntent,
        summary: validSummary,
      };
      const validated = createValidatedIntent(result);
      expect(validated).not.toBeNull();
    });

    it('ValidatedIntent fields are readonly', () => {
      const validResult: IntentValidationResult = {
        kind: 'valid',
        intent: rawIntent,
        summary: validSummary,
      };

      const validated = createValidatedIntent(validResult);

      // This would be a compile error:
      // validated.intentId = 'new_id'; // Error: readonly
      // validated.payload = {}; // Error: readonly

      // We can only read
      expect(validated?.intentId).toBeDefined();
    });
  });

  describe('isValidatedIntentStructure', () => {
    it('returns true for valid structure', () => {
      const validResult: IntentValidationResult = {
        kind: 'valid',
        intent: rawIntent,
        summary: validSummary,
      };
      const validated = createValidatedIntent(validResult);

      expect(isValidatedIntentStructure(validated)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidatedIntentStructure(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidatedIntentStructure(undefined)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isValidatedIntentStructure('string')).toBe(false);
      expect(isValidatedIntentStructure(123)).toBe(false);
      expect(isValidatedIntentStructure(true)).toBe(false);
    });

    it('returns false for object missing intentId', () => {
      expect(isValidatedIntentStructure({
        intentType: 'TEST',
        payload: {},
        validationSummary: {},
      })).toBe(false);
    });

    it('returns false for object missing intentType', () => {
      expect(isValidatedIntentStructure({
        intentId: 'test',
        payload: {},
        validationSummary: {},
      })).toBe(false);
    });

    it('returns false for object missing validationSummary', () => {
      expect(isValidatedIntentStructure({
        intentId: 'test',
        intentType: 'TEST',
        payload: {},
      })).toBe(false);
    });

    it('returns false for object with null validationSummary', () => {
      expect(isValidatedIntentStructure({
        intentId: 'test',
        intentType: 'TEST',
        payload: {},
        validationSummary: null,
      })).toBe(false);
    });
  });

  describe('Brand Enforcement (Documentation)', () => {
    /**
     * These tests document the branded type behavior.
     *
     * The brand prevents:
     * 1. Assigning RawIntent to ValidatedIntent
     * 2. Creating ValidatedIntent via object literal
     * 3. Casting arbitrary objects to ValidatedIntent
     *
     * TypeScript catches these at compile time. These tests
     * verify that the only valid path is through createValidatedIntent().
     */

    it('only createValidatedIntent produces ValidatedIntent', () => {
      // The ONLY way to get a ValidatedIntent
      const validResult: IntentValidationResult = {
        kind: 'valid',
        intent: rawIntent,
        summary: validSummary,
      };
      const validated = createValidatedIntent(validResult);

      expect(validated).not.toBeNull();

      // Type assertion: validated is ValidatedIntent, not RawIntent
      // This compiles because createValidatedIntent returns ValidatedIntent
      const _typeCheck: ValidatedIntent | null = validated;
      expect(_typeCheck).toBe(validated);
    });

    it('RawIntent cannot satisfy ValidatedIntent type', () => {
      // This test documents a compile-time guarantee.
      // The following would NOT compile:
      //
      // const raw: RawIntent = rawIntent;
      // const validated: ValidatedIntent = raw; // Error: missing brand
      //
      // We verify this by ensuring the types are structurally similar
      // but the brand makes them incompatible.

      // RawIntent has: intentId, intentType, payload
      // ValidatedIntent has: intentId, intentType, payload, validationSummary, [BRAND]

      expect(Object.keys(rawIntent)).not.toContain('validationSummary');
    });
  });
});
