/**
 * Override Builder Tests (PR 3.1)
 *
 * Tests proving explicit behavior:
 * - No defaults, no inference, no convenience
 * - All fields must be explicitly set
 * - Scope enforcement (cannot override invalid intents)
 * - Validation requires explicit reason
 */

import { describe, it, expect } from 'vitest';
import {
  checkOverrideScope,
  createInitialOverrideState,
  openOverrideBuilder,
  closeOverrideBuilder,
  selectOutcome,
  setReason,
  selectWarningSeverity,
  validateOverrideForm,
  canSubmitOverride,
  buildOverrideRequest,
  getOverrideDescription,
  getOriginalOutcome,
  getSeverityDescription,
  getAvailableOutcomes,
  getAvailableSeverities,
} from './OverrideBuilder';
import type {
  PipelineResult,
  ValidationReport,
  OverrideBuilderState,
} from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockValidationReport = (
  outcome: 'PASS' | 'FAIL' | 'AMBIGUOUS' = 'FAIL'
): ValidationReport => ({
  invocationId: 'inv_test_001',
  sourceIntentId: 'intent_test_001',
  intentType: 'ATTACK',
  rulesetId: 'deadlands_core',
  outcome,
  violations: outcome === 'FAIL'
    ? [{ ruleId: 'rule_001', message: 'Test violation', severity: 'ERROR' as const }]
    : [],
  ambiguity: outcome === 'AMBIGUOUS'
    ? { reason: 'Test ambiguity', possibleInterpretations: ['A', 'B'] }
    : null,
  payload: { targetId: 'target_001' },
});

const createSuccessResult = (
  outcome: 'PASS' | 'FAIL' | 'AMBIGUOUS' = 'FAIL'
): PipelineResult => ({
  kind: 'success',
  intentId: 'intent_test_001',
  validation: createMockValidationReport(outcome),
  override: null,
  effectiveOutcome: outcome,
  resolution: {
    outcome: outcome === 'PASS' ? 'EFFECTS_PRODUCED' : 'NO_EFFECTS_FAIL',
    effects: [],
    explanation: 'Test resolution',
  },
});

const createValidationErrorResult = (): PipelineResult => ({
  kind: 'validation_error',
  errors: ['Missing required field: targetId'],
});

const createAdapterFailureResult = (): PipelineResult => ({
  kind: 'adapter_failure',
  code: 'NO_ADAPTER',
  details: 'No adapter found for intent type',
});

// ============================================================================
// SCOPE CHECKING TESTS
// ============================================================================

describe('checkOverrideScope', () => {
  it('allows override for success results', () => {
    const result = createSuccessResult('FAIL');
    const scope = checkOverrideScope(result);

    expect(scope.allowed).toBe(true);
    if (scope.allowed) {
      expect(scope.validation).toEqual(result.validation);
    }
  });

  it('allows override for PASS outcome', () => {
    const result = createSuccessResult('PASS');
    const scope = checkOverrideScope(result);

    expect(scope.allowed).toBe(true);
  });

  it('allows override for AMBIGUOUS outcome', () => {
    const result = createSuccessResult('AMBIGUOUS');
    const scope = checkOverrideScope(result);

    expect(scope.allowed).toBe(true);
  });

  it('REJECTS override for validation_error', () => {
    const result = createValidationErrorResult();
    const scope = checkOverrideScope(result);

    expect(scope.allowed).toBe(false);
    if (!scope.allowed) {
      expect(scope.reason).toContain('structural validation');
    }
  });

  it('REJECTS override for adapter_failure', () => {
    const result = createAdapterFailureResult();
    const scope = checkOverrideScope(result);

    expect(scope.allowed).toBe(false);
    if (!scope.allowed) {
      expect(scope.reason).toContain('Adapter failure');
    }
  });
});

// ============================================================================
// STATE MANAGEMENT TESTS
// ============================================================================

describe('createInitialOverrideState', () => {
  it('creates closed state with no defaults', () => {
    const state = createInitialOverrideState();

    expect(state.isOpen).toBe(false);
    expect(state.targetValidation).toBeNull();
    expect(state.selectedOutcome).toBeNull();
    expect(state.reason).toBe('');
    expect(state.warningSeverity).toBeNull();
    expect(state.isSubmitting).toBe(false);
    expect(Object.keys(state.validationErrors)).toHaveLength(0);
  });
});

describe('openOverrideBuilder', () => {
  it('opens with validation report but NO defaults', () => {
    const initial = createInitialOverrideState();
    const validation = createMockValidationReport('FAIL');
    const state = openOverrideBuilder(initial, validation);

    expect(state.isOpen).toBe(true);
    expect(state.targetValidation).toEqual(validation);
    // NO defaults - these must be explicitly set
    expect(state.selectedOutcome).toBeNull();
    expect(state.reason).toBe('');
    expect(state.warningSeverity).toBeNull();
  });

  it('clears previous state when opened', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'Old reason');

    // Open again with different validation
    const newValidation = createMockValidationReport('AMBIGUOUS');
    state = openOverrideBuilder(state, newValidation);

    // Previous selections are cleared
    expect(state.selectedOutcome).toBeNull();
    expect(state.reason).toBe('');
  });
});

describe('closeOverrideBuilder', () => {
  it('resets to initial state', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'Test reason here');

    state = closeOverrideBuilder(state);

    expect(state.isOpen).toBe(false);
    expect(state.targetValidation).toBeNull();
    expect(state.selectedOutcome).toBeNull();
    expect(state.reason).toBe('');
  });
});

describe('selectOutcome', () => {
  it('sets the selected outcome', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');

    expect(state.selectedOutcome).toBe('PASS');
  });

  it('clears outcome validation error', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = { ...state, validationErrors: { selectedOutcome: 'Required' } };

    state = selectOutcome(state, 'PASS');

    expect(state.validationErrors['selectedOutcome']).toBeUndefined();
  });
});

describe('setReason', () => {
  it('sets the reason text', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = setReason(state, 'The rules do not account for this situation');

    expect(state.reason).toBe('The rules do not account for this situation');
  });

  it('clears reason validation error', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = { ...state, validationErrors: { reason: 'Required' } };

    state = setReason(state, 'Valid reason text');

    expect(state.validationErrors['reason']).toBeUndefined();
  });
});

describe('selectWarningSeverity', () => {
  it('sets the warning severity', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectWarningSeverity(state, 'WARNING');

    expect(state.warningSeverity).toBe('WARNING');
  });
});

// ============================================================================
// VALIDATION TESTS
// ============================================================================

describe('validateOverrideForm', () => {
  it('requires targetValidation', () => {
    const state = createInitialOverrideState();
    const errors = validateOverrideForm(state);

    expect(errors['targetValidation']).toBeDefined();
  });

  it('requires selectedOutcome to be explicitly chosen', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    // Do NOT select outcome

    const errors = validateOverrideForm(state);

    expect(errors['selectedOutcome']).toContain('must select');
  });

  it('requires non-empty reason', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    // Do NOT set reason

    const errors = validateOverrideForm(state);

    expect(errors['reason']).toContain('must provide a reason');
  });

  it('requires reason to be at least 10 characters (enforce explicitness)', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'Too short');

    const errors = validateOverrideForm(state);

    expect(errors['reason']).toContain('at least 10 characters');
  });

  it('requires warningSeverity to be explicitly chosen', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'Valid reason here');
    // Do NOT select severity

    const errors = validateOverrideForm(state);

    expect(errors['warningSeverity']).toContain('must select');
  });

  it('returns empty errors when all fields are valid', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'The character has a special ability that overrides this rule');
    state = selectWarningSeverity(state, 'INFO');

    const errors = validateOverrideForm(state);

    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('canSubmitOverride', () => {
  it('returns false when not open', () => {
    const state = createInitialOverrideState();

    expect(canSubmitOverride(state)).toBe(false);
  });

  it('returns false when submitting', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'Valid reason here');
    state = selectWarningSeverity(state, 'INFO');
    state = { ...state, isSubmitting: true };

    expect(canSubmitOverride(state)).toBe(false);
  });

  it('returns false when validation fails', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    // Missing required fields

    expect(canSubmitOverride(state)).toBe(false);
  });

  it('returns true when all fields are valid', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'The character has a special ability that overrides this rule');
    state = selectWarningSeverity(state, 'INFO');

    expect(canSubmitOverride(state)).toBe(true);
  });
});

// ============================================================================
// REQUEST BUILDING TESTS
// ============================================================================

describe('buildOverrideRequest', () => {
  it('returns null when state is invalid', () => {
    const state = createInitialOverrideState();

    const request = buildOverrideRequest(state, 'gm_001');

    expect(request).toBeNull();
  });

  it('builds request with all explicit values', () => {
    let state = createInitialOverrideState();
    const validation = createMockValidationReport('FAIL');
    state = openOverrideBuilder(state, validation);
    state = selectOutcome(state, 'PASS');
    state = setReason(state, 'The character has a special ability');
    state = selectWarningSeverity(state, 'WARNING');

    const request = buildOverrideRequest(state, 'gm_001');

    expect(request).not.toBeNull();
    expect(request!.validationReport).toEqual(validation);
    expect(request!.newOutcome).toBe('PASS');
    expect(request!.reason).toBe('The character has a special ability');
    expect(request!.warningSeverity).toBe('WARNING');
    expect(request!.warningMessage).toContain('The character has a special ability');
    expect(request!.gmId).toBe('gm_001');
  });

  it('trims reason in request', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');
    state = setReason(state, '  Reason with whitespace  ');
    state = selectWarningSeverity(state, 'INFO');

    const request = buildOverrideRequest(state, 'gm_001');

    expect(request!.reason).toBe('Reason with whitespace');
  });
});

// ============================================================================
// DISPLAY HELPER TESTS
// ============================================================================

describe('getOverrideDescription', () => {
  it('returns null when no validation or outcome selected', () => {
    const state = createInitialOverrideState();

    expect(getOverrideDescription(state)).toBeNull();
  });

  it('describes changing outcome', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'PASS');

    const description = getOverrideDescription(state);

    expect(description).toContain('FAIL');
    expect(description).toContain('PASS');
    expect(description).toContain('changing');
  });

  it('describes reasserting same outcome', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));
    state = selectOutcome(state, 'FAIL');

    const description = getOverrideDescription(state);

    expect(description).toContain('reasserting');
    expect(description).toContain('audit record');
  });
});

describe('getOriginalOutcome', () => {
  it('returns null when no validation', () => {
    const state = createInitialOverrideState();

    expect(getOriginalOutcome(state)).toBeNull();
  });

  it('returns the original outcome from validation', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('AMBIGUOUS'));

    expect(getOriginalOutcome(state)).toBe('AMBIGUOUS');
  });
});

describe('getSeverityDescription', () => {
  it('describes INFO severity', () => {
    expect(getSeverityDescription('INFO')).toContain('Minor');
  });

  it('describes WARNING severity', () => {
    expect(getSeverityDescription('WARNING')).toContain('Significant');
  });

  it('describes CRITICAL severity', () => {
    expect(getSeverityDescription('CRITICAL')).toContain('Major');
  });
});

describe('getAvailableOutcomes', () => {
  it('returns all three outcomes with descriptions', () => {
    const outcomes = getAvailableOutcomes();

    expect(outcomes).toHaveLength(3);
    expect(outcomes.map(o => o.value)).toEqual(['PASS', 'FAIL', 'AMBIGUOUS']);
    outcomes.forEach(o => {
      expect(o.label).toBeDefined();
      expect(o.description).toBeDefined();
    });
  });
});

describe('getAvailableSeverities', () => {
  it('returns all three severities with descriptions', () => {
    const severities = getAvailableSeverities();

    expect(severities).toHaveLength(3);
    expect(severities.map(s => s.value)).toEqual(['INFO', 'WARNING', 'CRITICAL']);
    severities.forEach(s => {
      expect(s.label).toBeDefined();
      expect(s.description).toBeDefined();
    });
  });
});

// ============================================================================
// EXPLICIT BEHAVIOR TESTS (Core requirement)
// ============================================================================

describe('Explicit Behavior (no defaults, no inference)', () => {
  it('NEVER auto-fills outcome', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));

    // Even though original is FAIL, no default is set
    expect(state.selectedOutcome).toBeNull();
  });

  it('NEVER auto-fills reason', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));

    expect(state.reason).toBe('');
  });

  it('NEVER auto-fills severity', () => {
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('FAIL'));

    expect(state.warningSeverity).toBeNull();
  });

  it('NEVER suggests or infers outcome from context', () => {
    // Opening with a FAIL validation does not suggest PASS
    // Opening with AMBIGUOUS does not suggest resolving to PASS or FAIL
    let state = createInitialOverrideState();
    state = openOverrideBuilder(state, createMockValidationReport('AMBIGUOUS'));

    expect(state.selectedOutcome).toBeNull();
    // No "suggested" or "recommended" field exists in state
    expect('suggestedOutcome' in state).toBe(false);
    expect('recommendedOutcome' in state).toBe(false);
  });

  it('requires EXPLICIT action for every field', () => {
    let state = createInitialOverrideState();
    const validation = createMockValidationReport('FAIL');

    // Open builder
    state = openOverrideBuilder(state, validation);
    expect(canSubmitOverride(state)).toBe(false);

    // Select outcome - still cannot submit
    state = selectOutcome(state, 'PASS');
    expect(canSubmitOverride(state)).toBe(false);

    // Set reason - still cannot submit
    state = setReason(state, 'Valid reason here');
    expect(canSubmitOverride(state)).toBe(false);

    // Select severity - NOW can submit
    state = selectWarningSeverity(state, 'INFO');
    expect(canSubmitOverride(state)).toBe(true);
  });
});
