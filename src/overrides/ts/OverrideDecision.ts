/**
 * GM Override Implementation
 *
 * Implements ADR-0020 exactly.
 * Overrides are explicit data, not implicit behavior.
 */

import {
  GmId,
  LogicalTime,
  OverrideDecision,
  OverrideId,
  OverrideViolation,
  OverrideViolationCode,
  OverrideWarning,
  RulesInvocationRequest,
} from './types';

/**
 * Deterministic override ID generation
 * Algorithm: djb2 string hash
 * Input: targetInvocationId + issuedBy + issuedAt
 * Output: "ovr_" + 8-char hex
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash >>> 0;
}

/**
 * Create an override decision.
 *
 * Invariants enforced (per ADR-0020):
 * - reason must be non-empty
 * - warning.message must be non-empty
 * - invocationId must not be modified by override
 * - parentOverride chain must be linear and consistent
 *
 * Returns violation as data, never throws.
 */
export function createOverrideDecision(params: {
  parentOverride?: OverrideDecision;
  originalInvocation: RulesInvocationRequest;
  overriddenInvocation: RulesInvocationRequest;
  warning: OverrideWarning;
  reason: string;
  issuedBy: GmId;
  issuedAt: LogicalTime;
}): { kind: 'override'; override: OverrideDecision } | { kind: 'violation'; violation: OverrideViolation } {

  // Invariant: reason must be non-empty
  if (params.reason.trim() === '') {
    return {
      kind: 'violation',
      violation: {
        code: OverrideViolationCode.EMPTY_REASON,
        details: 'reason must be non-empty',
      },
    };
  }

  // Invariant: warning.message must be non-empty
  if (params.warning.message.trim() === '') {
    return {
      kind: 'violation',
      violation: {
        code: OverrideViolationCode.EMPTY_WARNING_MESSAGE,
        details: 'warning.message must be non-empty',
      },
    };
  }

  // Invariant: invocationId must not be modified
  if (params.originalInvocation.invocationId !== params.overriddenInvocation.invocationId) {
    return {
      kind: 'violation',
      violation: {
        code: OverrideViolationCode.INVOCATION_ID_MISMATCH,
        details: `invocationId cannot be changed: ${params.originalInvocation.invocationId} → ${params.overriddenInvocation.invocationId}`,
      },
    };
  }

  // Invariant: chain must be linear and consistent
  if (params.parentOverride !== undefined) {
    const parentTargetsCorrectInvocation =
      params.parentOverride.targetInvocationId === params.originalInvocation.invocationId;

    const originalInvocationMatchesParent =
      params.parentOverride.originalInvocation.invocationId === params.originalInvocation.invocationId &&
      params.parentOverride.originalInvocation.sourceIntentId === params.originalInvocation.sourceIntentId &&
      params.parentOverride.originalInvocation.intentType === params.originalInvocation.intentType &&
      params.parentOverride.originalInvocation.rulesetId === params.originalInvocation.rulesetId &&
      JSON.stringify(params.parentOverride.originalInvocation.payload) === JSON.stringify(params.originalInvocation.payload);

    if (!parentTargetsCorrectInvocation || !originalInvocationMatchesParent) {
      return {
        kind: 'violation',
        violation: {
          code: OverrideViolationCode.INVALID_CHAIN,
          details: 'parentOverride chain is inconsistent with originalInvocation',
        },
      };
    }
  }

  // Generate deterministic override ID
  const hashInput = `${params.originalInvocation.invocationId}:${params.issuedBy}:${params.issuedAt}`;
  const hash = djb2(hashInput);
  const overrideId: OverrideId = `ovr_${hash.toString(16).padStart(8, '0')}`;

  const decision: OverrideDecision = {
    overrideId,
    parentOverrideId: params.parentOverride?.overrideId,
    targetInvocationId: params.originalInvocation.invocationId,
    originalInvocation: params.originalInvocation,
    overriddenInvocation: params.overriddenInvocation,
    warning: params.warning,
    reason: params.reason,
    issuedBy: params.issuedBy,
    issuedAt: params.issuedAt,
  };

  return { kind: 'override', override: decision };
}

/**
 * Resolve the effective invocation from an override chain.
 *
 * Pure function. Deterministic. Side-effect free.
 *
 * Rules:
 * - No overrides → return originalInvocation
 * - Overrides present → return overriddenInvocation of last override in chain
 * - Chain order determined by parentOverrideId linkage, not array order
 */
export function getEffectiveInvocation(
  originalInvocation: RulesInvocationRequest,
  overrides: OverrideDecision[]
): RulesInvocationRequest {
  if (overrides.length === 0) {
    return originalInvocation;
  }

  // Find root override (no parent)
  let root: OverrideDecision | undefined;
  for (const ovr of overrides) {
    if (ovr.parentOverrideId === undefined) {
      root = ovr;
      break;
    }
  }

  // No root found - fallback to last in array
  if (root === undefined) {
    return overrides[overrides.length - 1].overriddenInvocation;
  }

  // Walk chain from root to find last override
  let current: OverrideDecision = root;
  const visited = new Set<OverrideId>();

  while (true) {
    visited.add(current.overrideId);

    // Find child that has current as parent
    let next: OverrideDecision | undefined;
    for (const ovr of overrides) {
      if (ovr.parentOverrideId === current.overrideId && !visited.has(ovr.overrideId)) {
        next = ovr;
        break;
      }
    }

    if (next === undefined) {
      return current.overriddenInvocation;
    }

    current = next;
  }
}
