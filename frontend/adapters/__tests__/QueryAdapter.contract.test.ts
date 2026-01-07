/**
 * QueryAdapter Contract Tests
 *
 * These tests define what the frontend is allowed to do.
 * They enforce that:
 * - Views are passed through unchanged
 * - Warnings are never hidden
 * - Override chains are never reconstructed
 * - Violations are returned explicitly
 */

import { QueryAdapter } from '../QueryAdapter';
import { QueryViolationCode } from '../../types/backend';
import {
  effectiveWithWarning,
  historyWithOverrides,
} from '../../fixtures/queries';

/**
 * Test double factory - to be implemented by test setup.
 * This placeholder will cause tests to fail until implemented.
 */
declare function createTestAdapter(): QueryAdapter;

describe('QueryAdapter contract', () => {
  let adapter: QueryAdapter;

  beforeEach(() => {
    adapter = createTestAdapter();
  });

  test('passes EffectiveInvocationView through unchanged', async () => {
    const result = await adapter.getEffectiveInvocation('inv_001');

    expect(result.kind).toBe('view');
    if (result.kind === 'view') {
      expect(result.view).toEqual(effectiveWithWarning);
    }
  });

  test('does not hide warnings', async () => {
    const result = await adapter.getEffectiveInvocation('inv_001');

    if (result.kind === 'view') {
      expect(result.view.latestWarning).toBeDefined();
      expect(result.view.latestWarning?.severity).toBe('WARNING');
    }
  });

  test('does not reconstruct override chains', async () => {
    const result = await adapter.getInvocationHistory('inv_001');

    if (result.kind === 'view') {
      expect(result.view.overrides).toEqual(historyWithOverrides.overrides);
    }
  });

  test('returns violations explicitly', async () => {
    const result = await adapter.getInvocationHistory('missing');

    expect(result.kind).toBe('violation');
    if (result.kind === 'violation') {
      expect(result.violation.code).toBe(QueryViolationCode.INVOCATION_NOT_FOUND);
    }
  });

  test('does not return empty views instead of violations', async () => {
    const result = await adapter.getInvocationHistory('missing');

    expect(result.kind).not.toBe('view');
  });

  test('preserves hasOverrides flag exactly', async () => {
    const result = await adapter.getEffectiveInvocation('inv_001');

    if (result.kind === 'view') {
      expect(result.view.hasOverrides).toBe(true);
    }
  });

  test('does not infer current invocation', async () => {
    const result = await adapter.getEffectiveInvocation('inv_001');

    if (result.kind === 'view') {
      // effectiveInvocation must be exactly what backend provided
      expect(result.view.effectiveInvocation).toEqual(effectiveWithWarning.effectiveInvocation);
    }
  });
});
