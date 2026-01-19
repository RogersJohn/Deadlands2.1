/**
 * IntentRulesAdapter Tests
 *
 * These tests prove the authority boundaries of the adapter:
 * - Only ValidatedIntent is accepted (type-level enforcement)
 * - Exactly one pipeline must claim authority
 * - No pipeline → explicit adapter failure
 * - Multiple pipelines → explicit adapter failure
 * - Adapter does not alter or enrich intent data
 * - AMBIGUOUS outcome passed through unchanged
 */

import { describe, it, expect } from 'vitest';

import {
  AdapterFailureCode,
  AdapterResult,
  createIntentRulesAdapter,
  IntentRulesAdapter,
} from '../IntentRulesAdapter';
import {
  InvocationId,
  PipelineRegistry,
  RuleAuthorityClaim,
  RulesetId,
  RulesOutcome,
  RulesPipeline,
  ValidationReport,
} from '../RulesPipeline';
import {
  createValidatedIntent,
  IntentType,
  IntentValidationResult,
  ValidatedIntent,
  ValidationSummary,
} from '../ValidatedIntent';

// Test fixtures
const validSummary: ValidationSummary = {
  validatedAt: 1000,
  validatorVersion: '1.0.0',
  structuralChecks: ['field_presence'],
};

function makeValidatedIntent(
  intentId: string,
  intentType: string,
  payload: unknown
): ValidatedIntent {
  const result: IntentValidationResult = {
    kind: 'valid',
    intent: { intentId, intentType, payload },
    summary: validSummary,
  };
  const validated = createValidatedIntent(result);
  if (validated === null) {
    throw new Error('Test setup failed: could not create ValidatedIntent');
  }
  return validated;
}

// Mock pipeline that captures what it receives
class MockPipeline implements RulesPipeline {
  readonly rulesetId: RulesetId;
  readonly handledIntentTypes: readonly IntentType[];

  lastReceivedIntent: ValidatedIntent | null = null;
  lastReceivedInvocationId: InvocationId | null = null;
  returnOutcome: RulesOutcome = RulesOutcome.PASS;
  returnAmbiguity: ValidationReport['ambiguity'] = null;

  constructor(rulesetId: string, intentTypes: string[]) {
    this.rulesetId = rulesetId as RulesetId;
    this.handledIntentTypes = intentTypes as IntentType[];
  }

  validate(intent: ValidatedIntent, invocationId: InvocationId): ValidationReport {
    this.lastReceivedIntent = intent;
    this.lastReceivedInvocationId = invocationId;

    return {
      invocationId,
      sourceIntentId: intent.intentId,
      intentType: intent.intentType,
      rulesetId: this.rulesetId,
      outcome: this.returnOutcome,
      violations: [],
      ambiguity: this.returnAmbiguity,
      payload: intent.payload,
      // PR 4.3: Conflicts are data, not logic
      conflicts: [],
    };
  }
}

// Mock registry
class MockRegistry implements PipelineRegistry {
  private claims: RuleAuthorityClaim[] = [];
  private pipelines: Map<string, RulesPipeline> = new Map();

  addPipeline(pipeline: RulesPipeline): void {
    this.pipelines.set(pipeline.rulesetId, pipeline);
    for (const intentType of pipeline.handledIntentTypes) {
      this.claims.push({
        rulesetId: pipeline.rulesetId,
        intentType,
      });
    }
  }

  addClaimOnly(rulesetId: string, intentType: string): void {
    // Add claim without corresponding pipeline (to test PIPELINE_NOT_FOUND)
    this.claims.push({
      rulesetId: rulesetId as RulesetId,
      intentType: intentType as IntentType,
    });
  }

  getAuthorityClaims(): readonly RuleAuthorityClaim[] {
    return this.claims;
  }

  getPipeline(rulesetId: RulesetId): RulesPipeline | null {
    return this.pipelines.get(rulesetId) ?? null;
  }

  // PR 4.2: Get all pipelines for an intent type
  getPipelinesForIntent(intentType: IntentType): readonly RulesPipeline[] {
    const matchingClaims = this.claims.filter(c => c.intentType === intentType);
    const pipelines: RulesPipeline[] = [];
    for (const claim of matchingClaims) {
      const pipeline = this.pipelines.get(claim.rulesetId);
      if (pipeline) {
        pipelines.push(pipeline);
      }
    }
    return pipelines;
  }
}

describe('IntentRulesAdapter', () => {
  describe('Pipeline Authority Selection', () => {
    it('fails with NO_PIPELINE_CLAIMS_AUTHORITY when no pipeline claims authority', () => {
      const registry = new MockRegistry();
      const adapter = createIntentRulesAdapter(registry);

      const intent = makeValidatedIntent('i1', 'UNKNOWN_TYPE', {});
      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('failure');
      if (result.kind === 'failure') {
        expect(result.failure.code).toBe(AdapterFailureCode.NO_PIPELINE_CLAIMS_AUTHORITY);
        expect(result.failure.intentId).toBe('i1');
        expect(result.failure.intentType).toBe('UNKNOWN_TYPE');
        expect(result.failure.details).toContain('No pipeline claims authority');
      }
    });

    it('fails with MULTIPLE_PIPELINES_CLAIM_AUTHORITY when multiple pipelines claim authority', () => {
      const registry = new MockRegistry();
      const pipeline1 = new MockPipeline('ruleset_a', ['SHARED_TYPE']);
      const pipeline2 = new MockPipeline('ruleset_b', ['SHARED_TYPE']);
      registry.addPipeline(pipeline1);
      registry.addPipeline(pipeline2);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'SHARED_TYPE', {});
      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('failure');
      if (result.kind === 'failure') {
        expect(result.failure.code).toBe(AdapterFailureCode.MULTIPLE_PIPELINES_CLAIM_AUTHORITY);
        expect(result.failure.intentId).toBe('i1');
        expect(result.failure.details).toContain('Multiple pipelines claim authority');
        expect(result.failure.claimingRulesets).toContain('ruleset_a');
        expect(result.failure.claimingRulesets).toContain('ruleset_b');
      }
    });

    it('succeeds when exactly one pipeline claims authority', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('ruleset_single', ['UNIQUE_TYPE']);
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'UNIQUE_TYPE', { data: 'test' });
      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.rulesetId).toBe('ruleset_single');
        expect(result.report.sourceIntentId).toBe('i1');
      }
    });

    it('fails with PIPELINE_NOT_FOUND when claim exists but pipeline is missing', () => {
      const registry = new MockRegistry();
      registry.addClaimOnly('ghost_ruleset', 'GHOST_TYPE');

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'GHOST_TYPE', {});
      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('failure');
      if (result.kind === 'failure') {
        expect(result.failure.code).toBe(AdapterFailureCode.PIPELINE_NOT_FOUND);
        expect(result.failure.details).toContain('Pipeline not found');
      }
    });
  });

  describe('Data Passthrough', () => {
    it('passes intent to pipeline without modification', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const originalPayload = { nested: { value: 42 }, array: [1, 2, 3] };
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', originalPayload);

      adapter.processIntent(intent);

      expect(pipeline.lastReceivedIntent).not.toBeNull();
      expect(pipeline.lastReceivedIntent?.intentId).toBe('i1');
      expect(pipeline.lastReceivedIntent?.intentType).toBe('TEST_TYPE');
      expect(pipeline.lastReceivedIntent?.payload).toBe(originalPayload);
      // Same reference - no cloning or modification
      expect(pipeline.lastReceivedIntent?.payload).toBe(intent.payload);
    });

    it('does not alter payload in returned report', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const originalPayload = { key: 'value' };
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', originalPayload);

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.payload).toBe(originalPayload);
      }
    });
  });

  describe('Invocation ID Generation', () => {
    it('generates deterministic invocation ID', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', { data: 'same' });

      adapter.processIntent(intent);
      const firstId = pipeline.lastReceivedInvocationId;

      adapter.processIntent(intent);
      const secondId = pipeline.lastReceivedInvocationId;

      expect(firstId).toBe(secondId);
    });

    it('different intents produce different invocation IDs', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);

      const intent1 = makeValidatedIntent('i1', 'TEST_TYPE', { data: 'first' });
      adapter.processIntent(intent1);
      const id1 = pipeline.lastReceivedInvocationId;

      const intent2 = makeValidatedIntent('i2', 'TEST_TYPE', { data: 'second' });
      adapter.processIntent(intent2);
      const id2 = pipeline.lastReceivedInvocationId;

      expect(id1).not.toBe(id2);
    });

    it('invocation ID format is inv_ prefix with hex', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', {});

      adapter.processIntent(intent);

      expect(pipeline.lastReceivedInvocationId).toMatch(/^inv_[0-9a-f]{8}$/);
    });
  });

  describe('Rules Outcome Passthrough', () => {
    it('passes through PASS outcome', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      pipeline.returnOutcome = RulesOutcome.PASS;
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', {});

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.outcome).toBe(RulesOutcome.PASS);
      }
    });

    it('passes through FAIL outcome', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      pipeline.returnOutcome = RulesOutcome.FAIL;
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', {});

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.outcome).toBe(RulesOutcome.FAIL);
      }
    });

    it('passes through AMBIGUOUS outcome unchanged', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      pipeline.returnOutcome = RulesOutcome.AMBIGUOUS;
      pipeline.returnAmbiguity = {
        reason: 'Rules cannot determine outcome',
        possibleInterpretations: [
          { code: 'OPTION_A', resultingOutcome: RulesOutcome.PASS, description: 'Option A' },
          { code: 'OPTION_B', resultingOutcome: RulesOutcome.FAIL, description: 'Option B' },
        ],
      };
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', {});

      const result = adapter.processIntent(intent);

      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        expect(result.report.outcome).toBe(RulesOutcome.AMBIGUOUS);
        expect(result.report.ambiguity).not.toBeNull();
        expect(result.report.ambiguity?.reason).toBe('Rules cannot determine outcome');
        expect(result.report.ambiguity?.possibleInterpretations).toHaveLength(2);
      }
    });
  });

  describe('Adapter Failures vs Rule Violations', () => {
    it('adapter failures are type-distinct from rule violations', () => {
      const registry = new MockRegistry();
      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'UNKNOWN', {});

      const result = adapter.processIntent(intent);

      // Adapter failure
      expect(result.kind).toBe('failure');
      if (result.kind === 'failure') {
        // AdapterFailure has: code, intentId, intentType, details
        expect(result.failure).toHaveProperty('code');
        expect(result.failure).toHaveProperty('intentId');
        expect(result.failure).toHaveProperty('intentType');
        expect(result.failure).toHaveProperty('details');
        // NOT a RuleViolation (which has: ruleId, message, severity)
        expect(result.failure).not.toHaveProperty('ruleId');
        expect(result.failure).not.toHaveProperty('severity');
      }
    });

    it('rule violations are returned inside ValidationReport, not as adapter failures', () => {
      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      pipeline.returnOutcome = RulesOutcome.FAIL;
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', {});

      const result = adapter.processIntent(intent);

      // Success at adapter level (report returned)
      expect(result.kind).toBe('report');
      if (result.kind === 'report') {
        // Rule failure is inside the report
        expect(result.report.outcome).toBe(RulesOutcome.FAIL);
        // Violations would be in result.report.violations
      }
    });
  });

  describe('Type Safety (Compile-Time Documentation)', () => {
    /**
     * These tests document compile-time guarantees.
     * TypeScript prevents calling processIntent with wrong types.
     */

    it('processIntent only accepts ValidatedIntent', () => {
      // This test documents that the following would NOT compile:
      //
      // const rawIntent = { intentId: 'i1', intentType: 'TEST', payload: {} };
      // adapter.processIntent(rawIntent); // Error: not assignable to ValidatedIntent
      //
      // Only ValidatedIntent (with brand) is accepted.

      const registry = new MockRegistry();
      const pipeline = new MockPipeline('test_ruleset', ['TEST_TYPE']);
      registry.addPipeline(pipeline);

      const adapter = createIntentRulesAdapter(registry);

      // The ONLY way to call processIntent is with a ValidatedIntent
      const intent = makeValidatedIntent('i1', 'TEST_TYPE', {});
      const result = adapter.processIntent(intent);

      expect(result).toBeDefined();
    });
  });
});
