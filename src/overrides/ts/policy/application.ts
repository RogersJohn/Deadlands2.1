/**
 * Policy Application (PR 7.1)
 *
 * DANGER: This module handles policy invocation.
 *
 * CRITICAL INVARIANT: NO AUTO-APPLICATION.
 *
 * Policies are applied ONLY when:
 * 1. The GM explicitly selects the policy
 * 2. The GM explicitly confirms application
 *
 * There is NO background application, even if a match exists.
 * Policies do NOT watch events.
 * Policies do NOT subscribe to validation.
 * Policies do NOT trigger automatically.
 *
 * KILL CRITERIA (any violation fails PR 7.1):
 * - Any automatic application
 * - Any background evaluation
 * - Any policy-as-rule behavior
 */

import type {
  GmOverride,
  GmId,
  OverrideId,
  ValidationReport,
  OverrideViolation,
  OverrideResult,
} from '../types';
import { OverrideScope, OverrideViolationCode, RulesOutcome } from '../types';
import type { OverridePolicy, OverridePolicyId } from './types';

// ============================================================================
// POLICY APPLICATION METADATA
// ============================================================================

/**
 * Metadata recording that this override came from a policy
 *
 * This is the ONLY difference between a policy-based override
 * and a manual override. The outcome is identical.
 */
export type PolicyApplicationMetadata = {
  /**
   * The policy that was applied
   */
  readonly policyId: OverridePolicyId;

  /**
   * When the policy was applied
   *
   * This is distinct from when the policy was created.
   */
  readonly appliedAt: number;

  /**
   * Explicit confirmation that this was an explicit application
   *
   * This field exists to prove the application was deliberate.
   * It must always be true. A false value would indicate automation.
   */
  readonly explicitlyInvoked: true;
};

// ============================================================================
// EXTENDED GM OVERRIDE (WITH POLICY METADATA)
// ============================================================================

/**
 * GM Override with optional policy metadata
 *
 * CRITICAL: This extends GmOverride without changing its behavior.
 * - A policy-based override behaves IDENTICALLY to a manual override
 * - The only difference is metadata tracking
 * - The metadata exists for auditability, not behavior
 */
export type GmOverrideWithPolicyMetadata = GmOverride & {
  /**
   * If this override was applied via a policy, this records which one
   *
   * undefined means this was a manual override (no policy involved)
   */
  readonly policyMetadata?: PolicyApplicationMetadata;
};

// ============================================================================
// POLICY APPLICATION REQUEST
// ============================================================================

/**
 * Request to apply a policy
 *
 * CRITICAL: This request must be created by the GM.
 * There is no system component that creates these requests.
 */
export type PolicyApplicationRequest = {
  /**
   * The policy to apply
   */
  readonly policy: OverridePolicy;

  /**
   * The validation report to override
   */
  readonly targetReport: ValidationReport;

  /**
   * The GM applying the policy
   */
  readonly appliedBy: GmId;

  /**
   * Optional reason override (if GM wants to customize the policy's default reason)
   */
  readonly reasonOverride?: string;

  /**
   * Parent override ID if chaining overrides
   */
  readonly parentOverrideId?: OverrideId | null;
};

// ============================================================================
// POLICY APPLICATION RESULT
// ============================================================================

/**
 * Result of attempting to apply a policy
 */
export type PolicyApplicationResult =
  | { readonly kind: 'override'; readonly override: GmOverrideWithPolicyMetadata }
  | { readonly kind: 'violation'; readonly violation: OverrideViolation };

// ============================================================================
// POLICY APPLICATION FUNCTION (EXPLICIT INVOCATION ONLY)
// ============================================================================

/**
 * Apply a policy to create an override
 *
 * CRITICAL INVARIANTS:
 * - This function is ONLY called on explicit GM request
 * - This function does NOT decide when to run
 * - This function does NOT watch for matching scenarios
 * - This function does NOT auto-apply anything
 *
 * The caller (UI or API handler) is responsible for:
 * 1. Presenting the policy to the GM
 * 2. Getting explicit confirmation
 * 3. Calling this function
 *
 * This function has NO side effects:
 * - It does NOT persist the override
 * - It does NOT update state
 * - It ONLY creates the override data structure
 *
 * Persistence is handled by the caller after receiving the result.
 */
export function applyPolicy(
  request: PolicyApplicationRequest,
  generateOverrideId: () => OverrideId
): PolicyApplicationResult {
  const { policy, targetReport, appliedBy, reasonOverride, parentOverrideId } = request;

  // Validate: reason must be non-empty
  const reason = reasonOverride ?? policy.decision.defaultReason;
  if (!reason || reason.trim() === '') {
    return {
      kind: 'violation',
      violation: {
        code: OverrideViolationCode.EMPTY_REASON,
        details: 'Policy reason is empty and no override reason was provided',
      },
    };
  }

  // Validate: warning message must be non-empty
  if (!policy.decision.warning.message || policy.decision.warning.message.trim() === '') {
    return {
      kind: 'violation',
      violation: {
        code: OverrideViolationCode.EMPTY_WARNING_MESSAGE,
        details: 'Policy warning message is empty',
      },
    };
  }

  // Validate: if overriding AMBIGUOUS, must have interpretation code
  if (targetReport.outcome === RulesOutcome.AMBIGUOUS) {
    if (!policy.decision.selectedInterpretationCode) {
      return {
        kind: 'violation',
        violation: {
          code: OverrideViolationCode.MISSING_INTERPRETATION_CODE,
          details: 'Policy does not specify interpretation code for AMBIGUOUS outcome',
        },
      };
    }

    // Validate: interpretation code must match one in the ambiguity
    if (targetReport.ambiguity) {
      const validCodes = targetReport.ambiguity.possibleInterpretations.map(i => i.code);
      if (!validCodes.includes(policy.decision.selectedInterpretationCode)) {
        return {
          kind: 'violation',
          violation: {
            code: OverrideViolationCode.INVALID_INTERPRETATION_CODE,
            details: `Policy interpretation code '${policy.decision.selectedInterpretationCode}' does not match any declared interpretation`,
          },
        };
      }

      // Validate: newOutcome must match the interpretation's resultingOutcome
      const matchingInterpretation = targetReport.ambiguity.possibleInterpretations.find(
        i => i.code === policy.decision.selectedInterpretationCode
      );
      if (matchingInterpretation) {
        const expectedOutcome = matchingInterpretation.resultingOutcome;
        const policyOutcome = policy.decision.newOutcome === 'PASS'
          ? RulesOutcome.PASS
          : RulesOutcome.FAIL;

        if (policyOutcome !== expectedOutcome) {
          return {
            kind: 'violation',
            violation: {
              code: OverrideViolationCode.OUTCOME_MISMATCH,
              details: `Policy newOutcome '${policy.decision.newOutcome}' does not match interpretation's resultingOutcome '${expectedOutcome}'`,
            },
          };
        }
      }
    }
  }

  // Create the override (identical to manual override, plus metadata)
  const override: GmOverrideWithPolicyMetadata = {
    overrideId: generateOverrideId(),
    parentOverrideId: parentOverrideId ?? null,
    originalReport: targetReport,
    overriddenOutcome: {
      newOutcome: policy.decision.newOutcome === 'PASS' ? RulesOutcome.PASS : RulesOutcome.FAIL,
      selectedInterpretationCode: policy.decision.selectedInterpretationCode,
    },
    scope: OverrideScope.OUTCOME,
    warning: policy.decision.warning,
    reason,
    issuedBy: appliedBy,
    issuedAt: Date.now(),

    // Policy metadata - the ONLY difference from manual override
    policyMetadata: {
      policyId: policy.id,
      appliedAt: Date.now(),
      explicitlyInvoked: true,
    },
  };

  return { kind: 'override', override };
}

// ============================================================================
// POLICY REVERSAL FUNCTIONS
// ============================================================================

/**
 * Check if an override can be reversed
 *
 * CRITICAL: Every policy-based override must be individually reversible.
 *
 * This function checks if reversal is possible.
 * The actual reversal is handled by the persistence layer.
 */
export function canReverseOverride(override: GmOverrideWithPolicyMetadata): boolean {
  // All overrides (policy-based or manual) can be reversed
  // Reversal is always possible - it's a matter of recording the reversal
  return true;
}

/**
 * Create a reversal record for an override
 *
 * CRITICAL: This does NOT mutate the override.
 * Reversal is recorded as a new entry, not a deletion.
 *
 * The original override remains in the audit log.
 * The reversal entry indicates when and why it was reversed.
 */
export type OverrideReversal = {
  /**
   * The override being reversed
   */
  readonly reversedOverrideId: OverrideId;

  /**
   * If the reversed override was policy-based, which policy
   */
  readonly reversedPolicyId?: OverridePolicyId;

  /**
   * When the reversal occurred
   */
  readonly reversedAt: number;

  /**
   * Who performed the reversal
   */
  readonly reversedBy: GmId;

  /**
   * Reason for reversal
   */
  readonly reversalReason: string;
};

/**
 * Create an override reversal record
 *
 * CRITICAL: This ONLY creates the data structure.
 * Persistence is handled by the caller.
 */
export function createOverrideReversal(params: {
  override: GmOverrideWithPolicyMetadata;
  reversedBy: GmId;
  reason: string;
}): OverrideReversal {
  return {
    reversedOverrideId: params.override.overrideId,
    reversedPolicyId: params.override.policyMetadata?.policyId,
    reversedAt: Date.now(),
    reversedBy: params.reversedBy,
    reversalReason: params.reason,
  };
}

// ============================================================================
// TYPE GUARD FOR POLICY-BASED OVERRIDE
// ============================================================================

/**
 * Check if an override was created via a policy
 */
export function isPolicyBasedOverride(
  override: GmOverride | GmOverrideWithPolicyMetadata
): override is GmOverrideWithPolicyMetadata {
  return 'policyMetadata' in override && override.policyMetadata !== undefined;
}
