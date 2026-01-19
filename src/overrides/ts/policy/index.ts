/**
 * Override Policy Module Exports (PR 7.1)
 *
 * DANGER: This module introduces latent authority automation.
 *
 * CRITICAL INVARIANT: Convenience must remain visible and revocable.
 *
 * This module exports types and functions for override policy presets.
 * Policies are RECORDED GM HABITS, not system decisions.
 */

// Types
export type {
  OverridePolicyId,
  PolicyApplicabilityCriteria,
  PolicyDecision,
  OverridePolicy,
} from './types';

// Type factory
export { createOverridePolicyId, createOverridePolicy } from './types';

// Type guards
export {
  isPolicyApplicabilityCriteria,
  isPolicyDecision,
  isOverridePolicy,
} from './types';

// Application types
export type {
  PolicyApplicationMetadata,
  GmOverrideWithPolicyMetadata,
  PolicyApplicationRequest,
  PolicyApplicationResult,
  OverrideReversal,
} from './application';

// Application functions
export {
  applyPolicy,
  canReverseOverride,
  createOverrideReversal,
  isPolicyBasedOverride,
} from './application';
