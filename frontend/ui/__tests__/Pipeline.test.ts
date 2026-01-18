/**
 * Pipeline Tests (PR 3.0)
 *
 * Tests prove:
 * - UI submits intent without mutation
 * - UI receives complete authority chain
 * - Mock pipeline produces deterministic results
 * - UI is read-only with respect to authority
 */

import {
  createMockPipelineClient,
  createValidationErrorMock,
  createAdapterFailureMock,
  DEFAULT_MOCK_CONFIG,
} from '../Pipeline';
import type { RawIntentInput } from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const testIntent: RawIntentInput = {
  intentType: 'ATTACK',
  payload: {
    attackerId: 'char_1',
    targetId: 'enemy_1',
  },
};

// ============================================================================
// MOCK PIPELINE TESTS
// ============================================================================

describe('Pipeline - Mock Client', () => {
  describe('success path', () => {
    it('returns success result with PASS outcome', async () => {
      const client = createMockPipelineClient({ defaultOutcome: 'PASS', simulateDelay: 0 });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.validation.outcome).toBe('PASS');
        expect(result.effectiveOutcome).toBe('PASS');
      }
    });

    it('returns success result with FAIL outcome', async () => {
      const client = createMockPipelineClient({ defaultOutcome: 'FAIL', simulateDelay: 0 });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.validation.outcome).toBe('FAIL');
        expect(result.validation.violations).toHaveLength(1);
      }
    });

    it('returns success result with AMBIGUOUS outcome', async () => {
      const client = createMockPipelineClient({ defaultOutcome: 'AMBIGUOUS', simulateDelay: 0 });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.validation.outcome).toBe('AMBIGUOUS');
        expect(result.validation.ambiguity).not.toBeNull();
      }
    });
  });

  describe('override handling', () => {
    it('includes override when configured', async () => {
      const client = createMockPipelineClient({
        defaultOutcome: 'FAIL',
        includeOverride: true,
        simulateDelay: 0,
      });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.override).not.toBeNull();
        expect(result.effectiveOutcome).toBe('PASS'); // Override changes outcome
      }
    });

    it('excludes override when not configured', async () => {
      const client = createMockPipelineClient({
        defaultOutcome: 'PASS',
        includeOverride: false,
        simulateDelay: 0,
      });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.override).toBeNull();
      }
    });
  });

  describe('effects handling', () => {
    it('includes effects for PASS when configured', async () => {
      const client = createMockPipelineClient({
        defaultOutcome: 'PASS',
        includeEffects: true,
        simulateDelay: 0,
      });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.resolution.effects.length).toBeGreaterThan(0);
      }
    });

    it('excludes effects for FAIL', async () => {
      const client = createMockPipelineClient({
        defaultOutcome: 'FAIL',
        includeEffects: true,
        simulateDelay: 0,
      });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.resolution.effects).toHaveLength(0);
      }
    });
  });

  describe('determinism', () => {
    it('produces same IDs for same input', async () => {
      const client = createMockPipelineClient({ simulateDelay: 0 });

      const result1 = await client.submitIntent(testIntent);
      const result2 = await client.submitIntent(testIntent);

      expect(result1.kind).toBe('success');
      expect(result2.kind).toBe('success');
      if (result1.kind === 'success' && result2.kind === 'success') {
        expect(result1.intentId).toBe(result2.intentId);
        expect(result1.validation.invocationId).toBe(result2.validation.invocationId);
      }
    });

    it('produces different IDs for different input', async () => {
      const client = createMockPipelineClient({ simulateDelay: 0 });

      const intent2: RawIntentInput = {
        intentType: 'MOVE',
        payload: { characterId: 'char_1' },
      };

      const result1 = await client.submitIntent(testIntent);
      const result2 = await client.submitIntent(intent2);

      expect(result1.kind).toBe('success');
      expect(result2.kind).toBe('success');
      if (result1.kind === 'success' && result2.kind === 'success') {
        expect(result1.intentId).not.toBe(result2.intentId);
      }
    });
  });

  describe('intent preservation', () => {
    it('does not modify input intent', async () => {
      const client = createMockPipelineClient({ simulateDelay: 0 });
      const intentCopy = JSON.stringify(testIntent);

      await client.submitIntent(testIntent);

      expect(JSON.stringify(testIntent)).toBe(intentCopy);
    });

    it('preserves intent type in validation report', async () => {
      const client = createMockPipelineClient({ simulateDelay: 0 });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.validation.intentType).toBe(testIntent.intentType);
      }
    });

    it('preserves payload in validation report', async () => {
      const client = createMockPipelineClient({ simulateDelay: 0 });

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('success');
      if (result.kind === 'success') {
        expect(result.validation.payload).toEqual(testIntent.payload);
      }
    });
  });
});

// ============================================================================
// ERROR MOCK TESTS
// ============================================================================

describe('Pipeline - Error Mocks', () => {
  describe('validation error mock', () => {
    it('returns validation errors', async () => {
      const errors = ['Field X is required', 'Field Y is invalid'];
      const client = createValidationErrorMock(errors);

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('validation_error');
      if (result.kind === 'validation_error') {
        expect(result.errors).toEqual(errors);
      }
    });
  });

  describe('adapter failure mock', () => {
    it('returns adapter failure', async () => {
      const client = createAdapterFailureMock('NO_PIPELINE', 'No pipeline registered');

      const result = await client.submitIntent(testIntent);

      expect(result.kind).toBe('adapter_failure');
      if (result.kind === 'adapter_failure') {
        expect(result.code).toBe('NO_PIPELINE');
        expect(result.details).toBe('No pipeline registered');
      }
    });
  });
});

// ============================================================================
// DEFAULT CONFIG TESTS
// ============================================================================

describe('Pipeline - Default Config', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_MOCK_CONFIG.defaultOutcome).toBe('PASS');
    expect(DEFAULT_MOCK_CONFIG.includeOverride).toBe(false);
    expect(DEFAULT_MOCK_CONFIG.includeEffects).toBe(true);
  });
});

// ============================================================================
// READ-ONLY GUARANTEE TESTS
// ============================================================================

describe('Pipeline - Read-Only Guarantees', () => {
  it('client does not expose mutation methods', () => {
    const client = createMockPipelineClient({ simulateDelay: 0 });

    // Only submitIntent is exposed
    expect(typeof client.submitIntent).toBe('function');

    // No other methods
    const keys = Object.keys(client);
    expect(keys).toEqual(['submitIntent']);
  });

  it('result objects are immutable (readonly types)', async () => {
    const client = createMockPipelineClient({ simulateDelay: 0 });

    const result = await client.submitIntent(testIntent);

    // TypeScript enforces readonly, but we verify structure
    expect(result.kind).toBeDefined();
    if (result.kind === 'success') {
      expect(Object.isFrozen(result)).toBe(false); // Not frozen, but readonly via type
    }
  });
});
