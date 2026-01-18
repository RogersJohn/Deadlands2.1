/**
 * Intent Builder (PR 3.0)
 *
 * A structured form for constructing raw intents.
 * No auto-fill. No inference. No guessing.
 *
 * Core principle: The UI collects explicit input, nothing more.
 *
 * This is a logic-only module - no DOM manipulation.
 * It provides state management and validation for intent building.
 */

import type {
  FieldValidation,
  IntentBuilderState,
  IntentFieldDefinition,
  IntentTypeDefinition,
  RawIntentInput,
} from '../types';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Create initial builder state
 */
export function createInitialState(): IntentBuilderState {
  return {
    selectedIntentType: null,
    fieldValues: {},
    validationErrors: {},
    isSubmitting: false,
  };
}

/**
 * Select an intent type
 *
 * Clears all field values when type changes.
 */
export function selectIntentType(
  state: IntentBuilderState,
  intentType: string
): IntentBuilderState {
  return {
    ...state,
    selectedIntentType: intentType,
    fieldValues: {},
    validationErrors: {},
  };
}

/**
 * Set a field value
 *
 * Does NOT validate - validation happens on submit.
 */
export function setFieldValue(
  state: IntentBuilderState,
  fieldName: string,
  value: unknown
): IntentBuilderState {
  return {
    ...state,
    fieldValues: {
      ...state.fieldValues,
      [fieldName]: value,
    },
    // Clear validation error for this field when value changes
    validationErrors: {
      ...state.validationErrors,
      [fieldName]: undefined,
    } as Readonly<Record<string, string>>,
  };
}

/**
 * Set submitting state
 */
export function setSubmitting(
  state: IntentBuilderState,
  isSubmitting: boolean
): IntentBuilderState {
  return {
    ...state,
    isSubmitting,
  };
}

/**
 * Set validation errors
 */
export function setValidationErrors(
  state: IntentBuilderState,
  errors: Readonly<Record<string, string>>
): IntentBuilderState {
  return {
    ...state,
    validationErrors: errors,
  };
}

// ============================================================================
// FIELD VALIDATION
// ============================================================================

/**
 * Validate a single field value
 *
 * Validation rules:
 * - Required fields must have a non-empty value
 * - Type-specific validation (string, number, boolean, select)
 * - No inference or auto-correction
 */
export function validateField(
  field: IntentFieldDefinition,
  value: unknown
): FieldValidation {
  // Required check
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      return { valid: false, error: `${field.name} is required` };
    }
  }

  // Type-specific validation
  if (value !== undefined && value !== null && value !== '') {
    switch (field.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: `${field.name} must be a string` };
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { valid: false, error: `${field.name} must be a valid number` };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { valid: false, error: `${field.name} must be true or false` };
        }
        break;

      case 'select':
        if (!field.options?.includes(String(value))) {
          return {
            valid: false,
            error: `${field.name} must be one of: ${field.options?.join(', ')}`,
          };
        }
        break;
    }
  }

  return { valid: true };
}

/**
 * Validate all fields for an intent type
 *
 * Returns a record of field name -> error message for invalid fields.
 * Empty record means all fields are valid.
 */
export function validateAllFields(
  intentType: IntentTypeDefinition,
  fieldValues: Readonly<Record<string, unknown>>
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};

  for (const field of intentType.fields) {
    const value = fieldValues[field.name];
    const result = validateField(field, value);

    if (!result.valid) {
      errors[field.name] = result.error;
    }
  }

  return errors;
}

/**
 * Check if the form is valid for submission
 */
export function canSubmit(
  state: IntentBuilderState,
  intentType: IntentTypeDefinition | null
): boolean {
  if (state.isSubmitting) {
    return false;
  }

  if (state.selectedIntentType === null || intentType === null) {
    return false;
  }

  // Validate all fields
  const errors = validateAllFields(intentType, state.fieldValues);
  return Object.keys(errors).length === 0;
}

// ============================================================================
// INTENT CONSTRUCTION
// ============================================================================

/**
 * Build a raw intent from current state
 *
 * Returns null if state is invalid.
 * Does NOT modify or infer any values.
 */
export function buildRawIntent(
  state: IntentBuilderState,
  intentType: IntentTypeDefinition | null
): RawIntentInput | null {
  if (state.selectedIntentType === null || intentType === null) {
    return null;
  }

  // Validate before building
  const errors = validateAllFields(intentType, state.fieldValues);
  if (Object.keys(errors).length > 0) {
    return null;
  }

  // Build payload from field values - no modification
  const payload: Record<string, unknown> = {};
  for (const field of intentType.fields) {
    const value = state.fieldValues[field.name];
    if (value !== undefined && value !== null && value !== '') {
      payload[field.name] = value;
    }
  }

  return {
    intentType: state.selectedIntentType,
    payload,
  };
}

// ============================================================================
// INTENT TYPE REGISTRY
// ============================================================================

/**
 * Get intent type definition by type string
 *
 * Returns null if not found.
 */
export function getIntentTypeDefinition(
  registry: readonly IntentTypeDefinition[],
  intentType: string
): IntentTypeDefinition | null {
  return registry.find((def) => def.intentType === intentType) ?? null;
}

/**
 * Example intent types for testing
 *
 * These are illustrative only - not game logic.
 * Real intent types would be defined by the backend.
 */
export const EXAMPLE_INTENT_TYPES: readonly IntentTypeDefinition[] = [
  {
    intentType: 'ATTACK',
    description: 'Declare an attack action',
    fields: [
      { name: 'attackerId', type: 'string', required: true, description: 'ID of the attacker' },
      { name: 'targetId', type: 'string', required: true, description: 'ID of the target' },
      { name: 'weaponId', type: 'string', required: true, description: 'ID of the weapon used' },
    ],
  },
  {
    intentType: 'MOVE',
    description: 'Declare a movement action',
    fields: [
      { name: 'characterId', type: 'string', required: true, description: 'ID of the character' },
      { name: 'destinationX', type: 'number', required: true, description: 'Destination X coordinate' },
      { name: 'destinationY', type: 'number', required: true, description: 'Destination Y coordinate' },
    ],
  },
  {
    intentType: 'USE_ABILITY',
    description: 'Declare using an ability',
    fields: [
      { name: 'characterId', type: 'string', required: true, description: 'ID of the character' },
      { name: 'abilityId', type: 'string', required: true, description: 'ID of the ability' },
      { name: 'targetId', type: 'string', required: false, description: 'Optional target ID' },
    ],
  },
];
