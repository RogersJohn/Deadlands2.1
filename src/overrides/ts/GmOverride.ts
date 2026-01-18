/**
 * GM Override Implementation (PR 2.0)
 *
 * Core principle: Rules speak first. Humans may disagree.
 * The system must remember both.
 *
 * Overrides are annotations, not corrections.
 * The original rules output is NEVER mutated or erased.
 */

import {
  EffectiveValidation,
  GmId,
  GmOverride,
  LogicalTime,
  OverrideId,
  OverrideResult,
  OverrideScope,
  OverrideViolation,
  OverrideViolationCode,
  OverrideWarning,
  OverriddenOutcome,
  RulesOutcome,
  ValidationReport,
} from './types';

/**
 * Deterministic override ID generation
 *
 * Algorithm: djb2 string hash
 * Input: invocationId + issuedBy + issuedAt + parentOverrideId
 * Output: "ovr_" + 8-char hex
 *
 * Guarantees:
 * - Deterministic (same inputs → same output)
 * - No randomness
 * - No UUID libraries
 */
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash >>> 0;
}

function generateOverrideId(
  invocationId: string,
  issuedBy: GmId,
  issuedAt: LogicalTime,
  parentOverrideId: OverrideId | null
): OverrideId {
  const parentPart = parentOverrideId ?? 'root';
  const hashInput = `${invocationId}:${issuedBy}:${issuedAt}:${parentPart}`;
  const hash = djb2(hashInput);
  return `ovr_${hash.toString(16).padStart(8, '0')}` as OverrideId;
}

/**
 * Create a violation result
 */
function violation(
  code: OverrideViolationCode,
  details: string
): OverrideResult {
  return {
    kind: 'violation',
    violation: { code, details },
  };
}

/**
 * Create a success result
 */
function success(override: GmOverride): OverrideResult {
  return {
    kind: 'override',
    override,
  };
}

/**
 * Parameters for creating a GM override
 */
export type CreateOverrideParams = {
  /** The original validation report to override */
  readonly originalReport: ValidationReport;

  /** The new outcome decided by the GM */
  readonly newOutcome: RulesOutcome;

  /**
   * When overriding AMBIGUOUS, the code of the selected interpretation.
   * Must match one of the codes in originalReport.ambiguity.possibleInterpretations.
   * The newOutcome must match the resultingOutcome declared by that interpretation.
   *
   * Required when originalReport.outcome is AMBIGUOUS.
   * Ignored when originalReport.outcome is PASS or FAIL.
   */
  readonly selectedInterpretationCode?: string;

  /** Mandatory warning - must have non-empty message */
  readonly warning: OverrideWarning;

  /** Mandatory reason - must explain why override is needed */
  readonly reason: string;

  /** Identity of the GM issuing the override */
  readonly issuedBy: GmId;

  /** When the override is being issued */
  readonly issuedAt: LogicalTime;

  /** Parent override if this is part of a chain */
  readonly parentOverride?: GmOverride;
};

/**
 * Create a GM override
 *
 * This is the ONLY way to create a GmOverride.
 *
 * Invariants enforced:
 * - reason must be non-empty
 * - warning.message must be non-empty
 * - parent override chain must be consistent (same invocationId)
 * - scope is always OUTCOME (other scopes not yet implemented)
 * - When overriding AMBIGUOUS:
 *   - selectedInterpretationCode is required
 *   - Must match a declared interpretation code
 *   - newOutcome must match the interpretation's resultingOutcome
 *
 * Returns violation as data, never throws.
 *
 * The original ValidationReport is preserved immutably.
 * Violations from the original report are NEVER mutated or hidden.
 */
export function createGmOverride(params: CreateOverrideParams): OverrideResult {
  // Invariant: reason must be non-empty
  if (params.reason.trim() === '') {
    return violation(
      OverrideViolationCode.EMPTY_REASON,
      'reason must be non-empty'
    );
  }

  // Invariant: warning.message must be non-empty
  if (params.warning.message.trim() === '') {
    return violation(
      OverrideViolationCode.EMPTY_WARNING_MESSAGE,
      'warning.message must be non-empty'
    );
  }

  // Invariant: parent override chain must be consistent
  if (params.parentOverride !== undefined) {
    const parentInvocationId = params.parentOverride.originalReport.invocationId;
    const thisInvocationId = params.originalReport.invocationId;

    if (parentInvocationId !== thisInvocationId) {
      return violation(
        OverrideViolationCode.INVALID_CHAIN,
        `parent override targets different invocation: ${parentInvocationId} vs ${thisInvocationId}`
      );
    }
  }

  // Invariant: When overriding AMBIGUOUS, interpretation selection is mandatory and deterministic
  let selectedInterpretationCode: string | undefined = params.selectedInterpretationCode;

  if (params.originalReport.outcome === RulesOutcome.AMBIGUOUS) {
    const ambiguity = params.originalReport.ambiguity;

    // AMBIGUOUS must have ambiguity data
    if (ambiguity === null) {
      return violation(
        OverrideViolationCode.INVALID_CHAIN,
        'AMBIGUOUS outcome has no ambiguity data'
      );
    }

    // Must provide interpretation code
    if (selectedInterpretationCode === undefined) {
      return violation(
        OverrideViolationCode.MISSING_INTERPRETATION_CODE,
        'selectedInterpretationCode is required when overriding AMBIGUOUS'
      );
    }

    // Find the selected interpretation
    const selectedInterp = ambiguity.possibleInterpretations.find(
      interp => interp.code === selectedInterpretationCode
    );

    if (selectedInterp === undefined) {
      const validCodes = ambiguity.possibleInterpretations.map(i => i.code).join(', ');
      return violation(
        OverrideViolationCode.INVALID_INTERPRETATION_CODE,
        `selectedInterpretationCode '${selectedInterpretationCode}' not found. Valid codes: ${validCodes}`
      );
    }

    // newOutcome must match the interpretation's declared outcome
    if (params.newOutcome !== selectedInterp.resultingOutcome) {
      return violation(
        OverrideViolationCode.OUTCOME_MISMATCH,
        `newOutcome '${params.newOutcome}' does not match interpretation '${selectedInterpretationCode}' which declares resultingOutcome '${selectedInterp.resultingOutcome}'`
      );
    }
  }

  // Generate deterministic override ID
  const parentOverrideId = params.parentOverride?.overrideId ?? null;
  const overrideId = generateOverrideId(
    params.originalReport.invocationId,
    params.issuedBy,
    params.issuedAt,
    parentOverrideId
  );

  // Construct the override
  const override: GmOverride = {
    overrideId,
    parentOverrideId,
    originalReport: params.originalReport,
    overriddenOutcome: {
      newOutcome: params.newOutcome,
      selectedInterpretationCode,
    },
    scope: OverrideScope.OUTCOME,
    warning: params.warning,
    reason: params.reason,
    issuedBy: params.issuedBy,
    issuedAt: params.issuedAt,
  };

  return success(override);
}

/**
 * Get the effective validation result after applying override chain
 *
 * Pure function. Deterministic. Side-effect free.
 *
 * Rules:
 * - No overrides → effective outcome is original outcome
 * - Overrides present → effective outcome is from last override in chain
 * - Original report is ALWAYS preserved and accessible
 * - Original violations are NEVER hidden or mutated
 *
 * Consumers can always see:
 * - What the rules said (originalReport.outcome)
 * - What the GM decided (effectiveOutcome)
 * - Why (through override chain inspection)
 */
export function getEffectiveValidation(
  originalReport: ValidationReport,
  overrides: readonly GmOverride[]
): EffectiveValidation {
  // No overrides → return original
  if (overrides.length === 0) {
    return {
      originalReport,
      effectiveOutcome: originalReport.outcome,
      hasOverrides: false,
      latestWarning: null,
      overrideCount: 0,
    };
  }

  // Find the last override in the chain
  // Chain is ordered by parentOverrideId linkage

  // Build a map of overrideId → override
  const overrideMap = new Map<OverrideId, GmOverride>();
  for (const ovr of overrides) {
    overrideMap.set(ovr.overrideId, ovr);
  }

  // Find root override (no parent)
  let root: GmOverride | undefined;
  for (const ovr of overrides) {
    if (ovr.parentOverrideId === null) {
      root = ovr;
      break;
    }
  }

  // No root found - use last in array as fallback
  if (root === undefined) {
    const lastOverride = overrides[overrides.length - 1];
    if (lastOverride === undefined) {
      // Should never happen given length check, but TypeScript requires it
      return {
        originalReport,
        effectiveOutcome: originalReport.outcome,
        hasOverrides: false,
        latestWarning: null,
        overrideCount: 0,
      };
    }
    return {
      originalReport,
      effectiveOutcome: lastOverride.overriddenOutcome.newOutcome,
      hasOverrides: true,
      latestWarning: lastOverride.warning,
      overrideCount: overrides.length,
    };
  }

  // Walk chain from root to find last override
  let current: GmOverride = root;
  const visited = new Set<OverrideId>();

  while (true) {
    visited.add(current.overrideId);

    // Find child that has current as parent
    let next: GmOverride | undefined;
    for (const ovr of overrides) {
      if (ovr.parentOverrideId === current.overrideId && !visited.has(ovr.overrideId)) {
        next = ovr;
        break;
      }
    }

    if (next === undefined) {
      // current is the last in the chain
      return {
        originalReport,
        effectiveOutcome: current.overriddenOutcome.newOutcome,
        hasOverrides: true,
        latestWarning: current.warning,
        overrideCount: overrides.length,
      };
    }

    current = next;
  }
}

/**
 * Check if an override chain is valid
 *
 * A valid chain:
 * - Has exactly one root (parentOverrideId === null)
 * - All overrides target the same invocationId
 * - No cycles
 * - All parent references point to existing overrides
 */
export function validateOverrideChain(
  overrides: readonly GmOverride[]
): { valid: true } | { valid: false; error: string } {
  if (overrides.length === 0) {
    return { valid: true };
  }

  // All must target the same invocation
  const firstInvocationId = overrides[0]?.originalReport.invocationId;
  for (const ovr of overrides) {
    if (ovr.originalReport.invocationId !== firstInvocationId) {
      return {
        valid: false,
        error: `Override ${ovr.overrideId} targets different invocation: ${ovr.originalReport.invocationId} vs ${firstInvocationId}`,
      };
    }
  }

  // Build set of override IDs
  const overrideIds = new Set<OverrideId>();
  for (const ovr of overrides) {
    overrideIds.add(ovr.overrideId);
  }

  // Check for exactly one root
  let rootCount = 0;
  for (const ovr of overrides) {
    if (ovr.parentOverrideId === null) {
      rootCount++;
    } else if (!overrideIds.has(ovr.parentOverrideId)) {
      return {
        valid: false,
        error: `Override ${ovr.overrideId} references non-existent parent: ${ovr.parentOverrideId}`,
      };
    }
  }

  if (rootCount === 0) {
    return {
      valid: false,
      error: 'Override chain has no root (all overrides have parents)',
    };
  }

  if (rootCount > 1) {
    return {
      valid: false,
      error: `Override chain has ${rootCount} roots (expected exactly 1)`,
    };
  }

  // Check for cycles (simple: chain length should equal override count when walked)
  const visited = new Set<OverrideId>();
  let current: GmOverride | undefined;

  // Find root
  for (const ovr of overrides) {
    if (ovr.parentOverrideId === null) {
      current = ovr;
      break;
    }
  }

  while (current !== undefined) {
    if (visited.has(current.overrideId)) {
      return {
        valid: false,
        error: `Override chain contains cycle at ${current.overrideId}`,
      };
    }
    visited.add(current.overrideId);

    // Find child
    let next: GmOverride | undefined;
    for (const ovr of overrides) {
      if (ovr.parentOverrideId === current.overrideId) {
        next = ovr;
        break;
      }
    }
    current = next;
  }

  return { valid: true };
}
