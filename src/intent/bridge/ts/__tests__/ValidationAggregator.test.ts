/**
 * Validation Aggregator Tests (PR 4.2)
 *
 * These tests prove the core invariants of validation aggregation:
 * - ALL validators run - no short-circuit
 * - ALL results are preserved - no suppression
 * - NO resolution of disagreements - validators can disagree
 * - NO "most severe wins" - all outcomes coexist
 * - NO boolean summary - outcomes are enumerated, not collapsed
 *
 * The engine must TOLERATE disagreement without resolving it.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Intent layer imports
import { createValidatedIntent } from '../ValidatedIntent';
import type { ValidatedIntent, IntentType } from '../ValidatedIntent';
import type {
  AggregatedValidationReport,
  Conflict,
  InvocationId,
  PipelineRegistry,
  RulesetId,
  RulesPipeline,
  ValidationReport,
} from '../RulesPipeline';
import { RulesOutcome, ConflictKind, createValidatorId } from '../RulesPipeline';

// Aggregation imports
import {
  ValidationAggregator,
  createValidationAggregator,
  AggregationFailureCode,
} from '../ValidationAggregator';

// Deadlands imports for regression testing
import { createDeadlandsPipelineRegistry } from '../../../../rules/deadlands/ts/DeadlandsPipelineRegistry';
import { RELOAD_FIREARM_INTENT_TYPE } from '../../../../rules/deadlands/ts/ReloadFirearm';
import type { ReloadFirearmPayload } from '../../../../rules/deadlands/ts/ReloadFirearm';

// Resolution imports
import { CostValidationOutcome } from '../../../../resolution/ts/types';

// ============================================================================
// TEST FIXTURES - MOCK VALIDATORS
// ============================================================================

/**
 * Create a mock pipeline that always returns the specified outcome
 */
function createMockPipeline(
  rulesetId: string,
  intentTypes: string[],
  outcome: RulesOutcome,
  costOutcome?: CostValidationOutcome,
  conflicts?: Conflict[]
): RulesPipeline {
  return {
    rulesetId: rulesetId as RulesetId,
    handledIntentTypes: intentTypes as IntentType[],
    validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
      return {
        invocationId,
        sourceIntentId: intent.intentId,
        intentType: intent.intentType,
        rulesetId: rulesetId as RulesetId,
        outcome,
        violations: outcome === RulesOutcome.FAIL
          ? [{ ruleId: `${rulesetId}_001`, message: `Failed by ${rulesetId}`, severity: 'ERROR' as const }]
          : [],
        ambiguity: outcome === RulesOutcome.AMBIGUOUS
          ? { reason: `Ambiguity from ${rulesetId}`, possibleInterpretations: [] }
          : null,
        payload: intent.payload,
        costValidation: costOutcome !== undefined
          ? {
              cost: { kind: 'ActionCostEffect', description: `Cost from ${rulesetId}` },
              outcome: costOutcome,
              reason: `Cost reason from ${rulesetId}`,
            }
          : undefined,
        // PR 4.3: Conflicts are data, not logic
        conflicts: conflicts ?? [],
      };
    },
  };
}

/**
 * Create a mock registry with multiple pipelines
 */
function createMockRegistry(pipelines: RulesPipeline[]): PipelineRegistry {
  const claims = pipelines.flatMap(p =>
    p.handledIntentTypes.map(it => ({ rulesetId: p.rulesetId, intentType: it }))
  );

  const pipelineMap = new Map<RulesetId, RulesPipeline>();
  for (const p of pipelines) {
    pipelineMap.set(p.rulesetId, p);
  }

  const intentToPipelines = new Map<IntentType, RulesPipeline[]>();
  for (const claim of claims) {
    const existing = intentToPipelines.get(claim.intentType) ?? [];
    const pipeline = pipelineMap.get(claim.rulesetId);
    if (pipeline) {
      existing.push(pipeline);
      intentToPipelines.set(claim.intentType, existing);
    }
  }

  return {
    getAuthorityClaims: () => claims,
    getPipeline: (id) => pipelineMap.get(id) ?? null,
    getPipelinesForIntent: (it) => intentToPipelines.get(it) ?? [],
  };
}

/**
 * Create a test intent
 */
function createTestIntent(intentType: string = 'TEST_INTENT'): ValidatedIntent {
  const result = createValidatedIntent({
    kind: 'valid',
    intent: {
      intentId: `intent_test_001`,
      intentType,
      payload: { testData: 'value' },
    },
    summary: {
      validatedAt: Date.now(),
      validatorVersion: '1.0.0',
      structuralChecks: ['intentId_present', 'intentType_present', 'payload_present'],
    },
  });

  if (result === null) {
    throw new Error('Failed to create validated intent');
  }

  return result;
}

/**
 * Create a reload firearm intent for regression testing
 */
function createReloadIntent(payload: ReloadFirearmPayload): ValidatedIntent {
  const result = createValidatedIntent({
    kind: 'valid',
    intent: {
      intentId: `intent_reload_${payload.characterId}_${payload.weaponId}`,
      intentType: RELOAD_FIREARM_INTENT_TYPE as string,
      payload,
    },
    summary: {
      validatedAt: Date.now(),
      validatorVersion: '1.0.0',
      structuralChecks: ['intentId_present', 'intentType_present', 'payload_present'],
    },
  });

  if (result === null) {
    throw new Error('Failed to create validated intent');
  }

  return result;
}

// ============================================================================
// SINGLE VALIDATOR TESTS (Regression from PR 4.0/4.1)
// ============================================================================

describe('Single Validator Aggregation (Regression)', () => {
  it('aggregates a single validator PASS result', () => {
    const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS);
    const registry = createMockRegistry([pipeline]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults).toHaveLength(1);
      expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.PASS);
      expect(result.report.validatorCount).toBe(1);
    }
  });

  it('aggregates a single validator FAIL result', () => {
    const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.FAIL);
    const registry = createMockRegistry([pipeline]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults).toHaveLength(1);
      expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.FAIL);
      expect(result.report.ruleResults[0]?.violations).toHaveLength(1);
    }
  });

  it('aggregates a single validator AMBIGUOUS result', () => {
    const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.AMBIGUOUS);
    const registry = createMockRegistry([pipeline]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults).toHaveLength(1);
      expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(result.report.ruleResults[0]?.ambiguity).not.toBeNull();
    }
  });
});

// ============================================================================
// MULTI-VALIDATOR AGGREGATION TESTS (PR 4.2 Core)
// ============================================================================

describe('Multi-Validator Aggregation', () => {
  /**
   * CRITICAL INVARIANT: ALL validators run - no short-circuit
   *
   * Even if one validator returns FAIL, all other validators must still run.
   */
  describe('No Short-Circuit', () => {
    it('runs ALL validators even when first returns FAIL', () => {
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.FAIL);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS);
      const pipeline3 = createMockPipeline('ruleset_3', ['TEST_INTENT'], RulesOutcome.PASS);
      const registry = createMockRegistry([pipeline1, pipeline2, pipeline3]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // ALL three validators ran
        expect(result.report.ruleResults).toHaveLength(3);
        expect(result.report.validatorCount).toBe(3);

        // Each validator's result is preserved
        const outcomes = result.report.ruleResults.map(r => r.outcome);
        expect(outcomes).toContain(RulesOutcome.FAIL);
        expect(outcomes.filter(o => o === RulesOutcome.PASS)).toHaveLength(2);
      }
    });

    it('runs ALL validators even when first returns AMBIGUOUS', () => {
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.AMBIGUOUS);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS);
      const registry = createMockRegistry([pipeline1, pipeline2]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        expect(result.report.ruleResults).toHaveLength(2);
        expect(result.report.validatorCount).toBe(2);
      }
    });
  });

  /**
   * CRITICAL INVARIANT: ALL results are preserved - no suppression
   *
   * If validator A says PASS and validator B says FAIL, BOTH results are kept.
   */
  describe('No Suppression', () => {
    it('preserves BOTH PASS and FAIL results', () => {
      const pipeline1 = createMockPipeline('ruleset_pass', ['TEST_INTENT'], RulesOutcome.PASS);
      const pipeline2 = createMockPipeline('ruleset_fail', ['TEST_INTENT'], RulesOutcome.FAIL);
      const registry = createMockRegistry([pipeline1, pipeline2]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        expect(result.report.ruleResults).toHaveLength(2);

        const passResult = result.report.ruleResults.find(r => r.outcome === RulesOutcome.PASS);
        const failResult = result.report.ruleResults.find(r => r.outcome === RulesOutcome.FAIL);

        expect(passResult).toBeDefined();
        expect(failResult).toBeDefined();
        expect(passResult?.rulesetId).toBe('ruleset_pass');
        expect(failResult?.rulesetId).toBe('ruleset_fail');
      }
    });

    it('preserves ALL three outcome types', () => {
      const pipeline1 = createMockPipeline('ruleset_pass', ['TEST_INTENT'], RulesOutcome.PASS);
      const pipeline2 = createMockPipeline('ruleset_fail', ['TEST_INTENT'], RulesOutcome.FAIL);
      const pipeline3 = createMockPipeline('ruleset_ambiguous', ['TEST_INTENT'], RulesOutcome.AMBIGUOUS);
      const registry = createMockRegistry([pipeline1, pipeline2, pipeline3]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        expect(result.report.ruleResults).toHaveLength(3);

        const outcomes = result.report.ruleResults.map(r => r.outcome);
        expect(outcomes).toContain(RulesOutcome.PASS);
        expect(outcomes).toContain(RulesOutcome.FAIL);
        expect(outcomes).toContain(RulesOutcome.AMBIGUOUS);
      }
    });
  });

  /**
   * CRITICAL INVARIANT: NO resolution of disagreements
   *
   * The aggregator does NOT decide which validator is "right".
   * Disagreement is TOLERATED, not resolved.
   */
  describe('No Resolution', () => {
    it('does NOT collapse disagreement to a single outcome', () => {
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.FAIL);
      const registry = createMockRegistry([pipeline1, pipeline2]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // There is NO single "outcome" field on AggregatedValidationReport
        // Only ruleResults array
        expect('outcome' in result.report).toBe(false);

        // Both results are preserved - disagreement exists in the data
        expect(result.report.ruleResults).toHaveLength(2);
        const outcomes = result.report.ruleResults.map(r => r.outcome);
        expect(outcomes).toContain(RulesOutcome.PASS);
        expect(outcomes).toContain(RulesOutcome.FAIL);
      }
    });

    it('does NOT have "most severe wins" logic', () => {
      // Two PASS, one FAIL - if "most severe wins" existed, we'd only see FAIL
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS);
      const pipeline3 = createMockPipeline('ruleset_3', ['TEST_INTENT'], RulesOutcome.FAIL);
      const registry = createMockRegistry([pipeline1, pipeline2, pipeline3]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // All three results are preserved - no "most severe wins"
        expect(result.report.ruleResults).toHaveLength(3);

        const passCount = result.report.ruleResults.filter(r => r.outcome === RulesOutcome.PASS).length;
        const failCount = result.report.ruleResults.filter(r => r.outcome === RulesOutcome.FAIL).length;

        expect(passCount).toBe(2);
        expect(failCount).toBe(1);
      }
    });

    it('does NOT produce a boolean summary', () => {
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.FAIL);
      const registry = createMockRegistry([pipeline1, pipeline2]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // INVARIANT: NO summary booleans exist
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result.report as any).hasFailures).toBeUndefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result.report as any).isValid).toBeUndefined();
        expect('isValid' in result.report).toBe(false);
        expect('passed' in result.report).toBe(false);
        expect('success' in result.report).toBe(false);
        expect('hasFailures' in result.report).toBe(false);
      }
    });
  });
});

// ============================================================================
// COST VALIDATION AGGREGATION TESTS (PR 4.2 + PR 4.1)
// ============================================================================

describe('Cost Validation Aggregation', () => {
  it('aggregates cost results from all validators', () => {
    const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS, CostValidationOutcome.AMBIGUOUS);
    const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS, CostValidationOutcome.UNSATISFIED);
    const registry = createMockRegistry([pipeline1, pipeline2]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.costResults).toHaveLength(2);

      const costOutcomes = result.report.costResults.map(c => c.costValidation.outcome);
      expect(costOutcomes).toContain(CostValidationOutcome.AMBIGUOUS);
      expect(costOutcomes).toContain(CostValidationOutcome.UNSATISFIED);
    }
  });

  it('preserves cost results even when rule outcomes disagree', () => {
    const pipeline1 = createMockPipeline('ruleset_pass', ['TEST_INTENT'], RulesOutcome.PASS, CostValidationOutcome.AMBIGUOUS);
    const pipeline2 = createMockPipeline('ruleset_fail', ['TEST_INTENT'], RulesOutcome.FAIL, CostValidationOutcome.UNSATISFIED);
    const registry = createMockRegistry([pipeline1, pipeline2]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      // Both rule results preserved
      expect(result.report.ruleResults).toHaveLength(2);

      // Both cost results preserved
      expect(result.report.costResults).toHaveLength(2);
    }
  });

  it('handles validators that do not emit cost validation', () => {
    const pipelineWithCost = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS, CostValidationOutcome.AMBIGUOUS);
    const pipelineWithoutCost = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS);
    const registry = createMockRegistry([pipelineWithCost, pipelineWithoutCost]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      // Two rule results
      expect(result.report.ruleResults).toHaveLength(2);

      // Only one cost result (from pipeline that emits cost)
      expect(result.report.costResults).toHaveLength(1);
    }
  });
});

// ============================================================================
// VALIDATOR IDENTITY TESTS
// ============================================================================

describe('Validator Identity', () => {
  it('assigns unique validatorId to each validator result', () => {
    const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS);
    const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS);
    const registry = createMockRegistry([pipeline1, pipeline2]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      const validatorIds = result.report.ruleResults.map(r => r.validatorId);
      expect(validatorIds).toHaveLength(2);
      expect(new Set(validatorIds).size).toBe(2); // All unique
    }
  });

  it('validatorId follows convention: validator_<rulesetId>', () => {
    const pipeline = createMockPipeline('my_ruleset', ['TEST_INTENT'], RulesOutcome.PASS);
    const registry = createMockRegistry([pipeline]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults[0]?.validatorId).toBe('validator_my_ruleset');
    }
  });

  it('cost result has matching validatorId', () => {
    const pipeline = createMockPipeline('my_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, CostValidationOutcome.AMBIGUOUS);
    const registry = createMockRegistry([pipeline]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults[0]?.validatorId).toBe(result.report.costResults[0]?.validatorId);
    }
  });
});

// ============================================================================
// FAILURE CASES
// ============================================================================

describe('Failure Cases', () => {
  it('fails with NO_VALIDATORS when no pipelines handle intent type', () => {
    const pipeline = createMockPipeline('test_ruleset', ['OTHER_INTENT'], RulesOutcome.PASS);
    const registry = createMockRegistry([pipeline]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent('UNKNOWN_INTENT');

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.failure.code).toBe(AggregationFailureCode.NO_VALIDATORS);
      expect(result.failure.intentType).toBe('UNKNOWN_INTENT');
    }
  });

  it('fails with NO_VALIDATORS when registry is empty', () => {
    const registry = createMockRegistry([]);
    const aggregator = createValidationAggregator(registry);
    const intent = createTestIntent();

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('failure');
    if (result.kind === 'failure') {
      expect(result.failure.code).toBe(AggregationFailureCode.NO_VALIDATORS);
    }
  });
});

// ============================================================================
// INTEGRATION WITH DEADLANDS (Regression)
// ============================================================================

describe('Integration with Deadlands Registry', () => {
  it('aggregates Reload Firearm validation (single validator)', () => {
    const registry = createDeadlandsPipelineRegistry();
    const aggregator = createValidationAggregator(registry);
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults).toHaveLength(1);
      expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.PASS);
      expect(result.report.ruleResults[0]?.rulesetId).toBe('deadlands_core');
      expect(result.report.validatorCount).toBe(1);
    }
  });

  it('aggregates Reload Firearm with cost validation', () => {
    const registry = createDeadlandsPipelineRegistry();
    const aggregator = createValidationAggregator(registry);
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
      actionAvailability: 'available',
    });

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      // Rule result
      expect(result.report.ruleResults).toHaveLength(1);
      expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.PASS);

      // Cost result (AMBIGUOUS because 'available' does not prove spendability)
      expect(result.report.costResults).toHaveLength(1);
      expect(result.report.costResults[0]?.costValidation.outcome).toBe(CostValidationOutcome.AMBIGUOUS);
    }
  });

  it('aggregates Reload Firearm FAIL with preserved violations', () => {
    const registry = createDeadlandsPipelineRegistry();
    const aggregator = createValidationAggregator(registry);
    const intent = createReloadIntent({
      characterId: 'fighter_001',
      weaponId: 'bowie_knife',
      weaponType: 'melee',
      hasShotsCapacity: false,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults).toHaveLength(1);
      expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.FAIL);
      expect(result.report.ruleResults[0]?.violations).toHaveLength(1);
      expect(result.report.ruleResults[0]?.violations[0]?.ruleId).toBe('SW_RELOAD_001');
    }
  });

  it('aggregates Reload Firearm AMBIGUOUS with preserved ambiguity', () => {
    const registry = createDeadlandsPipelineRegistry();
    const aggregator = createValidationAggregator(registry);
    const intent = createReloadIntent({
      characterId: 'uncertain_pete',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'unknown',
      currentAmmoState: 'empty',
    });

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      expect(result.report.ruleResults).toHaveLength(1);
      expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.AMBIGUOUS);
      expect(result.report.ruleResults[0]?.ambiguity).not.toBeNull();
      expect(result.report.ruleResults[0]?.ambiguity?.possibleInterpretations).toHaveLength(2);
    }
  });

  it('aggregates Reload Firearm with empty conflicts array (PR 4.3)', () => {
    const registry = createDeadlandsPipelineRegistry();
    const aggregator = createValidationAggregator(registry);
    const intent = createReloadIntent({
      characterId: 'wild_bill',
      weaponId: 'colt_peacemaker',
      weaponType: 'firearm',
      hasShotsCapacity: true,
      ammoAvailability: 'available',
      currentAmmoState: 'empty',
    });

    const result = aggregator.aggregate(intent);

    expect(result.kind).toBe('aggregated');
    if (result.kind === 'aggregated') {
      // Reload Firearm emits no conflicts (empty array)
      expect(result.report.ruleResults[0]?.conflicts).toEqual([]);
      expect(result.report.allConflicts).toEqual([]);
    }
  });
});

// ============================================================================
// CONFLICT CLASSIFICATION TESTS (PR 4.3)
// ============================================================================

describe('Conflict Classification (PR 4.3)', () => {
  /**
   * CRITICAL INVARIANT: Conflicts are DATA, not logic
   *
   * The engine does NOT make decisions based on conflict kind.
   * ALL conflicts are preserved as-is.
   */
  describe('Conflicts Are Data Only', () => {
    it('collects conflicts from single validator', () => {
      const conflicts: Conflict[] = [
        {
          kind: ConflictKind.HardBlock,
          sourceRule: 'test_rule_001',
          message: 'Cannot attack dead target',
        },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        expect(result.report.allConflicts).toHaveLength(1);
        expect(result.report.allConflicts[0]?.conflict.kind).toBe(ConflictKind.HardBlock);
        expect(result.report.allConflicts[0]?.conflict.message).toBe('Cannot attack dead target');
      }
    });

    it('collects conflicts from multiple validators', () => {
      const conflicts1: Conflict[] = [
        { kind: ConflictKind.HardBlock, sourceRule: 'rule_1', message: 'Hard block from validator 1' },
      ];
      const conflicts2: Conflict[] = [
        { kind: ConflictKind.SoftBlock, sourceRule: 'rule_2', message: 'Soft block from validator 2' },
        { kind: ConflictKind.Informational, sourceRule: 'rule_3', message: 'Info from validator 2' },
      ];
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts1);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts2);
      const registry = createMockRegistry([pipeline1, pipeline2]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // ALL conflicts are collected
        expect(result.report.allConflicts).toHaveLength(3);

        const kinds = result.report.allConflicts.map(c => c.conflict.kind);
        expect(kinds).toContain(ConflictKind.HardBlock);
        expect(kinds).toContain(ConflictKind.SoftBlock);
        expect(kinds).toContain(ConflictKind.Informational);
      }
    });

    it('preserves conflict source information (validatorId, rulesetId)', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.HardBlock, sourceRule: 'test_rule', message: 'Test conflict' },
      ];
      const pipeline = createMockPipeline('my_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        expect(result.report.allConflicts[0]?.validatorId).toBe('validator_my_ruleset');
        expect(result.report.allConflicts[0]?.rulesetId).toBe('my_ruleset');
      }
    });

    it('preserves optional tags on conflicts', () => {
      const conflicts: Conflict[] = [
        {
          kind: ConflictKind.Informational,
          sourceRule: 'ammo_check',
          message: 'Last bullet in magazine',
          tags: ['ammo', 'warning', 'low-resource'],
        },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        expect(result.report.allConflicts[0]?.conflict.tags).toEqual(['ammo', 'warning', 'low-resource']);
      }
    });
  });

  /**
   * CRITICAL INVARIANT: Conflicts do NOT affect validation outcome
   *
   * A PASS with HardBlock conflicts is still PASS.
   * A FAIL with no conflicts is still FAIL.
   * Conflicts and outcomes are INDEPENDENT.
   */
  describe('Conflicts Are Independent of Outcome', () => {
    it('PASS outcome can coexist with HardBlock conflicts', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.HardBlock, sourceRule: 'strict_rule', message: 'This is a hard block' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // Outcome is PASS
        expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.PASS);

        // But HardBlock conflict exists
        expect(result.report.allConflicts).toHaveLength(1);
        expect(result.report.allConflicts[0]?.conflict.kind).toBe(ConflictKind.HardBlock);

        // The engine does NOT change outcome based on conflict
        // This is intentional - conflicts are DATA, not logic
      }
    });

    it('FAIL outcome can coexist with Informational conflicts', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.Informational, sourceRule: 'info_rule', message: 'Just an FYI' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.FAIL, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // Outcome is FAIL (due to violations, not conflicts)
        expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.FAIL);

        // Informational conflict also exists
        expect(result.report.allConflicts[0]?.conflict.kind).toBe(ConflictKind.Informational);
      }
    });

    it('validator with conflicts but no outcome change', () => {
      // Validator 1: PASS with HardBlock
      // Validator 2: PASS with no conflicts
      // Result: Both PASS outcomes, one HardBlock conflict
      const conflicts1: Conflict[] = [
        { kind: ConflictKind.HardBlock, sourceRule: 'rule_1', message: 'Hard block' },
      ];
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts1);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.PASS, undefined, []);
      const registry = createMockRegistry([pipeline1, pipeline2]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // Both validators say PASS
        expect(result.report.ruleResults).toHaveLength(2);
        expect(result.report.ruleResults[0]?.outcome).toBe(RulesOutcome.PASS);
        expect(result.report.ruleResults[1]?.outcome).toBe(RulesOutcome.PASS);

        // But one HardBlock conflict exists
        expect(result.report.allConflicts).toHaveLength(1);
        expect(result.report.allConflicts[0]?.conflict.kind).toBe(ConflictKind.HardBlock);

        // The engine does NOT resolve this
        // The caller must interpret the conflict
      }
    });
  });

  /**
   * CRITICAL INVARIANT: NO conflict resolution
   *
   * The engine does NOT:
   * - Prioritize HardBlock over SoftBlock
   * - Suppress Informational conflicts
   * - Count conflicts by kind
   * - Summarize conflicts to a single status
   */
  describe('No Conflict Resolution', () => {
    it('does NOT prioritize conflicts by kind', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.Informational, sourceRule: 'rule_info', message: 'Info' },
        { kind: ConflictKind.HardBlock, sourceRule: 'rule_hard', message: 'Hard' },
        { kind: ConflictKind.SoftBlock, sourceRule: 'rule_soft', message: 'Soft' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // ALL three conflicts are preserved
        expect(result.report.allConflicts).toHaveLength(3);

        // NO priority ordering - order is not guaranteed
        const kinds = result.report.allConflicts.map(c => c.conflict.kind);
        expect(kinds).toContain(ConflictKind.HardBlock);
        expect(kinds).toContain(ConflictKind.SoftBlock);
        expect(kinds).toContain(ConflictKind.Informational);

        // NO summary field
        expect('conflictSummary' in result.report).toBe(false);
        expect('hasHardBlock' in result.report).toBe(false);
        expect('blocked' in result.report).toBe(false);
      }
    });

    it('does NOT suppress any conflict kind', () => {
      // Multiple Informational conflicts should all be preserved
      const conflicts: Conflict[] = [
        { kind: ConflictKind.Informational, sourceRule: 'rule_1', message: 'Info 1' },
        { kind: ConflictKind.Informational, sourceRule: 'rule_2', message: 'Info 2' },
        { kind: ConflictKind.Informational, sourceRule: 'rule_3', message: 'Info 3' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // ALL three Informational conflicts are preserved
        expect(result.report.allConflicts).toHaveLength(3);
        expect(result.report.allConflicts.every(c => c.conflict.kind === ConflictKind.Informational)).toBe(true);
      }
    });

    it('does NOT count or summarize conflicts', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.HardBlock, sourceRule: 'rule_1', message: 'Hard 1' },
        { kind: ConflictKind.HardBlock, sourceRule: 'rule_2', message: 'Hard 2' },
        { kind: ConflictKind.SoftBlock, sourceRule: 'rule_3', message: 'Soft' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // NO conflict counts
        expect('hardBlockCount' in result.report).toBe(false);
        expect('softBlockCount' in result.report).toBe(false);
        expect('conflictCount' in result.report).toBe(false);

        // Just the raw array
        expect(result.report.allConflicts).toHaveLength(3);
      }
    });
  });

  /**
   * CRITICAL INVARIANT: Conflicts coexist with validation results
   *
   * The aggregator collects conflicts alongside rule results and cost results.
   * They are independent data streams.
   */
  describe('Conflicts Coexist With Other Data', () => {
    it('conflicts coexist with rule violations', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.SoftBlock, sourceRule: 'soft_rule', message: 'Soft block warning' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.FAIL, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // Has violations (from FAIL outcome)
        expect(result.report.ruleResults[0]?.violations).toHaveLength(1);

        // Also has conflicts
        expect(result.report.allConflicts).toHaveLength(1);

        // They are independent
        expect(result.report.ruleResults[0]?.violations[0]?.ruleId).toBe('test_ruleset_001');
        expect(result.report.allConflicts[0]?.conflict.sourceRule).toBe('soft_rule');
      }
    });

    it('conflicts coexist with cost validation', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.Informational, sourceRule: 'cost_info', message: 'Action will be expensive' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, CostValidationOutcome.AMBIGUOUS, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // Has cost results
        expect(result.report.costResults).toHaveLength(1);
        expect(result.report.costResults[0]?.costValidation.outcome).toBe(CostValidationOutcome.AMBIGUOUS);

        // Also has conflicts
        expect(result.report.allConflicts).toHaveLength(1);
        expect(result.report.allConflicts[0]?.conflict.message).toBe('Action will be expensive');
      }
    });

    it('conflicts from multiple validators are all collected', () => {
      const conflicts1: Conflict[] = [
        { kind: ConflictKind.HardBlock, sourceRule: 'rule_1', message: 'From validator 1' },
      ];
      const conflicts2: Conflict[] = [
        { kind: ConflictKind.SoftBlock, sourceRule: 'rule_2', message: 'From validator 2' },
      ];
      const pipeline1 = createMockPipeline('ruleset_1', ['TEST_INTENT'], RulesOutcome.PASS, CostValidationOutcome.AMBIGUOUS, conflicts1);
      const pipeline2 = createMockPipeline('ruleset_2', ['TEST_INTENT'], RulesOutcome.FAIL, CostValidationOutcome.UNSATISFIED, conflicts2);
      const registry = createMockRegistry([pipeline1, pipeline2]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // Two rule results (PASS and FAIL)
        expect(result.report.ruleResults).toHaveLength(2);

        // Two cost results
        expect(result.report.costResults).toHaveLength(2);

        // Two conflicts (one from each validator)
        expect(result.report.allConflicts).toHaveLength(2);
        expect(result.report.allConflicts[0]?.rulesetId).toBe('ruleset_1');
        expect(result.report.allConflicts[1]?.rulesetId).toBe('ruleset_2');
      }
    });
  });

  /**
   * CRITICAL INVARIANT: RuleValidationResult includes conflicts
   *
   * Each validator's result includes its conflicts.
   * This allows tracking which validator produced which conflicts.
   */
  describe('Conflicts in RuleValidationResult', () => {
    it('RuleValidationResult includes conflicts array', () => {
      const conflicts: Conflict[] = [
        { kind: ConflictKind.HardBlock, sourceRule: 'test_rule', message: 'Test conflict' },
      ];
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, conflicts);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        // RuleValidationResult has conflicts
        expect(result.report.ruleResults[0]?.conflicts).toBeDefined();
        expect(result.report.ruleResults[0]?.conflicts).toHaveLength(1);
        expect(result.report.ruleResults[0]?.conflicts[0]?.kind).toBe(ConflictKind.HardBlock);
      }
    });

    it('RuleValidationResult has empty conflicts when validator emits none', () => {
      const pipeline = createMockPipeline('test_ruleset', ['TEST_INTENT'], RulesOutcome.PASS, undefined, []);
      const registry = createMockRegistry([pipeline]);
      const aggregator = createValidationAggregator(registry);
      const intent = createTestIntent();

      const result = aggregator.aggregate(intent);

      expect(result.kind).toBe('aggregated');
      if (result.kind === 'aggregated') {
        expect(result.report.ruleResults[0]?.conflicts).toEqual([]);
      }
    });
  });
});
