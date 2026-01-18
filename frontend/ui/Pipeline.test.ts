/**
 * Pipeline Tests (PR 3.0, PR 3.1)
 *
 * Tests for mock pipeline and override clients.
 */

import { describe, it, expect } from 'vitest';
import {
  createMockPipelineClient,
  createValidationErrorMock,
  createAdapterFailureMock,
  createMockOverrideClient,
  createOverrideViolationMock,
  DEFAULT_MOCK_CONFIG,
  DEFAULT_MOCK_OVERRIDE_CONFIG,
} from './Pipeline';
import type { RawIntentInput, OverrideRequest, ValidationReport } from './types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestIntent = (): RawIntentInput => ({
  intentType: 'ATTACK',
  payload: { targetId: 'goblin_001', weaponId: 'sword_001' },
});

const createTestValidationReport = (): ValidationReport => ({
  invocationId: 'inv_test_001',
  sourceIntentId: 'intent_test_001',
  intentType: 'ATTACK',
  rulesetId: 'deadlands_core',
  outcome: 'FAIL',
  violations: [{ ruleId: 'rule_001', message: 'Test violation', severity: 'ERROR' }],
  ambiguity: null,
  payload: { targetId: 'target_001' },
});

const createTestOverrideRequest = (): OverrideRequest => ({
  validationReport: createTestValidationReport(),
  newOutcome: 'PASS',
  reason: 'Testing override submission',
  warningSeverity: 'INFO',
  warningMessage: 'GM Override: Testing override submission',
  gmId: 'gm_001',
});

// ============================================================================
// MOCK PIPELINE CLIENT TESTS
// ============================================================================

describe('createMockPipelineClient', () => {
  it('returns success result with default config', async () => {
    const client = createMockPipelineClient({ simulateDelay: 0 });
    const result = await client.submitIntent(createTestIntent());

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.intentId).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.effectiveOutcome).toBe('PASS'); // Default
      expect(result.resolution).toBeDefined();
    }
  });

  it('respects configured outcome', async () => {
    const client = createMockPipelineClient({
      simulateDelay: 0,
      defaultOutcome: 'FAIL',
    });
    const result = await client.submitIntent(createTestIntent());

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.effectiveOutcome).toBe('FAIL');
      expect(result.validation.outcome).toBe('FAIL');
    }
  });

  it('includes override when configured', async () => {
    const client = createMockPipelineClient({
      simulateDelay: 0,
      defaultOutcome: 'FAIL',
      includeOverride: true,
    });
    const result = await client.submitIntent(createTestIntent());

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.override).not.toBeNull();
      expect(result.override!.overrideId).toBeDefined();
      expect(result.effectiveOutcome).toBe('PASS'); // Override changes to PASS
    }
  });

  it('generates deterministic IDs', async () => {
    const client = createMockPipelineClient({ simulateDelay: 0 });
    const intent = createTestIntent();

    const result1 = await client.submitIntent(intent);
    const result2 = await client.submitIntent(intent);

    if (result1.kind === 'success' && result2.kind === 'success') {
      expect(result1.intentId).toBe(result2.intentId);
      expect(result1.validation.invocationId).toBe(result2.validation.invocationId);
    }
  });
});

describe('createValidationErrorMock', () => {
  it('returns validation error', async () => {
    const errors = ['Missing targetId', 'Invalid weaponId'];
    const client = createValidationErrorMock(errors);
    const result = await client.submitIntent(createTestIntent());

    expect(result.kind).toBe('validation_error');
    if (result.kind === 'validation_error') {
      expect(result.errors).toEqual(errors);
    }
  });
});

describe('createAdapterFailureMock', () => {
  it('returns adapter failure', async () => {
    const client = createAdapterFailureMock('NO_ADAPTER', 'No adapter found');
    const result = await client.submitIntent(createTestIntent());

    expect(result.kind).toBe('adapter_failure');
    if (result.kind === 'adapter_failure') {
      expect(result.code).toBe('NO_ADAPTER');
      expect(result.details).toBe('No adapter found');
    }
  });
});

// ============================================================================
// MOCK OVERRIDE CLIENT TESTS (PR 3.1)
// ============================================================================

describe('createMockOverrideClient', () => {
  it('returns success with created override', async () => {
    const client = createMockOverrideClient({ simulateDelay: 0 });
    const result = await client.submitOverride(createTestOverrideRequest());

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.override.overrideId).toBeDefined();
      expect(result.override.reason).toBe('Testing override submission');
      expect(result.override.warning.severity).toBe('INFO');
      expect(result.newEffectiveOutcome).toBe('PASS');
    }
  });

  it('rejects empty reason', async () => {
    const client = createMockOverrideClient({ simulateDelay: 0 });
    const request: OverrideRequest = {
      ...createTestOverrideRequest(),
      reason: '',
    };
    const result = await client.submitOverride(request);

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.code).toBe('EMPTY_REASON');
    }
  });

  it('rejects empty warning message', async () => {
    const client = createMockOverrideClient({ simulateDelay: 0 });
    const request: OverrideRequest = {
      ...createTestOverrideRequest(),
      warningMessage: '',
    };
    const result = await client.submitOverride(request);

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.code).toBe('EMPTY_WARNING_MESSAGE');
    }
  });

  it('respects forceViolation config', async () => {
    const client = createMockOverrideClient({
      simulateDelay: 0,
      forceViolation: true,
      violationCode: 'CUSTOM_VIOLATION',
      violationDetails: 'Custom violation message',
    });
    const result = await client.submitOverride(createTestOverrideRequest());

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.code).toBe('CUSTOM_VIOLATION');
      expect(result.details).toBe('Custom violation message');
    }
  });

  it('builds resolution with effects for PASS outcome', async () => {
    const client = createMockOverrideClient({ simulateDelay: 0 });
    const result = await client.submitOverride(createTestOverrideRequest());

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.resolution.outcome).toBe('EFFECTS_PRODUCED');
      expect(result.resolution.effects.length).toBeGreaterThan(0);
    }
  });

  it('builds resolution without effects for FAIL outcome', async () => {
    const client = createMockOverrideClient({ simulateDelay: 0 });
    const request: OverrideRequest = {
      ...createTestOverrideRequest(),
      newOutcome: 'FAIL',
    };
    const result = await client.submitOverride(request);

    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.resolution.outcome).toBe('NO_EFFECTS_FAIL');
      expect(result.resolution.effects).toHaveLength(0);
    }
  });
});

describe('createOverrideViolationMock', () => {
  it('always returns violation', async () => {
    const client = createOverrideViolationMock('PERMISSION_DENIED', 'Not a GM');
    const result = await client.submitOverride(createTestOverrideRequest());

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.details).toBe('Not a GM');
    }
  });
});

// ============================================================================
// DEFAULT CONFIG TESTS
// ============================================================================

describe('DEFAULT_MOCK_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_MOCK_CONFIG.defaultOutcome).toBe('PASS');
    expect(DEFAULT_MOCK_CONFIG.includeOverride).toBe(false);
    expect(DEFAULT_MOCK_CONFIG.includeEffects).toBe(true);
    expect(DEFAULT_MOCK_CONFIG.simulateDelay).toBe(100);
  });
});

describe('DEFAULT_MOCK_OVERRIDE_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_MOCK_OVERRIDE_CONFIG.simulateDelay).toBe(100);
    expect(DEFAULT_MOCK_OVERRIDE_CONFIG.forceViolation).toBe(false);
  });
});
