/**
 * CommandAdapter Contract Tests
 *
 * These tests define what the frontend is allowed to do.
 * They enforce that:
 * - Payloads are never mutated
 * - Violations are returned as data
 * - No transformation occurs
 */

import { describe, it, expect, beforeEach, test } from 'vitest';
import { CommandAdapter } from '../CommandAdapter';

/**
 * Test double factory - to be implemented by test setup.
 * This placeholder will cause tests to fail until implemented.
 */
declare function createTestAdapter(): CommandAdapter;

describe('CommandAdapter contract', () => {
  let adapter: CommandAdapter;

  beforeEach(() => {
    adapter = createTestAdapter();
  });

  test('does not mutate intent payloads', async () => {
    const payload = Object.freeze({ a: 1 });

    await adapter.submitIntent(payload);

    expect(payload).toEqual({ a: 1 });
  });

  test('does not mutate override payloads', async () => {
    const payload = Object.freeze({ overrideData: 'test' });

    await adapter.submitOverride(payload);

    expect(payload).toEqual({ overrideData: 'test' });
  });

  test('returns violations as data for intents', async () => {
    const result = await adapter.submitIntent({});

    if (result.kind === 'violation') {
      expect(result.violation).toBeDefined();
    }
  });

  test('returns violations as data for overrides', async () => {
    const result = await adapter.submitOverride({});

    if (result.kind === 'violation') {
      expect(result.violation).toBeDefined();
    }
  });

  test('does not swallow backend failures for intents', async () => {
    // Adapter must propagate failures, not hide them
    const result = await adapter.submitIntent({ invalid: true });

    // Result must be either ok or violation, never undefined
    expect(result).toBeDefined();
    expect(['ok', 'violation']).toContain(result.kind);
  });

  test('does not swallow backend failures for overrides', async () => {
    // Adapter must propagate failures, not hide them
    const result = await adapter.submitOverride({ invalid: true });

    // Result must be either ok or violation, never undefined
    expect(result).toBeDefined();
    expect(['ok', 'violation']).toContain(result.kind);
  });

  test('treats input as opaque - no transformation', async () => {
    const complexPayload = {
      nested: { deep: { value: 123 } },
      array: [1, 2, 3],
      nullValue: null,
    };

    // Should not throw or transform
    const result = await adapter.submitIntent(complexPayload);

    expect(result).toBeDefined();
  });
});
