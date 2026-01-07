/**
 * Query Functions (TypeScript implementation)
 *
 * Pure, read-only projection over persisted truth.
 * No mutations. No caching. No UI concerns.
 */

import {
  EffectiveInvocationView,
  InvocationHistoryView,
  InvocationSummaryView,
  PersistedInvocation,
  PersistedOverride,
  QueryViolation,
  QueryViolationCode,
  Tombstone,
} from './types';

/**
 * Build ordered override chain from parentOverrideId linkage.
 * Returns null if chain is invalid (cycle, broken links).
 */
function buildOrderedChain(overrides: PersistedOverride[]): PersistedOverride[] | null {
  if (overrides.length === 0) {
    return [];
  }

  // Find root (no parent)
  let root: PersistedOverride | undefined;
  for (const ovr of overrides) {
    if (ovr.parentOverrideId === undefined) {
      root = ovr;
      break;
    }
  }

  if (root === undefined) {
    // No root found - invalid chain
    return null;
  }

  // Walk chain from root to leaf
  const chain: PersistedOverride[] = [];
  let current: PersistedOverride = root;
  const visited = new Set<string>();

  while (true) {
    if (visited.has(current.overrideId)) {
      // Cycle detected - invalid chain
      return null;
    }

    visited.add(current.overrideId);
    chain.push(current);

    // Find child
    let next: PersistedOverride | undefined;
    for (const ovr of overrides) {
      if (ovr.parentOverrideId === current.overrideId && !visited.has(ovr.overrideId)) {
        next = ovr;
        break;
      }
    }

    if (next === undefined) {
      break;
    }

    current = next;
  }

  // Verify all overrides are in chain (no orphans)
  if (chain.length !== overrides.length) {
    return null;
  }

  return chain;
}

/**
 * Get full invocation history view.
 *
 * Rules:
 * - Invocation must exist
 * - Overrides must form a valid chain
 * - Overrides returned in chain order
 * - Tombstones included verbatim
 * - No filtering
 */
export function getInvocationHistoryView(params: {
  invocation: PersistedInvocation | null;
  overrides: PersistedOverride[];
  tombstones: Tombstone[];
}):
  | { kind: 'view'; view: InvocationHistoryView }
  | { kind: 'violation'; violation: QueryViolation } {

  // Invocation must exist
  if (params.invocation === null) {
    return {
      kind: 'violation',
      violation: {
        code: QueryViolationCode.INVOCATION_NOT_FOUND,
        details: 'Invocation is null',
      },
    };
  }

  // Build ordered chain
  const orderedOverrides = buildOrderedChain(params.overrides);

  if (orderedOverrides === null) {
    return {
      kind: 'violation',
      violation: {
        code: QueryViolationCode.INVALID_OVERRIDE_CHAIN,
        details: 'Override chain is invalid (cycle, orphans, or missing root)',
      },
    };
  }

  return {
    kind: 'view',
    view: {
      invocation: params.invocation,
      overrides: orderedOverrides,
      tombstones: params.tombstones,
    },
  };
}

/**
 * Get effective invocation view.
 *
 * Rules:
 * - Invocation must exist
 * - Deterministically resolve last override
 * - hasOverrides must be correct
 * - Latest warning must be surfaced exactly
 * - No inference
 */
export function getEffectiveInvocationView(params: {
  invocation: PersistedInvocation | null;
  overrides: PersistedOverride[];
}):
  | { kind: 'view'; view: EffectiveInvocationView }
  | { kind: 'violation'; violation: QueryViolation } {

  // Invocation must exist
  if (params.invocation === null) {
    return {
      kind: 'violation',
      violation: {
        code: QueryViolationCode.INVOCATION_NOT_FOUND,
        details: 'Invocation is null',
      },
    };
  }

  // No overrides case
  if (params.overrides.length === 0) {
    return {
      kind: 'view',
      view: {
        effectiveInvocation: params.invocation,
        hasOverrides: false,
      },
    };
  }

  // Build ordered chain
  const orderedOverrides = buildOrderedChain(params.overrides);

  if (orderedOverrides === null) {
    return {
      kind: 'violation',
      violation: {
        code: QueryViolationCode.INVALID_OVERRIDE_CHAIN,
        details: 'Override chain is invalid (cycle, orphans, or missing root)',
      },
    };
  }

  // Get last override in chain
  const lastOverride = orderedOverrides[orderedOverrides.length - 1];

  return {
    kind: 'view',
    view: {
      effectiveInvocation: lastOverride.overriddenInvocation,
      hasOverrides: true,
      latestWarning: {
        severity: lastOverride.warning.severity,
        message: lastOverride.warning.message,
      },
    },
  };
}

/**
 * Get invocation summary view.
 *
 * Rules:
 * - Invocation must exist
 * - Summary reflects current state
 * - Latest override severity surfaced if overrides exist
 */
export function getInvocationSummaryView(params: {
  invocation: PersistedInvocation | null;
  overrides: PersistedOverride[];
}):
  | { kind: 'view'; view: InvocationSummaryView }
  | { kind: 'violation'; violation: QueryViolation } {

  // Invocation must exist
  if (params.invocation === null) {
    return {
      kind: 'violation',
      violation: {
        code: QueryViolationCode.INVOCATION_NOT_FOUND,
        details: 'Invocation is null',
      },
    };
  }

  const hasOverrides = params.overrides.length > 0;

  // No overrides case
  if (!hasOverrides) {
    return {
      kind: 'view',
      view: {
        invocationId: params.invocation.invocationId,
        intentType: params.invocation.intentType,
        rulesetId: params.invocation.rulesetId,
        hasOverrides: false,
      },
    };
  }

  // Build ordered chain to find latest
  const orderedOverrides = buildOrderedChain(params.overrides);

  if (orderedOverrides === null) {
    return {
      kind: 'violation',
      violation: {
        code: QueryViolationCode.INVALID_OVERRIDE_CHAIN,
        details: 'Override chain is invalid (cycle, orphans, or missing root)',
      },
    };
  }

  const lastOverride = orderedOverrides[orderedOverrides.length - 1];

  return {
    kind: 'view',
    view: {
      invocationId: params.invocation.invocationId,
      intentType: params.invocation.intentType,
      rulesetId: params.invocation.rulesetId,
      hasOverrides: true,
      latestOverrideSeverity: lastOverride.warning.severity,
    },
  };
}
