/**
 * GM Override Tests (PR 2.0)
 *
 * These tests prove the authority boundaries of the GM override model:
 * - Original ValidationReport is ALWAYS preserved
 * - Overrides cannot be created without a reason
 * - Illegal overrides are rejected
 * - Overrides do not mutate rules results
 * - Consumers can inspect both rule outcome and override decision
 * - Overrides are immutable
 */

import { describe, it, expect } from 'vitest';

import {
  createGmOverride,
  CreateOverrideParams,
  getEffectiveValidation,
  validateOverrideChain,
} from '../GmOverride';
import {
  GmId,
  GmOverride,
  OverrideId,
  OverrideViolationCode,
  OverrideWarning,
  RulesOutcome,
  ValidationReport,
} from '../types';

// Test fixtures
function makeValidationReport(overrides?: Partial<ValidationReport>): ValidationReport {
  return {
    invocationId: 'inv_12345678',
    sourceIntentId: 'intent_abc',
    intentType: 'TEST_INTENT',
    rulesetId: 'ruleset_test',
    outcome: RulesOutcome.FAIL,
    violations: [
      { ruleId: 'rule_1', message: 'Test violation', severity: 'ERROR' },
    ],
    ambiguity: null,
    payload: { test: 'data' },
    ...overrides,
  };
}

function makeWarning(overrides?: Partial<OverrideWarning>): OverrideWarning {
  return {
    severity: 'WARNING',
    message: 'GM decision to override',
    ...overrides,
  };
}

function makeOverrideParams(overrides?: Partial<CreateOverrideParams>): CreateOverrideParams {
  return {
    originalReport: makeValidationReport(),
    newOutcome: RulesOutcome.PASS,
    warning: makeWarning(),
    reason: 'Player made compelling argument',
    issuedBy: 'gm_1' as GmId,
    issuedAt: 1000,
    ...overrides,
  };
}

describe('GM Override Model (PR 2.0)', () => {
  describe('createGmOverride', () => {
    describe('Successful Override Creation', () => {
      it('creates override with all required fields', () => {
        const params = makeOverrideParams();
        const result = createGmOverride(params);

        expect(result.kind).toBe('override');
        if (result.kind === 'override') {
          expect(result.override.overrideId).toMatch(/^ovr_[0-9a-f]{8}$/);
          expect(result.override.originalReport).toBe(params.originalReport);
          expect(result.override.overriddenOutcome.newOutcome).toBe(RulesOutcome.PASS);
          expect(result.override.warning).toBe(params.warning);
          expect(result.override.reason).toBe(params.reason);
          expect(result.override.issuedBy).toBe(params.issuedBy);
          expect(result.override.issuedAt).toBe(params.issuedAt);
          expect(result.override.parentOverrideId).toBeNull();
        }
      });

      it('can override FAIL to PASS', () => {
        const params = makeOverrideParams({
          originalReport: makeValidationReport({ outcome: RulesOutcome.FAIL }),
          newOutcome: RulesOutcome.PASS,
        });
        const result = createGmOverride(params);

        expect(result.kind).toBe('override');
        if (result.kind === 'override') {
          expect(result.override.originalReport.outcome).toBe(RulesOutcome.FAIL);
          expect(result.override.overriddenOutcome.newOutcome).toBe(RulesOutcome.PASS);
        }
      });

      it('can override PASS to FAIL', () => {
        const params = makeOverrideParams({
          originalReport: makeValidationReport({ outcome: RulesOutcome.PASS }),
          newOutcome: RulesOutcome.FAIL,
        });
        const result = createGmOverride(params);

        expect(result.kind).toBe('override');
        if (result.kind === 'override') {
          expect(result.override.originalReport.outcome).toBe(RulesOutcome.PASS);
          expect(result.override.overriddenOutcome.newOutcome).toBe(RulesOutcome.FAIL);
        }
      });

      it('can override AMBIGUOUS to PASS by selecting interpretation', () => {
        const params = makeOverrideParams({
          originalReport: makeValidationReport({
            outcome: RulesOutcome.AMBIGUOUS,
            ambiguity: {
              reason: 'Rules unclear',
              possibleInterpretations: [
                { code: 'OPTION_A', resultingOutcome: RulesOutcome.PASS, description: 'Option A allows it' },
                { code: 'OPTION_B', resultingOutcome: RulesOutcome.FAIL, description: 'Option B forbids it' },
              ],
            },
          }),
          newOutcome: RulesOutcome.PASS,
          selectedInterpretationCode: 'OPTION_A',
        });
        const result = createGmOverride(params);

        expect(result.kind).toBe('override');
        if (result.kind === 'override') {
          expect(result.override.originalReport.outcome).toBe(RulesOutcome.AMBIGUOUS);
          expect(result.override.overriddenOutcome.newOutcome).toBe(RulesOutcome.PASS);
          expect(result.override.overriddenOutcome.selectedInterpretationCode).toBe('OPTION_A');
        }
      });

      it('generates deterministic override ID', () => {
        const params = makeOverrideParams();
        const result1 = createGmOverride(params);
        const result2 = createGmOverride(params);

        expect(result1.kind).toBe('override');
        expect(result2.kind).toBe('override');
        if (result1.kind === 'override' && result2.kind === 'override') {
          expect(result1.override.overrideId).toBe(result2.override.overrideId);
        }
      });
    });

    describe('Mandatory Reason Enforcement', () => {
      it('rejects override with empty reason', () => {
        const params = makeOverrideParams({ reason: '' });
        const result = createGmOverride(params);

        expect(result.kind).toBe('violation');
        if (result.kind === 'violation') {
          expect(result.violation.code).toBe(OverrideViolationCode.EMPTY_REASON);
        }
      });

      it('rejects override with whitespace-only reason', () => {
        const params = makeOverrideParams({ reason: '   ' });
        const result = createGmOverride(params);

        expect(result.kind).toBe('violation');
        if (result.kind === 'violation') {
          expect(result.violation.code).toBe(OverrideViolationCode.EMPTY_REASON);
        }
      });
    });

    describe('Mandatory Warning Enforcement', () => {
      it('rejects override with empty warning message', () => {
        const params = makeOverrideParams({
          warning: makeWarning({ message: '' }),
        });
        const result = createGmOverride(params);

        expect(result.kind).toBe('violation');
        if (result.kind === 'violation') {
          expect(result.violation.code).toBe(OverrideViolationCode.EMPTY_WARNING_MESSAGE);
        }
      });

      it('rejects override with whitespace-only warning message', () => {
        const params = makeOverrideParams({
          warning: makeWarning({ message: '   ' }),
        });
        const result = createGmOverride(params);

        expect(result.kind).toBe('violation');
        if (result.kind === 'violation') {
          expect(result.violation.code).toBe(OverrideViolationCode.EMPTY_WARNING_MESSAGE);
        }
      });
    });

    describe('Override Chain Validation', () => {
      it('allows override with valid parent', () => {
        const report = makeValidationReport();

        // Create first override
        const firstResult = createGmOverride(makeOverrideParams({
          originalReport: report,
          issuedAt: 1000,
        }));
        expect(firstResult.kind).toBe('override');
        if (firstResult.kind !== 'override') return;

        // Create second override with parent
        const secondResult = createGmOverride(makeOverrideParams({
          originalReport: report,
          newOutcome: RulesOutcome.FAIL,
          reason: 'Changed my mind',
          issuedAt: 2000,
          parentOverride: firstResult.override,
        }));

        expect(secondResult.kind).toBe('override');
        if (secondResult.kind === 'override') {
          expect(secondResult.override.parentOverrideId).toBe(firstResult.override.overrideId);
        }
      });

      it('rejects override with parent targeting different invocation', () => {
        const report1 = makeValidationReport({ invocationId: 'inv_aaaaaaaa' });
        const report2 = makeValidationReport({ invocationId: 'inv_bbbbbbbb' });

        const firstResult = createGmOverride(makeOverrideParams({
          originalReport: report1,
        }));
        expect(firstResult.kind).toBe('override');
        if (firstResult.kind !== 'override') return;

        const secondResult = createGmOverride(makeOverrideParams({
          originalReport: report2,
          parentOverride: firstResult.override,
        }));

        expect(secondResult.kind).toBe('violation');
        if (secondResult.kind === 'violation') {
          expect(secondResult.violation.code).toBe(OverrideViolationCode.INVALID_CHAIN);
        }
      });
    });
  });

  describe('Original Report Preservation', () => {
    it('originalReport is always accessible', () => {
      const originalReport = makeValidationReport({
        outcome: RulesOutcome.FAIL,
        violations: [
          { ruleId: 'rule_1', message: 'Violation 1', severity: 'ERROR' },
          { ruleId: 'rule_2', message: 'Violation 2', severity: 'WARNING' },
        ],
      });

      const result = createGmOverride(makeOverrideParams({
        originalReport,
        newOutcome: RulesOutcome.PASS,
      }));

      expect(result.kind).toBe('override');
      if (result.kind === 'override') {
        // Original report is preserved exactly
        expect(result.override.originalReport).toBe(originalReport);
        expect(result.override.originalReport.outcome).toBe(RulesOutcome.FAIL);
        expect(result.override.originalReport.violations).toHaveLength(2);
      }
    });

    it('violations are never mutated or hidden', () => {
      const originalViolations = [
        { ruleId: 'rule_1', message: 'Critical failure', severity: 'ERROR' as const },
      ];
      const originalReport = makeValidationReport({
        violations: originalViolations,
      });

      const result = createGmOverride(makeOverrideParams({
        originalReport,
        newOutcome: RulesOutcome.PASS,
      }));

      expect(result.kind).toBe('override');
      if (result.kind === 'override') {
        // Violations are still there even though outcome is overridden to PASS
        expect(result.override.originalReport.violations).toBe(originalViolations);
        expect(result.override.originalReport.violations[0]?.message).toBe('Critical failure');
      }
    });
  });

  describe('getEffectiveValidation', () => {
    it('returns original outcome when no overrides', () => {
      const report = makeValidationReport({ outcome: RulesOutcome.FAIL });
      const result = getEffectiveValidation(report, []);

      expect(result.effectiveOutcome).toBe(RulesOutcome.FAIL);
      expect(result.hasOverrides).toBe(false);
      expect(result.latestWarning).toBeNull();
      expect(result.overrideCount).toBe(0);
      expect(result.originalReport).toBe(report);
    });

    it('returns overridden outcome with single override', () => {
      const report = makeValidationReport({ outcome: RulesOutcome.FAIL });
      const overrideResult = createGmOverride(makeOverrideParams({
        originalReport: report,
        newOutcome: RulesOutcome.PASS,
      }));
      expect(overrideResult.kind).toBe('override');
      if (overrideResult.kind !== 'override') return;

      const result = getEffectiveValidation(report, [overrideResult.override]);

      expect(result.effectiveOutcome).toBe(RulesOutcome.PASS);
      expect(result.hasOverrides).toBe(true);
      expect(result.latestWarning).toBe(overrideResult.override.warning);
      expect(result.overrideCount).toBe(1);
      // Original report still accessible
      expect(result.originalReport.outcome).toBe(RulesOutcome.FAIL);
    });

    it('returns last override in chain', () => {
      const report = makeValidationReport({ outcome: RulesOutcome.FAIL });

      // First override: FAIL → PASS
      const first = createGmOverride(makeOverrideParams({
        originalReport: report,
        newOutcome: RulesOutcome.PASS,
        issuedAt: 1000,
      }));
      expect(first.kind).toBe('override');
      if (first.kind !== 'override') return;

      // Second override: PASS → AMBIGUOUS
      const second = createGmOverride(makeOverrideParams({
        originalReport: report,
        newOutcome: RulesOutcome.AMBIGUOUS,
        reason: 'Actually needs more thought',
        issuedAt: 2000,
        parentOverride: first.override,
      }));
      expect(second.kind).toBe('override');
      if (second.kind !== 'override') return;

      const result = getEffectiveValidation(report, [first.override, second.override]);

      expect(result.effectiveOutcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(result.hasOverrides).toBe(true);
      expect(result.overrideCount).toBe(2);
      // Original FAIL outcome still accessible
      expect(result.originalReport.outcome).toBe(RulesOutcome.FAIL);
    });

    it('preserves original violations in effective result', () => {
      const violations = [
        { ruleId: 'rule_1', message: 'Failed check', severity: 'ERROR' as const },
      ];
      const report = makeValidationReport({
        outcome: RulesOutcome.FAIL,
        violations,
      });

      const overrideResult = createGmOverride(makeOverrideParams({
        originalReport: report,
        newOutcome: RulesOutcome.PASS,
      }));
      expect(overrideResult.kind).toBe('override');
      if (overrideResult.kind !== 'override') return;

      const result = getEffectiveValidation(report, [overrideResult.override]);

      // Effective outcome is PASS
      expect(result.effectiveOutcome).toBe(RulesOutcome.PASS);
      // But violations are still visible
      expect(result.originalReport.violations).toBe(violations);
      expect(result.originalReport.violations[0]?.message).toBe('Failed check');
    });
  });

  describe('validateOverrideChain', () => {
    it('valid: empty chain', () => {
      const result = validateOverrideChain([]);
      expect(result.valid).toBe(true);
    });

    it('valid: single override', () => {
      const report = makeValidationReport();
      const overrideResult = createGmOverride(makeOverrideParams({ originalReport: report }));
      expect(overrideResult.kind).toBe('override');
      if (overrideResult.kind !== 'override') return;

      const result = validateOverrideChain([overrideResult.override]);
      expect(result.valid).toBe(true);
    });

    it('valid: properly linked chain', () => {
      const report = makeValidationReport();

      const first = createGmOverride(makeOverrideParams({
        originalReport: report,
        issuedAt: 1000,
      }));
      expect(first.kind).toBe('override');
      if (first.kind !== 'override') return;

      const second = createGmOverride(makeOverrideParams({
        originalReport: report,
        issuedAt: 2000,
        parentOverride: first.override,
      }));
      expect(second.kind).toBe('override');
      if (second.kind !== 'override') return;

      const result = validateOverrideChain([first.override, second.override]);
      expect(result.valid).toBe(true);
    });

    it('invalid: multiple roots', () => {
      const report = makeValidationReport();

      const first = createGmOverride(makeOverrideParams({
        originalReport: report,
        issuedAt: 1000,
      }));
      const second = createGmOverride(makeOverrideParams({
        originalReport: report,
        issuedAt: 2000,
        // No parent - this is also a root
      }));

      expect(first.kind).toBe('override');
      expect(second.kind).toBe('override');
      if (first.kind !== 'override' || second.kind !== 'override') return;

      const result = validateOverrideChain([first.override, second.override]);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('roots');
      }
    });

    it('invalid: different invocations', () => {
      const report1 = makeValidationReport({ invocationId: 'inv_aaaaaaaa' });
      const report2 = makeValidationReport({ invocationId: 'inv_bbbbbbbb' });

      const first = createGmOverride(makeOverrideParams({
        originalReport: report1,
      }));
      const second = createGmOverride(makeOverrideParams({
        originalReport: report2,
      }));

      expect(first.kind).toBe('override');
      expect(second.kind).toBe('override');
      if (first.kind !== 'override' || second.kind !== 'override') return;

      const result = validateOverrideChain([first.override, second.override]);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('different invocation');
      }
    });
  });

  describe('Immutability', () => {
    it('GmOverride fields are readonly', () => {
      const result = createGmOverride(makeOverrideParams());
      expect(result.kind).toBe('override');
      if (result.kind !== 'override') return;

      // TypeScript prevents mutation at compile time.
      // This test documents that the type uses readonly.
      const override: GmOverride = result.override;

      // All these would be compile errors:
      // override.reason = 'new reason';
      // override.overriddenOutcome = { newOutcome: RulesOutcome.FAIL };
      // override.originalReport = makeValidationReport();

      // We can only read
      expect(override.reason).toBeDefined();
      expect(override.overriddenOutcome).toBeDefined();
      expect(override.originalReport).toBeDefined();
    });
  });

  describe('Type Distinctions', () => {
    it('OverrideViolation is distinct from RuleViolation', () => {
      const params = makeOverrideParams({ reason: '' });
      const result = createGmOverride(params);

      expect(result.kind).toBe('violation');
      if (result.kind === 'violation') {
        // OverrideViolation has: code, details
        expect(result.violation).toHaveProperty('code');
        expect(result.violation).toHaveProperty('details');

        // NOT a RuleViolation (which has: ruleId, message, severity)
        expect(result.violation).not.toHaveProperty('ruleId');
        expect(result.violation).not.toHaveProperty('severity');
      }
    });
  });
});
