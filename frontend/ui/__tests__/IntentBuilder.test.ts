/**
 * Intent Builder Tests (PR 3.0)
 *
 * Tests prove:
 * - UI collects explicit input without modification
 * - Missing fields prevent submission
 * - Invalid fields are rejected
 * - No auto-fill or inference
 */

import {
  createInitialState,
  selectIntentType,
  setFieldValue,
  validateField,
  validateAllFields,
  canSubmit,
  buildRawIntent,
  getIntentTypeDefinition,
  EXAMPLE_INTENT_TYPES,
} from '../components/IntentBuilder';
import type { IntentFieldDefinition, IntentTypeDefinition } from '../types';

// ============================================================================
// INITIAL STATE TESTS
// ============================================================================

describe('IntentBuilder - Initial State', () => {
  it('starts with no selected intent type', () => {
    const state = createInitialState();

    expect(state.selectedIntentType).toBeNull();
    expect(state.fieldValues).toEqual({});
    expect(state.validationErrors).toEqual({});
    expect(state.isSubmitting).toBe(false);
  });
});

// ============================================================================
// INTENT TYPE SELECTION TESTS
// ============================================================================

describe('IntentBuilder - Intent Type Selection', () => {
  it('selects intent type', () => {
    const state = createInitialState();
    const newState = selectIntentType(state, 'ATTACK');

    expect(newState.selectedIntentType).toBe('ATTACK');
  });

  it('clears field values when intent type changes', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');

    // Change intent type
    const newState = selectIntentType(state, 'MOVE');

    expect(newState.fieldValues).toEqual({});
    expect(newState.validationErrors).toEqual({});
  });
});

// ============================================================================
// FIELD VALUE TESTS
// ============================================================================

describe('IntentBuilder - Field Values', () => {
  it('sets field value', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');

    expect(state.fieldValues['attackerId']).toBe('char_1');
  });

  it('does not modify other fields when setting a value', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    state = setFieldValue(state, 'targetId', 'enemy_1');

    expect(state.fieldValues['attackerId']).toBe('char_1');
    expect(state.fieldValues['targetId']).toBe('enemy_1');
  });

  it('clears validation error when field value changes', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = {
      ...state,
      validationErrors: { attackerId: 'Required' },
    };

    state = setFieldValue(state, 'attackerId', 'char_1');

    expect(state.validationErrors['attackerId']).toBeUndefined();
  });
});

// ============================================================================
// FIELD VALIDATION TESTS
// ============================================================================

describe('IntentBuilder - Field Validation', () => {
  describe('required fields', () => {
    const requiredField: IntentFieldDefinition = {
      name: 'testField',
      type: 'string',
      required: true,
    };

    it('rejects undefined value for required field', () => {
      const result = validateField(requiredField, undefined);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('required');
      }
    });

    it('rejects null value for required field', () => {
      const result = validateField(requiredField, null);

      expect(result.valid).toBe(false);
    });

    it('rejects empty string for required field', () => {
      const result = validateField(requiredField, '');

      expect(result.valid).toBe(false);
    });

    it('accepts non-empty value for required field', () => {
      const result = validateField(requiredField, 'value');

      expect(result.valid).toBe(true);
    });
  });

  describe('type validation', () => {
    it('validates string type', () => {
      const field: IntentFieldDefinition = { name: 'test', type: 'string', required: false };

      expect(validateField(field, 'hello').valid).toBe(true);
      expect(validateField(field, 123).valid).toBe(false);
    });

    it('validates number type', () => {
      const field: IntentFieldDefinition = { name: 'test', type: 'number', required: false };

      expect(validateField(field, 42).valid).toBe(true);
      expect(validateField(field, 'hello').valid).toBe(false);
      expect(validateField(field, NaN).valid).toBe(false);
    });

    it('validates boolean type', () => {
      const field: IntentFieldDefinition = { name: 'test', type: 'boolean', required: false };

      expect(validateField(field, true).valid).toBe(true);
      expect(validateField(field, false).valid).toBe(true);
      expect(validateField(field, 'true').valid).toBe(false);
    });

    it('validates select type', () => {
      const field: IntentFieldDefinition = {
        name: 'test',
        type: 'select',
        required: false,
        options: ['A', 'B', 'C'],
      };

      expect(validateField(field, 'A').valid).toBe(true);
      expect(validateField(field, 'D').valid).toBe(false);
    });
  });

  describe('optional fields', () => {
    it('accepts undefined for optional field', () => {
      const field: IntentFieldDefinition = { name: 'test', type: 'string', required: false };

      const result = validateField(field, undefined);

      expect(result.valid).toBe(true);
    });

    it('accepts empty string for optional field', () => {
      const field: IntentFieldDefinition = { name: 'test', type: 'string', required: false };

      const result = validateField(field, '');

      expect(result.valid).toBe(true);
    });
  });
});

// ============================================================================
// FORM VALIDATION TESTS
// ============================================================================

describe('IntentBuilder - Form Validation', () => {
  const attackType: IntentTypeDefinition = {
    intentType: 'ATTACK',
    description: 'Attack action',
    fields: [
      { name: 'attackerId', type: 'string', required: true },
      { name: 'targetId', type: 'string', required: true },
      { name: 'weaponId', type: 'string', required: true },
    ],
  };

  it('returns errors for all missing required fields', () => {
    const errors = validateAllFields(attackType, {});

    expect(Object.keys(errors)).toHaveLength(3);
    expect(errors['attackerId']).toBeDefined();
    expect(errors['targetId']).toBeDefined();
    expect(errors['weaponId']).toBeDefined();
  });

  it('returns empty errors when all fields are valid', () => {
    const errors = validateAllFields(attackType, {
      attackerId: 'char_1',
      targetId: 'enemy_1',
      weaponId: 'sword_1',
    });

    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns errors only for invalid fields', () => {
    const errors = validateAllFields(attackType, {
      attackerId: 'char_1',
      // targetId missing
      weaponId: 'sword_1',
    });

    expect(Object.keys(errors)).toHaveLength(1);
    expect(errors['targetId']).toBeDefined();
  });
});

// ============================================================================
// CAN SUBMIT TESTS
// ============================================================================

describe('IntentBuilder - Can Submit', () => {
  const attackType: IntentTypeDefinition = {
    intentType: 'ATTACK',
    description: 'Attack action',
    fields: [
      { name: 'attackerId', type: 'string', required: true },
      { name: 'targetId', type: 'string', required: true },
    ],
  };

  it('cannot submit without selected intent type', () => {
    const state = createInitialState();

    expect(canSubmit(state, null)).toBe(false);
  });

  it('cannot submit while already submitting', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    state = setFieldValue(state, 'targetId', 'enemy_1');
    state = { ...state, isSubmitting: true };

    expect(canSubmit(state, attackType)).toBe(false);
  });

  it('cannot submit with missing required fields', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    // Missing targetId

    expect(canSubmit(state, attackType)).toBe(false);
  });

  it('can submit with all required fields', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    state = setFieldValue(state, 'targetId', 'enemy_1');

    expect(canSubmit(state, attackType)).toBe(true);
  });
});

// ============================================================================
// BUILD RAW INTENT TESTS
// ============================================================================

describe('IntentBuilder - Build Raw Intent', () => {
  const attackType: IntentTypeDefinition = {
    intentType: 'ATTACK',
    description: 'Attack action',
    fields: [
      { name: 'attackerId', type: 'string', required: true },
      { name: 'targetId', type: 'string', required: true },
      { name: 'modifier', type: 'string', required: false },
    ],
  };

  it('returns null without selected intent type', () => {
    const state = createInitialState();

    expect(buildRawIntent(state, null)).toBeNull();
  });

  it('returns null with invalid fields', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    // Missing targetId

    expect(buildRawIntent(state, attackType)).toBeNull();
  });

  it('builds intent with all required fields', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    state = setFieldValue(state, 'targetId', 'enemy_1');

    const intent = buildRawIntent(state, attackType);

    expect(intent).not.toBeNull();
    expect(intent!.intentType).toBe('ATTACK');
    expect(intent!.payload).toEqual({
      attackerId: 'char_1',
      targetId: 'enemy_1',
    });
  });

  it('does not include empty optional fields', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    state = setFieldValue(state, 'targetId', 'enemy_1');
    state = setFieldValue(state, 'modifier', ''); // Empty optional

    const intent = buildRawIntent(state, attackType);

    expect(intent!.payload).not.toHaveProperty('modifier');
  });

  it('includes non-empty optional fields', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', 'char_1');
    state = setFieldValue(state, 'targetId', 'enemy_1');
    state = setFieldValue(state, 'modifier', '+2');

    const intent = buildRawIntent(state, attackType);

    expect(intent!.payload).toEqual({
      attackerId: 'char_1',
      targetId: 'enemy_1',
      modifier: '+2',
    });
  });

  it('does not modify input values', () => {
    let state = createInitialState();
    state = selectIntentType(state, 'ATTACK');
    state = setFieldValue(state, 'attackerId', '  char_1  '); // Whitespace preserved
    state = setFieldValue(state, 'targetId', 'enemy_1');

    const intent = buildRawIntent(state, attackType);

    // Whitespace is preserved - no auto-trimming
    expect(intent!.payload['attackerId']).toBe('  char_1  ');
  });
});

// ============================================================================
// INTENT TYPE REGISTRY TESTS
// ============================================================================

describe('IntentBuilder - Intent Type Registry', () => {
  it('finds intent type definition', () => {
    const def = getIntentTypeDefinition(EXAMPLE_INTENT_TYPES, 'ATTACK');

    expect(def).not.toBeNull();
    expect(def!.intentType).toBe('ATTACK');
  });

  it('returns null for unknown intent type', () => {
    const def = getIntentTypeDefinition(EXAMPLE_INTENT_TYPES, 'UNKNOWN');

    expect(def).toBeNull();
  });
});
