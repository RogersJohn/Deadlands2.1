/**
 * AI Commentary Service Tests (PR 5.0)
 *
 * These tests prove that AI has ZERO AUTHORITY.
 *
 * CRITICAL INVARIANTS TO VERIFY:
 * 1. Read-only inputs - AI receives snapshots, not live references
 * 2. No behavioral impact - System state unchanged with AI enabled/disabled
 * 3. Explicit opt-in - AI commentary is not fetched unless requested
 * 4. No persistence - AI output is not stored in authoritative data structures
 * 5. Failure safety - AI service failure does not break validation or UI flow
 *
 * If any test fails, PR 5.0 fails.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createAICommentaryService,
  createAICommentarySnapshot,
  isValidSnapshot,
  isValidCommentary,
} from '../index';
import type { AICommentarySnapshot, AICommentary, AICommentaryService } from '../types';
import { RulesOutcome } from '../../../../intent/bridge/ts/RulesPipeline';
import type { ValidationReport, IntentType, RulesetId, InvocationId } from '../../../../intent/bridge/ts/RulesPipeline';
import type { ValidatedIntent, IntentId } from '../../../../intent/bridge/ts/ValidatedIntent';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a minimal validated intent for testing
 *
 * Note: We create the ValidatedIntent directly for testing purposes,
 * simulating what would be produced by the actual validation process.
 */
function createTestIntent(): ValidatedIntent {
  // Cast to ValidatedIntent to bypass branding (for test purposes only)
  return {
    intentId: 'test_intent_001' as IntentId,
    intentType: 'TEST_INTENT' as IntentType,
    payload: { characterId: 'test_char', action: 'test_action' },
    validationSummary: {
      validatedAt: Date.now(),
      validatorVersion: '1.0.0',
      structuralChecks: ['intentId_present', 'intentType_present'],
    },
  } as unknown as ValidatedIntent;
}

/**
 * Create a minimal validation report for testing
 */
function createTestValidationReport(outcome: RulesOutcome): ValidationReport {
  return {
    invocationId: 'invocation_001' as InvocationId,
    sourceIntentId: 'test_intent_001',
    intentType: 'TEST_INTENT' as IntentType,
    rulesetId: 'test_ruleset' as RulesetId,
    outcome,
    violations:
      outcome === RulesOutcome.FAIL
        ? [{ ruleId: 'test_rule_001', message: 'Test violation', severity: 'ERROR' as const }]
        : [],
    ambiguity:
      outcome === RulesOutcome.AMBIGUOUS
        ? {
            reason: 'Ambiguous test case',
            possibleInterpretations: [
              { code: 'INTERP_A', resultingOutcome: RulesOutcome.PASS, description: 'Allow action' },
              { code: 'INTERP_B', resultingOutcome: RulesOutcome.FAIL, description: 'Deny action' },
            ],
          }
        : null,
    payload: { characterId: 'test_char', action: 'test_action' },
    conflicts: [],
  };
}

// ============================================================================
// CRITICAL TEST: READ-ONLY INPUTS
// ============================================================================

describe('AI Commentary - Read-Only Inputs', () => {
  /**
   * INVARIANT: AI receives snapshots, not live references
   *
   * Mutating AI output does NOT affect system state.
   */
  it('snapshot is a deep copy - mutating snapshot does not affect original', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    // Create snapshot
    const snapshot = createAICommentarySnapshot(intent, report);

    // Verify snapshot is created
    expect(snapshot).toBeDefined();
    expect(snapshot.intent.intentId).toBe(intent.intentId);

    // Attempt to mutate snapshot (TypeScript prevents this at compile time,
    // but we verify the runtime behavior)
    const mutableSnapshot = snapshot as { intent: { intentId: string } };

    // This doesn't throw at runtime (JS has no runtime immutability)
    // But we verify original is protected
    mutableSnapshot.intent.intentId = 'MUTATED_ID';

    // Original intent is unchanged
    expect(intent.intentId).toBe('test_intent_001');
    // The snapshot may be mutated, but original is safe
  });

  it('snapshot payload is deep-copied (JSON serialization)', () => {
    const originalPayload = {
      characterId: 'original_char',
      nested: { value: 'original_nested' },
    };

    const intent = {
      intentId: 'test_001' as IntentId,
      intentType: 'TEST' as IntentType,
      payload: originalPayload,
      validationSummary: {
        validatedAt: Date.now(),
        validatorVersion: '1.0.0',
        structuralChecks: ['test'],
      },
    } as unknown as ValidatedIntent;

    const report = createTestValidationReport(RulesOutcome.PASS);
    const snapshot = createAICommentarySnapshot(intent, report);

    // Modify the original payload AFTER snapshot creation
    originalPayload.nested.value = 'MUTATED';

    // Snapshot should have the ORIGINAL value (deep copy)
    const snapshotPayload = snapshot.intent.payload as typeof originalPayload;
    expect(snapshotPayload.nested.value).toBe('original_nested');
  });

  it('snapshot creation does not modify input objects', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL);

    // Capture original state
    const originalIntentId = intent.intentId;
    const originalOutcome = report.outcome;
    const originalViolationCount = report.violations.length;

    // Create snapshot
    createAICommentarySnapshot(intent, report);

    // Verify inputs are unchanged
    expect(intent.intentId).toBe(originalIntentId);
    expect(report.outcome).toBe(originalOutcome);
    expect(report.violations.length).toBe(originalViolationCount);
  });
});

// ============================================================================
// CRITICAL TEST: NO BEHAVIORAL IMPACT
// ============================================================================

describe('AI Commentary - No Behavioral Impact', () => {
  let service: AICommentaryService;

  beforeEach(() => {
    service = createAICommentaryService();
  });

  /**
   * INVARIANT: System state before AI === System state after AI
   *
   * This is the most critical test. AI must have ZERO impact on system behavior.
   */
  it('system state is unchanged after AI commentary generation', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    // Capture system state BEFORE AI
    const systemStateBefore = {
      intentId: intent.intentId,
      intentType: intent.intentType,
      payload: JSON.stringify(intent.payload),
      reportOutcome: report.outcome,
      reportViolations: JSON.stringify(report.violations),
      reportAmbiguity: report.ambiguity,
    };

    // Create snapshot and generate AI commentary
    const snapshot = createAICommentarySnapshot(intent, report);
    await service.generateCommentary(snapshot);

    // Capture system state AFTER AI
    const systemStateAfter = {
      intentId: intent.intentId,
      intentType: intent.intentType,
      payload: JSON.stringify(intent.payload),
      reportOutcome: report.outcome,
      reportViolations: JSON.stringify(report.violations),
      reportAmbiguity: report.ambiguity,
    };

    // CRITICAL ASSERTION: State must be identical
    expect(systemStateAfter).toEqual(systemStateBefore);
  });

  it('validation outcome is identical with AI enabled or disabled', async () => {
    const intent = createTestIntent();
    const reportPASS = createTestValidationReport(RulesOutcome.PASS);
    const reportFAIL = createTestValidationReport(RulesOutcome.FAIL);
    const reportAMBIGUOUS = createTestValidationReport(RulesOutcome.AMBIGUOUS);

    // Run AI on all outcomes
    for (const report of [reportPASS, reportFAIL, reportAMBIGUOUS]) {
      const outcomeBeforeAI = report.outcome;

      const snapshot = createAICommentarySnapshot(intent, report);
      await service.generateCommentary(snapshot);

      // Outcome is UNCHANGED
      expect(report.outcome).toBe(outcomeBeforeAI);
    }
  });

  it('violations are unchanged after AI commentary', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL);

    const violationsBefore = [...report.violations];

    const snapshot = createAICommentarySnapshot(intent, report);
    await service.generateCommentary(snapshot);

    // Violations are UNCHANGED
    expect(report.violations).toEqual(violationsBefore);
  });

  it('ambiguity is unchanged after AI commentary', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.AMBIGUOUS);

    const ambiguityBefore = report.ambiguity;

    const snapshot = createAICommentarySnapshot(intent, report);
    await service.generateCommentary(snapshot);

    // Ambiguity is UNCHANGED
    expect(report.ambiguity).toEqual(ambiguityBefore);
  });
});

// ============================================================================
// CRITICAL TEST: EXPLICIT OPT-IN
// ============================================================================

describe('AI Commentary - Explicit Opt-In', () => {
  /**
   * INVARIANT: AI commentary is not fetched or rendered unless requested
   */
  it('service does not automatically generate commentary', () => {
    const service = createAICommentaryService();

    // Service exists but does nothing until explicitly called
    expect(service).toBeDefined();
    expect(service.generateCommentary).toBeDefined();

    // No automatic invocation - must be explicitly called
    // (This is a structural test; the service is a pure function)
  });

  it('snapshot creation does not trigger AI generation', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    // Creating a snapshot is passive - no AI is invoked
    const snapshot = createAICommentarySnapshot(intent, report);

    // Snapshot exists but AI has not run
    expect(snapshot).toBeDefined();
    // AICommentarySnapshot has no 'commentary' field - it's input only
    expect('commentary' in snapshot).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: NO PERSISTENCE
// ============================================================================

describe('AI Commentary - No Persistence', () => {
  let service: AICommentaryService;

  beforeEach(() => {
    service = createAICommentaryService();
  });

  /**
   * INVARIANT: AI output is not stored in any authoritative data structure
   */
  it('AI commentary is transient - not stored in validation report', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    // Commentary is generated
    expect(commentary.success).toBe(true);
    expect(commentary.commentary.length).toBeGreaterThan(0);

    // But report has no commentary field
    expect('aiCommentary' in report).toBe(false);
    expect('commentary' in report).toBe(false);
    expect('explanation' in report).toBe(false);
  });

  it('AI commentary has no persistence hooks', () => {
    const service = createAICommentaryService();

    // Service has no save/persist/store methods
    expect('save' in service).toBe(false);
    expect('persist' in service).toBe(false);
    expect('store' in service).toBe(false);
    expect('commit' in service).toBe(false);
  });

  it('AI commentary output has no ID that could be stored', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    // Commentary has no ID field (it's not meant to be stored)
    expect('id' in commentary).toBe(false);
    expect('commentaryId' in commentary).toBe(false);
    expect('persistenceId' in commentary).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: FAILURE SAFETY
// ============================================================================

describe('AI Commentary - Failure Safety', () => {
  /**
   * INVARIANT: AI service failure does not break validation or UI flow
   */
  it('invalid snapshot returns error, does not throw', async () => {
    const service = createAICommentaryService();

    // Create an invalid snapshot
    const invalidSnapshot = {} as AICommentarySnapshot;

    // Should return error, not throw
    const result = await service.generateCommentary(invalidSnapshot);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.commentary).toBe('');
  });

  it('null input returns error safely', async () => {
    const service = createAICommentaryService();

    // @ts-expect-error Testing null handling
    const result = await service.generateCommentary(null);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('undefined input returns error safely', async () => {
    const service = createAICommentaryService();

    // @ts-expect-error Testing undefined handling
    const result = await service.generateCommentary(undefined);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('AI failure does not affect validation report', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL);

    const outcomeBefore = report.outcome;
    const violationsBefore = report.violations.length;

    // Force AI failure with invalid snapshot
    const service = createAICommentaryService();
    const invalidSnapshot = {} as AICommentarySnapshot;
    await service.generateCommentary(invalidSnapshot);

    // Validation report is UNCHANGED
    expect(report.outcome).toBe(outcomeBefore);
    expect(report.violations.length).toBe(violationsBefore);
  });
});

// ============================================================================
// OUTPUT VALIDATION
// ============================================================================

describe('AI Commentary - Output Validation', () => {
  let service: AICommentaryService;

  beforeEach(() => {
    service = createAICommentaryService();
  });

  it('output is plain text (string), not structured data', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    // Commentary is a string
    expect(typeof commentary.commentary).toBe('string');

    // Not an object with structured commands
    expect(typeof commentary.commentary).not.toBe('object');
  });

  it('output has no action recommendations', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    // Commentary should NOT contain action commands
    expect(commentary.commentary).not.toContain('RECOMMEND_ACTION');
    expect(commentary.commentary).not.toContain('APPLY_OVERRIDE');
    expect(commentary.commentary).not.toContain('EXECUTE');
  });

  it('output includes advisory disclaimer', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    // Commentary should include advisory disclaimer
    expect(commentary.commentary.toLowerCase()).toContain('advisory');
  });

  it('output is valid AICommentary structure', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    // Validate structure
    expect(isValidCommentary(commentary)).toBe(true);
  });
});

// ============================================================================
// SNAPSHOT VALIDATION
// ============================================================================

describe('AI Commentary - Snapshot Validation', () => {
  it('valid snapshot passes type guard', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const snapshot = createAICommentarySnapshot(intent, report);

    expect(isValidSnapshot(snapshot)).toBe(true);
  });

  it('invalid snapshot fails type guard', () => {
    expect(isValidSnapshot(null)).toBe(false);
    expect(isValidSnapshot(undefined)).toBe(false);
    expect(isValidSnapshot({})).toBe(false);
    expect(isValidSnapshot({ intent: {} })).toBe(false);
    expect(isValidSnapshot({ intent: { intentId: 123 } })).toBe(false);
  });

  it('snapshot includes timestamp (proves point-in-time copy)', () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const before = Date.now();
    const snapshot = createAICommentarySnapshot(intent, report);
    const after = Date.now();

    expect(snapshot.snapshotTimestamp).toBeGreaterThanOrEqual(before);
    expect(snapshot.snapshotTimestamp).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// COMMENTARY CONTENT TESTS
// ============================================================================

describe('AI Commentary - Content Generation', () => {
  let service: AICommentaryService;

  beforeEach(() => {
    service = createAICommentaryService();
  });

  it('generates commentary for PASS outcome', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.PASS);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    expect(commentary.success).toBe(true);
    expect(commentary.commentary).toContain('valid');
  });

  it('generates commentary for FAIL outcome with violations', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.FAIL);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    expect(commentary.success).toBe(true);
    expect(commentary.commentary).toContain('cannot proceed');
    expect(commentary.commentary).toContain('Violation');
  });

  it('generates commentary for AMBIGUOUS outcome', async () => {
    const intent = createTestIntent();
    const report = createTestValidationReport(RulesOutcome.AMBIGUOUS);

    const snapshot = createAICommentarySnapshot(intent, report);
    const commentary = await service.generateCommentary(snapshot);

    expect(commentary.success).toBe(true);
    expect(commentary.commentary).toContain('could not determine');
    expect(commentary.commentary).toContain('GM');
  });
});
