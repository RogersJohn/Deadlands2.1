/**
 * Persistence Orchestration Functions
 *
 * Pure, storage-agnostic functions that enforce persistence invariants.
 * No database references. No filesystem APIs. No caching.
 */

import { InvocationStore, OverrideStore } from './stores';
import {
  PersistedInvocation,
  PersistedOverride,
  PersistenceViolation,
  PersistenceViolationCode,
} from './types';

/**
 * Persist an invocation to storage.
 *
 * Invariants:
 * - Exactly one invocation per invocationId
 * - Duplicate writes → violation
 * - No mutation
 */
export function persistInvocation(
  store: InvocationStore,
  invocation: PersistedInvocation
): { kind: 'ok' } | { kind: 'violation'; violation: PersistenceViolation } {

  // Check for duplicate
  const existing = store.readInvocation(invocation.invocationId);
  if (existing.kind === 'found') {
    return {
      kind: 'violation',
      violation: {
        code: PersistenceViolationCode.DUPLICATE_INVOCATION,
        details: `Invocation ${invocation.invocationId} already exists`,
      },
    };
  }

  // Delegate to store
  return store.writeInvocation(invocation);
}

/**
 * Persist an override to storage.
 *
 * Invariants:
 * - Target invocation must exist
 * - Parent override (if any) must exist
 * - Chain must be linear
 * - Duplicate overrideId → violation
 */
export function persistOverride(
  invocationStore: InvocationStore,
  overrideStore: OverrideStore,
  override: PersistedOverride
): { kind: 'ok' } | { kind: 'violation'; violation: PersistenceViolation } {

  // Check invocation exists
  const invocationResult = invocationStore.readInvocation(override.targetInvocationId);
  if (invocationResult.kind === 'not_found') {
    return {
      kind: 'violation',
      violation: {
        code: PersistenceViolationCode.INVOCATION_NOT_FOUND,
        details: `Target invocation ${override.targetInvocationId} does not exist`,
      },
    };
  }

  // Check parent override exists (if specified)
  if (override.parentOverrideId !== undefined) {
    const existingOverrides = overrideStore.readOverridesForInvocation(override.targetInvocationId);
    const parentExists = existingOverrides.some(
      (o) => o.overrideId === override.parentOverrideId
    );

    if (!parentExists) {
      return {
        kind: 'violation',
        violation: {
          code: PersistenceViolationCode.MISSING_PARENT_OVERRIDE,
          details: `Parent override ${override.parentOverrideId} does not exist`,
        },
      };
    }
  }

  // Check for duplicate override
  const existingOverrides = overrideStore.readOverridesForInvocation(override.targetInvocationId);
  const duplicateExists = existingOverrides.some(
    (o) => o.overrideId === override.overrideId
  );

  if (duplicateExists) {
    return {
      kind: 'violation',
      violation: {
        code: PersistenceViolationCode.DUPLICATE_OVERRIDE,
        details: `Override ${override.overrideId} already exists`,
      },
    };
  }

  // Validate chain is linear (no branching)
  if (override.parentOverrideId === undefined) {
    // This is a root override - check no other root exists
    const hasExistingRoot = existingOverrides.some(
      (o) => o.parentOverrideId === undefined
    );

    if (hasExistingRoot) {
      return {
        kind: 'violation',
        violation: {
          code: PersistenceViolationCode.INVALID_OVERRIDE_CHAIN,
          details: 'Override chain already has a root; cannot add another root override',
        },
      };
    }
  } else {
    // This is a child override - check parent is the current leaf
    const parentOverride = existingOverrides.find(
      (o) => o.overrideId === override.parentOverrideId
    );

    if (parentOverride !== undefined) {
      const parentHasChild = existingOverrides.some(
        (o) => o.parentOverrideId === parentOverride.overrideId
      );

      if (parentHasChild) {
        return {
          kind: 'violation',
          violation: {
            code: PersistenceViolationCode.INVALID_OVERRIDE_CHAIN,
            details: `Parent override ${override.parentOverrideId} already has a child; chain would branch`,
          },
        };
      }
    }
  }

  // Delegate to store
  return overrideStore.writeOverride(override);
}

/**
 * Resolve effective invocation from persisted data.
 *
 * Invariants:
 * - Must reconstruct chain via parentOverrideId
 * - Must not rely on array order
 * - Deterministic
 * - No mutation
 */
export function resolveEffectiveInvocationFromPersistence(
  invocation: PersistedInvocation,
  overrides: PersistedOverride[]
): {
  effectiveInvocation: PersistedInvocation | PersistedOverride['overriddenInvocation'];
  overrideChain: PersistedOverride[];
} {

  if (overrides.length === 0) {
    return {
      effectiveInvocation: invocation,
      overrideChain: [],
    };
  }

  // Find root override (no parent)
  let root: PersistedOverride | undefined;
  for (const ovr of overrides) {
    if (ovr.parentOverrideId === undefined) {
      root = ovr;
      break;
    }
  }

  // No root found - return original invocation
  if (root === undefined) {
    return {
      effectiveInvocation: invocation,
      overrideChain: [],
    };
  }

  // Build ordered chain from root to leaf
  const chain: PersistedOverride[] = [];
  let current: PersistedOverride = root;
  const visited = new Set<string>();

  while (true) {
    if (visited.has(current.overrideId)) {
      // Cycle detected - stop
      break;
    }

    visited.add(current.overrideId);
    chain.push(current);

    // Find child that has current as parent
    let next: PersistedOverride | undefined;
    for (const ovr of overrides) {
      if (ovr.parentOverrideId === current.overrideId && !visited.has(ovr.overrideId)) {
        next = ovr;
        break;
      }
    }

    if (next === undefined) {
      // current is the leaf
      break;
    }

    current = next;
  }

  // Effective invocation is the overriddenInvocation of the last override in chain
  const lastOverride = chain[chain.length - 1];

  return {
    effectiveInvocation: lastOverride.overriddenInvocation,
    overrideChain: chain,
  };
}
