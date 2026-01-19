/**
 * Override DTO Contracts (FE-PR 0.1)
 *
 * CRITICAL: These types mirror backend DTOs EXACTLY.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 */

import type { RulesOutcome, ValidationReport } from './ValidationReport';

/**
 * OverrideWarning - GM warning attached to override
 */
export type OverrideWarning = {
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly message: string;
};

/**
 * OverrideScope - what can be overridden
 */
export type OverrideScope = 'OUTCOME';

/**
 * OverriddenOutcome - the GM's decision
 */
export type OverriddenOutcome = {
  readonly newOutcome: RulesOutcome;
  readonly selectedInterpretationCode?: string;
};

/**
 * GmOverride - a GM override decision
 */
export type GmOverride = {
  readonly overrideId: string;
  readonly parentOverrideId: string | null;
  readonly originalReport: ValidationReport;
  readonly overriddenOutcome: OverriddenOutcome;
  readonly scope: OverrideScope;
  readonly warning: OverrideWarning;
  readonly reason: string;
  readonly issuedBy: string;
  readonly issuedAt: number;
};

/**
 * EffectiveValidation - outcome after applying override chain
 */
export type EffectiveValidation = {
  readonly originalReport: ValidationReport;
  readonly effectiveOutcome: RulesOutcome;
  readonly hasOverrides: boolean;
  readonly latestWarning: OverrideWarning | null;
  readonly overrideCount: number;
};

/**
 * OverrideViolationCode - errors in override creation
 */
export type OverrideViolationCode =
  | 'EMPTY_REASON'
  | 'EMPTY_WARNING_MESSAGE'
  | 'INVALID_CHAIN'
  | 'SCOPE_NOT_ALLOWED'
  | 'CANNOT_OVERRIDE_ADAPTER_FAILURE'
  | 'MISSING_INTERPRETATION_CODE'
  | 'INVALID_INTERPRETATION_CODE'
  | 'OUTCOME_MISMATCH';

/**
 * OverrideViolation - error in override creation
 */
export type OverrideViolation = {
  readonly code: OverrideViolationCode;
  readonly details: string;
};

/**
 * OverrideResult - result of attempting to create an override
 */
export type OverrideResult =
  | { readonly kind: 'override'; readonly override: GmOverride }
  | { readonly kind: 'violation'; readonly violation: OverrideViolation };
