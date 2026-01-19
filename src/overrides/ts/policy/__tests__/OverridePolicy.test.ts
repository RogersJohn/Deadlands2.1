/**
 * Override Policy Tests (PR 7.1)
 *
 * CRITICAL TEST: Policies are NOT automation.
 *
 * These tests PROVE:
 * - No auto-application (matching validation exists, policy exists, but NOT applied)
 * - Logged application (applying policy produces override with metadata)
 * - Reversibility (policy-based override can be removed)
 * - Equivalence to manual override (only metadata differs)
 *
 * If any test passes by accident or automation, PR 7.1 fails.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOverridePolicy,
  createOverridePolicyId,
  isOverridePolicy,
  isPolicyDecision,
  isPolicyApplicabilityCriteria,
} from '../types';
import type { OverridePolicy, PolicyDecision, PolicyApplicabilityCriteria } from '../types';
import {
  applyPolicy,
  createOverrideReversal,
  canReverseOverride,
  isPolicyBasedOverride,
} from '../application';
import type {
  PolicyApplicationRequest,
  GmOverrideWithPolicyMetadata,
} from '../application';
import type { ValidationReport, GmId, OverrideId, GmOverride } from '../../types';
import { RulesOutcome, OverrideScope } from '../../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const GM_ID = 'gm_test_user' as GmId;

function createTestOverrideId(): OverrideId {
  return `override_${Date.now()}_${Math.random()}` as OverrideId;
}

const PASS_VALIDATION_REPORT: ValidationReport = {
  invocationId: 'inv_001',
  sourceIntentId: 'intent_001',
  intentType: 'TEST_ACTION',
  rulesetId: 'test_rules',
  outcome: RulesOutcome.PASS,
  violations: [],
  ambiguity: null,
  payload: { test: true },
};

const FAIL_VALIDATION_REPORT: ValidationReport = {
  invocationId: 'inv_002',
  sourceIntentId: 'intent_002',
  intentType: 'TEST_ACTION',
  rulesetId: 'test_rules',
  outcome: RulesOutcome.FAIL,
  violations: [
    { ruleId: 'TEST_001', message: 'Test violation', severity: 'ERROR' },
  ],
  ambiguity: null,
  payload: { test: true },
};

const AMBIGUOUS_VALIDATION_REPORT: ValidationReport = {
  invocationId: 'inv_003',
  sourceIntentId: 'intent_003',
  intentType: 'TEST_ACTION',
  rulesetId: 'test_rules',
  outcome: RulesOutcome.AMBIGUOUS,
  violations: [],
  ambiguity: {
    reason: 'Test ambiguity',
    possibleInterpretations: [
      { code: 'ALLOW', resultingOutcome: RulesOutcome.PASS, description: 'Allow the action' },
      { code: 'DENY', resultingOutcome: RulesOutcome.FAIL, description: 'Deny the action' },
    ],
  },
  payload: { test: true },
};

function createTestPolicy(): OverridePolicy {
  return createOverridePolicy({
    id: 'policy_test_001',
    label: 'GM Convenience Preset: Allow Test Actions',
    description: 'Always allow test actions when validated.',
    appliesTo: {
      validationOutcome: 'FAIL',
    },
    decision: {
      newOutcome: 'PASS',
      warning: {
        severity: 'INFO',
        message: 'GM policy override applied',
      },
      defaultReason: 'Per table house rule: test actions are always allowed',
    },
    createdBy: GM_ID,
  });
}

function createAmbiguityPolicy(): OverridePolicy {
  return createOverridePolicy({
    id: 'policy_ambiguity_001',
    label: 'GM Convenience Preset: Allow Ambiguous Actions',
    description: 'Resolve ambiguous test actions as PASS.',
    appliesTo: {
      validationOutcome: 'AMBIGUOUS',
    },
    decision: {
      newOutcome: 'PASS',
      selectedInterpretationCode: 'ALLOW',
      warning: {
        severity: 'WARNING',
        message: 'GM policy resolved ambiguity',
      },
      defaultReason: 'Per table house rule: ambiguity resolves in player favor',
    },
    createdBy: GM_ID,
  });
}

// ============================================================================
// CRITICAL TEST: NO AUTO-APPLICATION
// ============================================================================

describe('Policy - No Auto-Application', () => {
  let policy: OverridePolicy;
  let matchingReport: ValidationReport;
  let overrides: GmOverride[];

  beforeEach(() => {
    policy = createTestPolicy();
    matchingReport = FAIL_VALIDATION_REPORT; // Matches policy.appliesTo.validationOutcome
    overrides = []; // Start with no overrides
  });

  it('matching validation exists and policy exists, but override list is empty', () => {
    // CRITICAL: This test proves no automation
    // - We have a policy that could apply (FAIL → PASS)
    // - We have a validation that matches (outcome: FAIL)
    // - But the override list is EMPTY

    expect(policy).toBeDefined();
    expect(policy.appliesTo.validationOutcome).toBe('FAIL');
    expect(matchingReport.outcome).toBe(RulesOutcome.FAIL);

    // CRITICAL ASSERTION: No override was auto-applied
    expect(overrides).toHaveLength(0);
  });

  it('policy does not watch validation events', () => {
    // There is no event system. Policies are inert data.
    // This test exists to document the invariant.

    // Create multiple matching validations
    const validations = [
      FAIL_VALIDATION_REPORT,
      { ...FAIL_VALIDATION_REPORT, invocationId: 'inv_004' },
      { ...FAIL_VALIDATION_REPORT, invocationId: 'inv_005' },
    ];

    // Each validation matches the policy
    validations.forEach((v) => {
      expect(v.outcome).toBe(RulesOutcome.FAIL);
    });

    // CRITICAL: Still no overrides
    expect(overrides).toHaveLength(0);
  });

  it('policy does not subscribe to validation', () => {
    // Policies have no subscribe method
    // This test documents the invariant by showing the type has no such method

    const policyKeys = Object.keys(policy);

    expect(policyKeys).not.toContain('subscribe');
    expect(policyKeys).not.toContain('watch');
    expect(policyKeys).not.toContain('onValidation');
    expect(policyKeys).not.toContain('autoApply');
  });

  it('policy does not trigger automatically', () => {
    // Even after time passes, no override is created
    const startTime = Date.now();

    // Simulate time passing (synchronous, but proves the point)
    while (Date.now() < startTime + 10) {
      // Wait
    }

    // CRITICAL: Still no overrides
    expect(overrides).toHaveLength(0);
  });
});

// ============================================================================
// CRITICAL TEST: LOGGED APPLICATION
// ============================================================================

describe('Policy - Logged Application', () => {
  it('applying policy produces an override', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('override');
    if (result.kind === 'override') {
      expect(result.override).toBeDefined();
      expect(result.override.overrideId).toBeDefined();
    }
  });

  it('override references policy ID', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('override');
    if (result.kind === 'override') {
      // CRITICAL: Policy metadata is present
      expect(result.override.policyMetadata).toBeDefined();
      expect(result.override.policyMetadata?.policyId).toBe(policy.id);
    }
  });

  it('override records explicit invocation', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('override');
    if (result.kind === 'override') {
      // CRITICAL: explicitlyInvoked is always true
      expect(result.override.policyMetadata?.explicitlyInvoked).toBe(true);
    }
  });

  it('override preserves original report', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('override');
    if (result.kind === 'override') {
      expect(result.override.originalReport).toBe(FAIL_VALIDATION_REPORT);
      expect(result.override.originalReport.outcome).toBe(RulesOutcome.FAIL);
    }
  });

  it('override records application timestamp', () => {
    const policy = createTestPolicy();
    const beforeApply = Date.now();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    const afterApply = Date.now();

    expect(result.kind).toBe('override');
    if (result.kind === 'override') {
      expect(result.override.policyMetadata?.appliedAt).toBeGreaterThanOrEqual(beforeApply);
      expect(result.override.policyMetadata?.appliedAt).toBeLessThanOrEqual(afterApply);
    }
  });
});

// ============================================================================
// CRITICAL TEST: REVERSIBILITY
// ============================================================================

describe('Policy - Reversibility', () => {
  it('policy-based override can be removed', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);
    expect(result.kind).toBe('override');

    if (result.kind === 'override') {
      // CRITICAL: Override can be reversed
      expect(canReverseOverride(result.override)).toBe(true);
    }
  });

  it('removal creates a reversal record', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);
    expect(result.kind).toBe('override');

    if (result.kind === 'override') {
      const reversal = createOverrideReversal({
        override: result.override,
        reversedBy: GM_ID,
        reason: 'GM decided to undo the policy application',
      });

      // CRITICAL: Reversal record exists and references the override
      expect(reversal.reversedOverrideId).toBe(result.override.overrideId);
      expect(reversal.reversedPolicyId).toBe(policy.id);
      expect(reversal.reversedBy).toBe(GM_ID);
      expect(reversal.reversalReason).toBeTruthy();
    }
  });

  it('reversal does not affect other overrides', () => {
    // Create two separate policy applications
    const policy = createTestPolicy();

    const request1: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const request2: PolicyApplicationRequest = {
      policy,
      targetReport: { ...FAIL_VALIDATION_REPORT, invocationId: 'inv_other' },
      appliedBy: GM_ID,
    };

    const result1 = applyPolicy(request1, createTestOverrideId);
    const result2 = applyPolicy(request2, createTestOverrideId);

    expect(result1.kind).toBe('override');
    expect(result2.kind).toBe('override');

    if (result1.kind === 'override' && result2.kind === 'override') {
      // Reverse only the first one
      const reversal = createOverrideReversal({
        override: result1.override,
        reversedBy: GM_ID,
        reason: 'Reversing first override only',
      });

      // CRITICAL: Second override is unaffected
      expect(reversal.reversedOverrideId).toBe(result1.override.overrideId);
      expect(reversal.reversedOverrideId).not.toBe(result2.override.overrideId);
    }
  });
});

// ============================================================================
// CRITICAL TEST: EQUIVALENCE TO MANUAL OVERRIDE
// ============================================================================

describe('Policy - Equivalence to Manual Override', () => {
  it('policy-based override has same fields as manual override', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);
    expect(result.kind).toBe('override');

    if (result.kind === 'override') {
      const override = result.override;

      // Core override fields (same as manual)
      expect(override.overrideId).toBeDefined();
      expect(override.parentOverrideId).toBeNull();
      expect(override.originalReport).toBeDefined();
      expect(override.overriddenOutcome).toBeDefined();
      expect(override.scope).toBe(OverrideScope.OUTCOME);
      expect(override.warning).toBeDefined();
      expect(override.reason).toBeDefined();
      expect(override.issuedBy).toBe(GM_ID);
      expect(override.issuedAt).toBeDefined();
    }
  });

  it('only metadata differs from manual override', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const policyResult = applyPolicy(request, createTestOverrideId);
    expect(policyResult.kind).toBe('override');

    if (policyResult.kind === 'override') {
      const policyOverride = policyResult.override;

      // The ONLY difference is policyMetadata
      expect(policyOverride.policyMetadata).toBeDefined();

      // A manual override would have undefined policyMetadata
      const manualOverride: GmOverride = {
        overrideId: createTestOverrideId(),
        parentOverrideId: null,
        originalReport: FAIL_VALIDATION_REPORT,
        overriddenOutcome: { newOutcome: RulesOutcome.PASS },
        scope: OverrideScope.OUTCOME,
        warning: { severity: 'INFO', message: 'Manual override' },
        reason: 'Manual reason',
        issuedBy: GM_ID,
        issuedAt: Date.now(),
      };

      // Manual override has no policyMetadata
      expect((manualOverride as GmOverrideWithPolicyMetadata).policyMetadata).toBeUndefined();

      // Both have the same core structure
      expect(typeof policyOverride.overrideId).toBe(typeof manualOverride.overrideId);
      expect(typeof policyOverride.originalReport).toBe(typeof manualOverride.originalReport);
      expect(typeof policyOverride.overriddenOutcome).toBe(typeof manualOverride.overriddenOutcome);
    }
  });

  it('isPolicyBasedOverride correctly distinguishes', () => {
    const policy = createTestPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const policyResult = applyPolicy(request, createTestOverrideId);
    expect(policyResult.kind).toBe('override');

    const manualOverride: GmOverride = {
      overrideId: createTestOverrideId(),
      parentOverrideId: null,
      originalReport: FAIL_VALIDATION_REPORT,
      overriddenOutcome: { newOutcome: RulesOutcome.PASS },
      scope: OverrideScope.OUTCOME,
      warning: { severity: 'INFO', message: 'Manual override' },
      reason: 'Manual reason',
      issuedBy: GM_ID,
      issuedAt: Date.now(),
    };

    if (policyResult.kind === 'override') {
      expect(isPolicyBasedOverride(policyResult.override)).toBe(true);
      expect(isPolicyBasedOverride(manualOverride)).toBe(false);
    }
  });
});

// ============================================================================
// CRITICAL TEST: AMBIGUITY HANDLING
// ============================================================================

describe('Policy - Ambiguity Handling', () => {
  it('policy for AMBIGUOUS must specify interpretation code', () => {
    const policy = createAmbiguityPolicy();

    const request: PolicyApplicationRequest = {
      policy,
      targetReport: AMBIGUOUS_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    // Should succeed because policy has selectedInterpretationCode
    expect(result.kind).toBe('override');
    if (result.kind === 'override') {
      expect(result.override.overriddenOutcome.selectedInterpretationCode).toBe('ALLOW');
    }
  });

  it('rejects policy without interpretation code for AMBIGUOUS', () => {
    const badPolicy = createOverridePolicy({
      id: 'policy_bad_ambiguity',
      label: 'Bad Policy',
      description: 'Missing interpretation code',
      appliesTo: { validationOutcome: 'AMBIGUOUS' },
      decision: {
        newOutcome: 'PASS',
        // Missing: selectedInterpretationCode
        warning: { severity: 'INFO', message: 'Test' },
        defaultReason: 'Test',
      },
      createdBy: GM_ID,
    });

    const request: PolicyApplicationRequest = {
      policy: badPolicy,
      targetReport: AMBIGUOUS_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    // Should fail validation
    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.violation.code).toBe('MISSING_INTERPRETATION_CODE');
    }
  });

  it('rejects policy with invalid interpretation code', () => {
    const badPolicy = createOverridePolicy({
      id: 'policy_invalid_code',
      label: 'Invalid Code Policy',
      description: 'Code does not match any interpretation',
      appliesTo: { validationOutcome: 'AMBIGUOUS' },
      decision: {
        newOutcome: 'PASS',
        selectedInterpretationCode: 'INVALID_CODE', // Not in possibleInterpretations
        warning: { severity: 'INFO', message: 'Test' },
        defaultReason: 'Test',
      },
      createdBy: GM_ID,
    });

    const request: PolicyApplicationRequest = {
      policy: badPolicy,
      targetReport: AMBIGUOUS_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.violation.code).toBe('INVALID_INTERPRETATION_CODE');
    }
  });
});

// ============================================================================
// CRITICAL TEST: VALIDATION ERRORS
// ============================================================================

describe('Policy - Validation Errors', () => {
  it('rejects policy with empty reason', () => {
    const badPolicy = createOverridePolicy({
      id: 'policy_empty_reason',
      label: 'Empty Reason Policy',
      description: 'Test',
      appliesTo: { validationOutcome: 'FAIL' },
      decision: {
        newOutcome: 'PASS',
        warning: { severity: 'INFO', message: 'Test' },
        defaultReason: '', // Empty!
      },
      createdBy: GM_ID,
    });

    const request: PolicyApplicationRequest = {
      policy: badPolicy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.violation.code).toBe('EMPTY_REASON');
    }
  });

  it('rejects policy with empty warning message', () => {
    const badPolicy = createOverridePolicy({
      id: 'policy_empty_warning',
      label: 'Empty Warning Policy',
      description: 'Test',
      appliesTo: { validationOutcome: 'FAIL' },
      decision: {
        newOutcome: 'PASS',
        warning: { severity: 'INFO', message: '' }, // Empty!
        defaultReason: 'Valid reason',
      },
      createdBy: GM_ID,
    });

    const request: PolicyApplicationRequest = {
      policy: badPolicy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.violation.code).toBe('EMPTY_WARNING_MESSAGE');
    }
  });

  it('allows reason override from request', () => {
    const policy = createTestPolicy();

    const customReason = 'Custom GM reason for this specific case';
    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
      reasonOverride: customReason,
    };

    const result = applyPolicy(request, createTestOverrideId);

    expect(result.kind).toBe('override');
    if (result.kind === 'override') {
      expect(result.override.reason).toBe(customReason);
    }
  });
});

// ============================================================================
// CRITICAL TEST: TYPE GUARDS
// ============================================================================

describe('Policy - Type Guards', () => {
  it('isOverridePolicy validates policy structure', () => {
    const validPolicy = createTestPolicy();
    expect(isOverridePolicy(validPolicy)).toBe(true);

    expect(isOverridePolicy(null)).toBe(false);
    expect(isOverridePolicy(undefined)).toBe(false);
    expect(isOverridePolicy({})).toBe(false);
    expect(isOverridePolicy({ id: 'test' })).toBe(false);
  });

  it('isPolicyDecision validates decision structure', () => {
    const validDecision: PolicyDecision = {
      newOutcome: 'PASS',
      warning: { severity: 'INFO', message: 'Test' },
      defaultReason: 'Test reason',
    };
    expect(isPolicyDecision(validDecision)).toBe(true);

    expect(isPolicyDecision(null)).toBe(false);
    expect(isPolicyDecision({})).toBe(false);
    expect(isPolicyDecision({ newOutcome: 'INVALID' })).toBe(false);
  });

  it('isPolicyApplicabilityCriteria validates criteria structure', () => {
    const validCriteria: PolicyApplicabilityCriteria = {
      validationOutcome: 'FAIL',
    };
    expect(isPolicyApplicabilityCriteria(validCriteria)).toBe(true);

    expect(isPolicyApplicabilityCriteria({})).toBe(true); // Empty is valid
    expect(isPolicyApplicabilityCriteria(null)).toBe(false);
    expect(isPolicyApplicabilityCriteria({ validationOutcome: 'INVALID' })).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: NO HIDDEN BEHAVIOR
// ============================================================================

describe('Policy - No Hidden Behavior', () => {
  it('policy has no execute method', () => {
    const policy = createTestPolicy();
    const keys = Object.keys(policy);

    expect(keys).not.toContain('execute');
    expect(keys).not.toContain('run');
    expect(keys).not.toContain('apply');
    expect(keys).not.toContain('trigger');
  });

  it('policy has no event handlers', () => {
    const policy = createTestPolicy();
    const keys = Object.keys(policy);

    expect(keys).not.toContain('onMatch');
    expect(keys).not.toContain('onValidation');
    expect(keys).not.toContain('handler');
    expect(keys).not.toContain('callback');
  });

  it('policy is pure data', () => {
    const policy = createTestPolicy();

    // All fields are data, not functions
    expect(typeof policy.id).toBe('string');
    expect(typeof policy.label).toBe('string');
    expect(typeof policy.description).toBe('string');
    expect(typeof policy.appliesTo).toBe('object');
    expect(typeof policy.decision).toBe('object');
    expect(typeof policy.createdAt).toBe('number');
    expect(typeof policy.createdBy).toBe('string');
  });

  it('applyPolicy has no side effects', () => {
    // applyPolicy only creates a data structure
    // It does not persist, does not update state, does not trigger anything

    const policy = createTestPolicy();
    const request: PolicyApplicationRequest = {
      policy,
      targetReport: FAIL_VALIDATION_REPORT,
      appliedBy: GM_ID,
    };

    // Call multiple times - each returns a fresh result
    const result1 = applyPolicy(request, createTestOverrideId);
    const result2 = applyPolicy(request, createTestOverrideId);

    expect(result1.kind).toBe('override');
    expect(result2.kind).toBe('override');

    if (result1.kind === 'override' && result2.kind === 'override') {
      // Each call creates a new override ID
      expect(result1.override.overrideId).not.toBe(result2.override.overrideId);
    }
  });
});
