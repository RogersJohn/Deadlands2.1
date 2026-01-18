/**
 * GM Override Module (PR 2.0)
 *
 * Core principle: Rules speak first. Humans may disagree.
 * The system must remember both.
 *
 * This module implements ADR-0020 with PR 1.5 integration.
 * Overrides operate on ValidationReport, not RulesInvocationRequest.
 */

// ============================================================================
// PR 2.0 EXPORTS (Current)
// ============================================================================

// Types
export type {
  AmbiguityInterpretation,
  EffectiveValidation,
  GmId,
  GmOverride,
  LogicalTime,
  OverriddenOutcome,
  OverrideId,
  OverrideResult,
  OverrideViolation,
  OverrideWarning,
  RulesAmbiguity,
  RuleViolation,
  ValidationReport,
} from './types';

export {
  OverrideScope,
  OverrideViolationCode,
  RulesOutcome,
} from './types';

// Functions
export {
  createGmOverride,
  getEffectiveValidation,
  validateOverrideChain,
} from './GmOverride';

export type { CreateOverrideParams } from './GmOverride';

// ============================================================================
// LEGACY EXPORTS (Deprecated)
// ============================================================================

/**
 * @deprecated Use GmOverride instead
 */
export type { OverrideDecision, RulesInvocationRequest } from './types';

/**
 * @deprecated Use createGmOverride instead
 */
export { createOverrideDecision } from './OverrideDecision';

/**
 * @deprecated Use getEffectiveValidation instead
 */
export { getEffectiveInvocation } from './OverrideDecision';
