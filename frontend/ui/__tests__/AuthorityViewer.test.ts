/**
 * Authority Viewer Tests (PR 3.0)
 *
 * Tests prove:
 * - UI renders PASS / FAIL / AMBIGUOUS distinctly
 * - UI does not alter backend outputs
 * - All authority chain elements are visible
 * - No interpretation or modification of data
 */

import { describe, it, expect } from 'vitest';
import {
  toIntentView,
  toValidationView,
  toOverrideView,
  toEffectView,
  toResolutionView,
  toAuthorityChainView,
  toErrorView,
} from '../components/AuthorityViewer';
import type {
  RawIntentInput,
  ValidationReport,
  GmOverride,
  Effect,
  ResolutionResult,
  PipelineResult,
} from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const testIntent: RawIntentInput = {
  intentType: 'ATTACK',
  payload: {
    attackerId: 'char_1',
    targetId: 'enemy_1',
    weaponId: 'sword_1',
  },
};

const passValidation: ValidationReport = {
  invocationId: 'inv_001',
  sourceIntentId: 'intent_001',
  intentType: 'ATTACK',
  rulesetId: 'combat_rules',
  outcome: 'PASS',
  violations: [],
  ambiguity: null,
  payload: testIntent.payload,
};

const failValidation: ValidationReport = {
  invocationId: 'inv_002',
  sourceIntentId: 'intent_002',
  intentType: 'ATTACK',
  rulesetId: 'combat_rules',
  outcome: 'FAIL',
  violations: [
    { ruleId: 'rule_001', message: 'Target out of range', severity: 'ERROR' },
    { ruleId: 'rule_002', message: 'Low ammo warning', severity: 'WARNING' },
  ],
  ambiguity: null,
  payload: testIntent.payload,
};

const ambiguousValidation: ValidationReport = {
  invocationId: 'inv_003',
  sourceIntentId: 'intent_003',
  intentType: 'ATTACK',
  rulesetId: 'combat_rules',
  outcome: 'AMBIGUOUS',
  violations: [],
  ambiguity: {
    reason: 'Multiple valid targets',
    possibleInterpretations: ['Target A', 'Target B', 'Target C'],
  },
  payload: testIntent.payload,
};

const testOverride: GmOverride = {
  overrideId: 'ovr_001',
  parentOverrideId: null,
  overriddenOutcome: { newOutcome: 'PASS' },
  warning: { severity: 'WARNING', message: 'GM allows the action' },
  reason: 'Rule of cool',
  issuedBy: 'gm_001',
  issuedAt: 1234567890,
};

const testEffect: Effect = {
  effectId: 'eff_001',
  effectType: 'DEAL_DAMAGE',
  target: { targetId: 'enemy_1', targetType: 'character' },
  authority: { invocationId: 'inv_001', source: 'RULES', outcome: 'PASS' },
  parameters: { damageDescriptor: 2, damageType: 'slashing' },
  description: 'Deal 2 slashing damage to enemy_1',
};

// ============================================================================
// INTENT VIEW TESTS
// ============================================================================

describe('AuthorityViewer - Intent View', () => {
  it('displays intent type', () => {
    const view = toIntentView(testIntent);

    expect(view.intentType).toBe('ATTACK');
  });

  it('displays all payload fields', () => {
    const view = toIntentView(testIntent);

    expect(view.payloadFields).toHaveLength(3);
    expect(view.payloadFields.find((f) => f.key === 'attackerId')?.value).toBe('char_1');
    expect(view.payloadFields.find((f) => f.key === 'targetId')?.value).toBe('enemy_1');
    expect(view.payloadFields.find((f) => f.key === 'weaponId')?.value).toBe('sword_1');
  });

  it('preserves original payload', () => {
    const view = toIntentView(testIntent);

    expect(view.payload).toEqual(testIntent.payload);
  });
});

// ============================================================================
// VALIDATION VIEW TESTS
// ============================================================================

describe('AuthorityViewer - Validation View', () => {
  describe('PASS outcome', () => {
    it('displays PASS outcome distinctly', () => {
      const view = toValidationView(passValidation);

      expect(view.outcome).toBe('PASS');
      expect(view.outcomeLabel).toBe('PASS');
      expect(view.outcomeDescription).toContain('satisfied');
    });

    it('shows no violations', () => {
      const view = toValidationView(passValidation);

      expect(view.hasViolations).toBe(false);
      expect(view.violations).toHaveLength(0);
    });

    it('shows no ambiguity', () => {
      const view = toValidationView(passValidation);

      expect(view.hasAmbiguity).toBe(false);
      expect(view.ambiguity).toBeNull();
    });
  });

  describe('FAIL outcome', () => {
    it('displays FAIL outcome distinctly', () => {
      const view = toValidationView(failValidation);

      expect(view.outcome).toBe('FAIL');
      expect(view.outcomeLabel).toBe('FAIL');
      expect(view.outcomeDescription).toContain('violated');
    });

    it('shows all violations', () => {
      const view = toValidationView(failValidation);

      expect(view.hasViolations).toBe(true);
      expect(view.violations).toHaveLength(2);
    });

    it('preserves violation details', () => {
      const view = toValidationView(failValidation);

      const errorViolation = view.violations.find((v) => v.ruleId === 'rule_001');
      expect(errorViolation).toBeDefined();
      expect(errorViolation!.message).toBe('Target out of range');
      expect(errorViolation!.severity).toBe('ERROR');
      expect(errorViolation!.severityLabel).toBe('Error');
    });

    it('distinguishes ERROR and WARNING severities', () => {
      const view = toValidationView(failValidation);

      const errorViolation = view.violations.find((v) => v.severity === 'ERROR');
      const warningViolation = view.violations.find((v) => v.severity === 'WARNING');

      expect(errorViolation!.severityLabel).toBe('Error');
      expect(warningViolation!.severityLabel).toBe('Warning');
    });
  });

  describe('AMBIGUOUS outcome', () => {
    it('displays AMBIGUOUS outcome distinctly', () => {
      const view = toValidationView(ambiguousValidation);

      expect(view.outcome).toBe('AMBIGUOUS');
      expect(view.outcomeLabel).toBe('AMBIGUOUS');
      expect(view.outcomeDescription).toContain('GM decision required');
    });

    it('shows ambiguity reason', () => {
      const view = toValidationView(ambiguousValidation);

      expect(view.hasAmbiguity).toBe(true);
      expect(view.ambiguity).not.toBeNull();
      expect(view.ambiguity!.reason).toBe('Multiple valid targets');
    });

    it('shows all possible interpretations', () => {
      const view = toValidationView(ambiguousValidation);

      expect(view.ambiguity!.interpretations).toHaveLength(3);
      expect(view.ambiguity!.interpretations).toContain('Target A');
      expect(view.ambiguity!.interpretations).toContain('Target B');
      expect(view.ambiguity!.interpretations).toContain('Target C');
    });
  });

  it('preserves invocation ID', () => {
    const view = toValidationView(passValidation);

    expect(view.invocationId).toBe('inv_001');
  });

  it('preserves ruleset ID', () => {
    const view = toValidationView(passValidation);

    expect(view.rulesetId).toBe('combat_rules');
  });
});

// ============================================================================
// OVERRIDE VIEW TESTS
// ============================================================================

describe('AuthorityViewer - Override View', () => {
  it('shows original and new outcome', () => {
    const view = toOverrideView(testOverride, 'FAIL');

    expect(view.originalOutcome).toBe('FAIL');
    expect(view.newOutcome).toBe('PASS');
  });

  it('shows override reason', () => {
    const view = toOverrideView(testOverride, 'FAIL');

    expect(view.reason).toBe('Rule of cool');
  });

  it('shows warning with severity', () => {
    const view = toOverrideView(testOverride, 'FAIL');

    expect(view.warning.severity).toBe('WARNING');
    expect(view.warning.severityLabel).toBe('Warning');
    expect(view.warning.message).toBe('GM allows the action');
  });

  it('shows issuer information', () => {
    const view = toOverrideView(testOverride, 'FAIL');

    expect(view.issuedBy).toBe('gm_001');
    expect(view.issuedAt).toContain('1234567890');
  });
});

// ============================================================================
// EFFECT VIEW TESTS
// ============================================================================

describe('AuthorityViewer - Effect View', () => {
  it('shows effect type', () => {
    const view = toEffectView(testEffect);

    expect(view.effectType).toBe('DEAL_DAMAGE');
  });

  it('shows effect description', () => {
    const view = toEffectView(testEffect);

    expect(view.description).toBe('Deal 2 slashing damage to enemy_1');
  });

  it('shows target information', () => {
    const view = toEffectView(testEffect);

    expect(view.targetId).toBe('enemy_1');
    expect(view.targetType).toBe('character');
  });

  it('shows authority source', () => {
    const view = toEffectView(testEffect);

    expect(view.authoritySource).toBe('RULES');
  });

  it('shows parameters as key-value pairs', () => {
    const view = toEffectView(testEffect);

    expect(view.parameters).toContainEqual({ key: 'damageDescriptor', value: '2' });
    expect(view.parameters).toContainEqual({ key: 'damageType', value: 'slashing' });
  });
});

// ============================================================================
// RESOLUTION VIEW TESTS
// ============================================================================

describe('AuthorityViewer - Resolution View', () => {
  it('shows effects produced outcome', () => {
    const resolution: ResolutionResult = {
      outcome: 'EFFECTS_PRODUCED',
      effects: [testEffect],
      explanation: '1 effect(s) produced',
    };

    const view = toResolutionView(resolution);

    expect(view.outcomeLabel).toBe('Effects Produced');
    expect(view.hasEffects).toBe(true);
    expect(view.effects).toHaveLength(1);
  });

  it('shows no effects for FAIL', () => {
    const resolution: ResolutionResult = {
      outcome: 'NO_EFFECTS_FAIL',
      effects: [],
      explanation: 'No effects: FAIL',
    };

    const view = toResolutionView(resolution);

    expect(view.outcomeLabel).toBe('No Effects (FAIL)');
    expect(view.hasEffects).toBe(false);
    expect(view.effects).toHaveLength(0);
  });

  it('shows no effects for AMBIGUOUS', () => {
    const resolution: ResolutionResult = {
      outcome: 'NO_EFFECTS_AMBIGUOUS',
      effects: [],
      explanation: 'No effects: AMBIGUOUS',
    };

    const view = toResolutionView(resolution);

    expect(view.outcomeLabel).toBe('No Effects (AMBIGUOUS)');
    expect(view.hasEffects).toBe(false);
  });

  it('preserves explanation', () => {
    const resolution: ResolutionResult = {
      outcome: 'EFFECTS_PRODUCED',
      effects: [],
      explanation: 'Custom explanation text',
    };

    const view = toResolutionView(resolution);

    expect(view.explanation).toBe('Custom explanation text');
  });
});

// ============================================================================
// AUTHORITY CHAIN VIEW TESTS
// ============================================================================

describe('AuthorityViewer - Authority Chain View', () => {
  it('builds complete chain for success result', () => {
    const result: PipelineResult = {
      kind: 'success',
      intentId: 'intent_001',
      validation: passValidation,
      override: null,
      effectiveOutcome: 'PASS',
      resolution: {
        outcome: 'EFFECTS_PRODUCED',
        effects: [testEffect],
        explanation: 'Effects produced',
      },
    };

    const view = toAuthorityChainView(testIntent, result);

    expect(view).not.toBeNull();
    expect(view!.intent.intentType).toBe('ATTACK');
    expect(view!.validation.outcome).toBe('PASS');
    expect(view!.override).toBeNull();
    expect(view!.effectiveOutcome).toBe('PASS');
    expect(view!.resolution.hasEffects).toBe(true);
    expect(view!.wasOverridden).toBe(false);
  });

  it('includes override when present', () => {
    const result: PipelineResult = {
      kind: 'success',
      intentId: 'intent_001',
      validation: failValidation,
      override: testOverride,
      effectiveOutcome: 'PASS',
      resolution: {
        outcome: 'EFFECTS_PRODUCED',
        effects: [testEffect],
        explanation: 'Effects produced via override',
      },
    };

    const view = toAuthorityChainView(testIntent, result);

    expect(view!.wasOverridden).toBe(true);
    expect(view!.override).not.toBeNull();
    expect(view!.override!.originalOutcome).toBe('FAIL');
    expect(view!.override!.newOutcome).toBe('PASS');
    expect(view!.effectiveOutcome).toBe('PASS');
  });

  it('returns null for non-success results', () => {
    const errorResult: PipelineResult = {
      kind: 'validation_error',
      errors: ['Invalid intent'],
    };

    const view = toAuthorityChainView(testIntent, errorResult);

    expect(view).toBeNull();
  });
});

// ============================================================================
// ERROR VIEW TESTS
// ============================================================================

describe('AuthorityViewer - Error View', () => {
  it('returns null for success result', () => {
    const result: PipelineResult = {
      kind: 'success',
      intentId: 'intent_001',
      validation: passValidation,
      override: null,
      effectiveOutcome: 'PASS',
      resolution: { outcome: 'EFFECTS_PRODUCED', effects: [], explanation: '' },
    };

    const view = toErrorView(result);

    expect(view).toBeNull();
  });

  it('returns validation errors', () => {
    const result: PipelineResult = {
      kind: 'validation_error',
      errors: ['Error 1', 'Error 2'],
    };

    const view = toErrorView(result);

    expect(view).not.toBeNull();
    expect(view!.kind).toBe('validation_error');
    if (view!.kind === 'validation_error') {
      expect(view!.errors).toHaveLength(2);
      expect(view!.errors).toContain('Error 1');
    }
  });

  it('returns adapter failures', () => {
    const result: PipelineResult = {
      kind: 'adapter_failure',
      code: 'NO_PIPELINE',
      details: 'No pipeline for intent type',
    };

    const view = toErrorView(result);

    expect(view).not.toBeNull();
    expect(view!.kind).toBe('adapter_failure');
    if (view!.kind === 'adapter_failure') {
      expect(view!.code).toBe('NO_PIPELINE');
      expect(view!.details).toBe('No pipeline for intent type');
    }
  });
});

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

describe('AuthorityViewer - Data Integrity', () => {
  it('does not modify input validation report', () => {
    const original = JSON.stringify(passValidation);

    toValidationView(passValidation);

    expect(JSON.stringify(passValidation)).toBe(original);
  });

  it('does not modify input override', () => {
    const original = JSON.stringify(testOverride);

    toOverrideView(testOverride, 'FAIL');

    expect(JSON.stringify(testOverride)).toBe(original);
  });

  it('does not modify input effect', () => {
    const original = JSON.stringify(testEffect);

    toEffectView(testEffect);

    expect(JSON.stringify(testEffect)).toBe(original);
  });
});
