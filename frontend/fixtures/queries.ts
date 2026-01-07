/**
 * Canonical Query Fixtures
 *
 * These fixtures represent backend truth.
 * They must be reused by all frontend tests.
 * Do NOT infer semantics from these values.
 */

import {
  InvocationSummaryView,
  EffectiveInvocationView,
  InvocationHistoryView,
} from '../types/backend';

export const summaryNoOverride: InvocationSummaryView = {
  invocationId: 'inv_001',
  intentType: 'ATTACK',
  rulesetId: 'deadlands.core',
  hasOverrides: false,
};

export const effectiveWithWarning: EffectiveInvocationView = {
  effectiveInvocation: { arbitrary: 'payload' },
  hasOverrides: true,
  latestWarning: {
    severity: 'WARNING',
    message: 'GM modified damage',
  },
};

export const historyWithOverrides: InvocationHistoryView = {
  invocation: { original: true },
  overrides: [
    { overrideId: 'ov_1' },
    { overrideId: 'ov_2' },
  ],
  tombstones: [],
};
