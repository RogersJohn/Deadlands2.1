/**
 * Override Policy Types (PR 7.1)
 *
 * DANGER: This module introduces latent authority automation.
 *
 * CRITICAL INVARIANT: Convenience must remain visible and revocable.
 *
 * Policies are RECORDED GM HABITS, not system decisions.
 * Policies are TOOLS, not behavior.
 *
 * KILL CRITERIA (any violation fails PR 7.1):
 * - Silent application of a policy
 * - Implicit defaults
 * - Policies applied without explicit opt-in
 * - Policies not logged per application
 * - Policies that mutate validation results
 * - Policies that suppress conflicts
 * - Policies that auto-resolve ambiguity without trace
 * - Policies that cannot be individually reversed
 * - Policies that act without appearing in explanation graphs
 *
 * If a policy starts behaving like a rule, this module fails.
 */

import type {
  GmOverride,
  OverriddenOutcome,
  OverrideWarning,
  OverrideScope,
  ValidationReport,
} from '../types';

// ============================================================================
// POLICY IDENTIFIER TYPES
// ============================================================================

/**
 * Opaque identifier for policy presets - branded to prevent interchange
 */
declare const OVERRIDE_POLICY_ID_BRAND: unique symbol;
export type OverridePolicyId = string & { readonly [OVERRIDE_POLICY_ID_BRAND]: never };

/**
 * Create an OverridePolicyId from a string
 */
export function createOverridePolicyId(id: string): OverridePolicyId {
  return id as OverridePolicyId;
}

// ============================================================================
// POLICY APPLICABILITY CRITERIA (DATA ONLY)
// ============================================================================

/**
 * Policy applicability criteria - describes WHEN a policy COULD apply
 *
 * CRITICAL: This is DESCRIPTIVE, not ACTIVE.
 * - Criteria do NOT trigger automatic application
 * - Criteria do NOT watch for matching events
 * - Criteria are ONLY used for GM convenience (filtering/display)
 *
 * A policy matching these criteria is NOT applied.
 * The GM must EXPLICITLY invoke it.
 */
export type PolicyApplicabilityCriteria = {
  /**
   * If specified, policy is relevant to this rule ID
   *
   * This is a HINT for GM convenience, not a trigger.
   */
  readonly ruleId?: string;

  /**
   * If specified, policy is relevant to this conflict kind
   *
   * This is a HINT for GM convenience, not a trigger.
   */
  readonly conflictKind?: 'HardBlock' | 'SoftBlock' | 'Informational';

  /**
   * If specified, policy is relevant to this validation outcome
   *
   * This is a HINT for GM convenience, not a trigger.
   */
  readonly validationOutcome?: 'AMBIGUOUS' | 'FAIL';
};

// ============================================================================
// POLICY DECISION (DATA ONLY)
// ============================================================================

/**
 * The decision encoded in a policy - what the GM decided previously
 *
 * CRITICAL: This is a RECORDED decision, not a RULE.
 * - This decision was made by a GM at some point
 * - Applying the policy RE-APPLIES that human decision
 * - The system does not decide; it RECALLS
 */
export type PolicyDecision = {
  /**
   * The new outcome the GM wants to apply
   */
  readonly newOutcome: 'PASS' | 'FAIL';

  /**
   * If the original was AMBIGUOUS, which interpretation does this policy use?
   *
   * Must match a code in the original ambiguity's possibleInterpretations.
   * Only required when overriding AMBIGUOUS outcomes.
   */
  readonly selectedInterpretationCode?: string;

  /**
   * Warning to emit when this policy is applied
   *
   * MANDATORY: Policies are never silent.
   */
  readonly warning: OverrideWarning;

  /**
   * Default reason when applying this policy
   *
   * Can be overridden by GM at application time.
   */
  readonly defaultReason: string;
};

// ============================================================================
// OVERRIDE POLICY PRESET (DATA ONLY)
// ============================================================================

/**
 * Override Policy Preset - a recorded GM habit
 *
 * CRITICAL INVARIANTS:
 * - Policies are DATA, not LOGIC
 * - Policies do NOT execute themselves
 * - Policies do NOT watch events
 * - Policies do NOT trigger automatically
 * - Policies are applied ONLY on explicit GM invocation
 *
 * A policy is a "macro-recorded GM decision."
 * Invoking a policy is equivalent to the GM manually creating an override,
 * except the policy provides pre-filled values.
 */
export type OverridePolicy = {
  /**
   * Unique identifier for this policy
   */
  readonly id: OverridePolicyId;

  /**
   * Human-readable label for GM display
   *
   * Must clearly indicate this is a "GM Convenience Preset"
   */
  readonly label: string;

  /**
   * Description of what this policy does
   *
   * Must be understandable by the GM.
   */
  readonly description: string;

  /**
   * When this policy COULD be relevant (not when it applies)
   *
   * This is for GM convenience only - helps filter/display.
   */
  readonly appliesTo: PolicyApplicabilityCriteria;

  /**
   * The recorded decision to apply
   */
  readonly decision: PolicyDecision;

  /**
   * When this policy was created
   */
  readonly createdAt: number;

  /**
   * Who created this policy
   *
   * Policies are GM artifacts, not system artifacts.
   */
  readonly createdBy: string;
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for PolicyApplicabilityCriteria
 */
export function isPolicyApplicabilityCriteria(value: unknown): value is PolicyApplicabilityCriteria {
  if (typeof value !== 'object' || value === null) return false;
  const criteria = value as PolicyApplicabilityCriteria;

  // All fields are optional, but if present must be valid
  if (criteria.ruleId !== undefined && typeof criteria.ruleId !== 'string') return false;
  if (criteria.conflictKind !== undefined) {
    if (!['HardBlock', 'SoftBlock', 'Informational'].includes(criteria.conflictKind)) return false;
  }
  if (criteria.validationOutcome !== undefined) {
    if (!['AMBIGUOUS', 'FAIL'].includes(criteria.validationOutcome)) return false;
  }

  return true;
}

/**
 * Type guard for PolicyDecision
 */
export function isPolicyDecision(value: unknown): value is PolicyDecision {
  if (typeof value !== 'object' || value === null) return false;
  const decision = value as PolicyDecision;

  return (
    (decision.newOutcome === 'PASS' || decision.newOutcome === 'FAIL') &&
    typeof decision.warning === 'object' &&
    decision.warning !== null &&
    typeof decision.warning.severity === 'string' &&
    ['INFO', 'WARNING', 'CRITICAL'].includes(decision.warning.severity) &&
    typeof decision.warning.message === 'string' &&
    typeof decision.defaultReason === 'string'
  );
}

/**
 * Type guard for OverridePolicy
 */
export function isOverridePolicy(value: unknown): value is OverridePolicy {
  if (typeof value !== 'object' || value === null) return false;
  const policy = value as OverridePolicy;

  return (
    typeof policy.id === 'string' &&
    typeof policy.label === 'string' &&
    typeof policy.description === 'string' &&
    isPolicyApplicabilityCriteria(policy.appliesTo) &&
    isPolicyDecision(policy.decision) &&
    typeof policy.createdAt === 'number' &&
    typeof policy.createdBy === 'string'
  );
}

// ============================================================================
// FACTORY FUNCTION FOR POLICY CREATION (NO AUTO-REGISTRATION)
// ============================================================================

/**
 * Create an override policy preset
 *
 * CRITICAL: This ONLY creates the data structure.
 * - It does NOT register the policy anywhere
 * - It does NOT activate the policy
 * - It does NOT enable automatic application
 *
 * The returned policy is inert data.
 */
export function createOverridePolicy(params: {
  id: string;
  label: string;
  description: string;
  appliesTo: PolicyApplicabilityCriteria;
  decision: PolicyDecision;
  createdBy: string;
}): OverridePolicy {
  return {
    id: createOverridePolicyId(params.id),
    label: params.label,
    description: params.description,
    appliesTo: params.appliesTo,
    decision: params.decision,
    createdAt: Date.now(),
    createdBy: params.createdBy,
  };
}
