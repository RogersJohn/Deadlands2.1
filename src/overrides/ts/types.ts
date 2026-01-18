/**
 * GM Override Types (PR 2.0)
 *
 * Implements ADR-0020 with PR 1.5 integration.
 * Overrides operate on ValidationReport, not RulesInvocationRequest.
 *
 * Core principle: Rules speak first. Humans may disagree.
 * The system must remember both.
 */

// Branded identifier types
declare const OVERRIDE_ID_BRAND: unique symbol;
declare const GM_ID_BRAND: unique symbol;

export type OverrideId = string & { readonly [OVERRIDE_ID_BRAND]: never };
export type GmId = string & { readonly [GM_ID_BRAND]: never };
export type LogicalTime = number;

/**
 * Rules outcome - must match PR 1.5 RulesOutcome
 */
export enum RulesOutcome {
  PASS = 'PASS',
  FAIL = 'FAIL',
  AMBIGUOUS = 'AMBIGUOUS',
}

/**
 * Rule violation from rules pipeline - immutable, never modified by override
 */
export type RuleViolation = {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
};

/**
 * Structured ambiguity interpretation
 *
 * Each interpretation declares:
 * - A machine-readable code for GM selection
 * - The resulting outcome if this interpretation is chosen
 * - A human-readable description
 */
export type AmbiguityInterpretation = {
  readonly code: string;
  readonly resultingOutcome: RulesOutcome.PASS | RulesOutcome.FAIL;
  readonly description: string;
};

/**
 * Rules ambiguity marker - immutable, never modified by override
 *
 * When outcome is AMBIGUOUS, this provides structured interpretations
 * that the GM can select from. Each interpretation has an explicit
 * resulting outcome, making override resolution deterministic.
 */
export type RulesAmbiguity = {
  readonly reason: string;
  readonly possibleInterpretations: readonly AmbiguityInterpretation[];
};

/**
 * ValidationReport from PR 1.5 - the target of overrides
 *
 * This type is imported conceptually; in practice, we define it here
 * for the override module's use. Must stay in sync with PR 1.5.
 */
export type ValidationReport = {
  readonly invocationId: string;
  readonly sourceIntentId: string;
  readonly intentType: string;
  readonly rulesetId: string;
  readonly outcome: RulesOutcome;
  readonly violations: readonly RuleViolation[];
  readonly ambiguity: RulesAmbiguity | null;
  readonly payload: unknown;
};

/**
 * Override warning - mandatory, never silent
 *
 * Severity levels per ADR-0020:
 * - INFO: Minor adjustment, cosmetic or narrative
 * - WARNING: Significant deviation from rules-as-written
 * - CRITICAL: Major override with gameplay consequences
 */
export type OverrideWarning = {
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly message: string;
};

/**
 * Override scope - what can be overridden
 *
 * OUTCOME: Override the aggregate outcome (PASS/FAIL/AMBIGUOUS)
 *
 * Explicitly NOT allowed:
 * - Cannot override INVALID intents (structural failures)
 * - Cannot override adapter-level failures
 * - Cannot mutate or erase violations
 */
export enum OverrideScope {
  OUTCOME = 'OUTCOME',
}

/**
 * Overridden outcome - the GM's decision
 *
 * This replaces the rules outcome WITHOUT erasing the original.
 *
 * When overriding AMBIGUOUS, the GM must select one of the declared
 * interpretations. The selectedInterpretationCode field records which
 * interpretation was chosen, ensuring deterministic resolution.
 */
export type OverriddenOutcome = {
  readonly newOutcome: RulesOutcome;
  /**
   * When overriding AMBIGUOUS, this records which interpretation the GM selected.
   * Must match one of the codes in originalReport.ambiguity.possibleInterpretations.
   * The newOutcome must match the resultingOutcome declared by that interpretation.
   */
  readonly selectedInterpretationCode?: string;
};

/**
 * GM Override Decision (PR 2.0)
 *
 * Represents an explicit human authority decision that disagrees
 * with the rules engine output.
 *
 * Invariants:
 * - originalReport is immutable and always preserved
 * - overriddenOutcome records the GM's decision
 * - reason is mandatory and non-empty
 * - warning is mandatory with non-empty message
 * - Overrides form an append-only chain via parentOverrideId
 */
export type GmOverride = {
  readonly overrideId: OverrideId;
  readonly parentOverrideId: OverrideId | null;

  /** The original rules engine output - NEVER mutated */
  readonly originalReport: ValidationReport;

  /** The GM's overridden outcome */
  readonly overriddenOutcome: OverriddenOutcome;

  /** Scope of this override */
  readonly scope: OverrideScope;

  /** Mandatory warning - silent overrides are forbidden */
  readonly warning: OverrideWarning;

  /** Mandatory reason - must explain why override is needed */
  readonly reason: string;

  /** Identity of the authority */
  readonly issuedBy: GmId;

  /** When the override was issued */
  readonly issuedAt: LogicalTime;
};

/**
 * Effective outcome after applying override chain
 *
 * Consumers can inspect:
 * - What the rules said (originalReport.outcome)
 * - What the GM decided (effectiveOutcome)
 * - Why (through the override chain)
 * - All original violations (originalReport.violations) - NEVER hidden
 */
export type EffectiveValidation = {
  /** The original rules engine output - always preserved */
  readonly originalReport: ValidationReport;

  /** The effective outcome after all overrides */
  readonly effectiveOutcome: RulesOutcome;

  /** Whether any overrides were applied */
  readonly hasOverrides: boolean;

  /** The latest warning if overrides exist */
  readonly latestWarning: OverrideWarning | null;

  /** Number of overrides in the chain */
  readonly overrideCount: number;
};

/**
 * Override violation codes - distinct from RuleViolation
 *
 * These are errors in the override creation process,
 * NOT rule violations from the rules engine.
 */
export enum OverrideViolationCode {
  /** Reason was empty or whitespace-only */
  EMPTY_REASON = 'EMPTY_REASON',

  /** Warning message was empty or whitespace-only */
  EMPTY_WARNING_MESSAGE = 'EMPTY_WARNING_MESSAGE',

  /** Parent override chain is inconsistent */
  INVALID_CHAIN = 'INVALID_CHAIN',

  /** Attempted to override something outside allowed scope */
  SCOPE_NOT_ALLOWED = 'SCOPE_NOT_ALLOWED',

  /** Attempted to override an adapter failure (not a ValidationReport) */
  CANNOT_OVERRIDE_ADAPTER_FAILURE = 'CANNOT_OVERRIDE_ADAPTER_FAILURE',

  /** Missing interpretation code when overriding AMBIGUOUS */
  MISSING_INTERPRETATION_CODE = 'MISSING_INTERPRETATION_CODE',

  /** Selected interpretation code does not match any declared interpretation */
  INVALID_INTERPRETATION_CODE = 'INVALID_INTERPRETATION_CODE',

  /** newOutcome does not match the resultingOutcome of the selected interpretation */
  OUTCOME_MISMATCH = 'OUTCOME_MISMATCH',
}

/**
 * Override violation - error in override creation
 */
export type OverrideViolation = {
  readonly code: OverrideViolationCode;
  readonly details: string;
};

/**
 * Result of attempting to create an override
 */
export type OverrideResult =
  | { readonly kind: 'override'; readonly override: GmOverride }
  | { readonly kind: 'violation'; readonly violation: OverrideViolation };

// ============================================================================
// LEGACY TYPES (Deprecated - kept for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use ValidationReport instead
 */
export type RulesInvocationRequest = {
  invocationId: string;
  sourceIntentId: string;
  intentType: string;
  payload: unknown;
  rulesetId: string;
};

/**
 * @deprecated Use GmOverride instead
 */
export type OverrideDecision = {
  overrideId: string;
  parentOverrideId?: string;
  targetInvocationId: string;
  originalInvocation: RulesInvocationRequest;
  overriddenInvocation: RulesInvocationRequest;
  warning: OverrideWarning;
  reason: string;
  issuedBy: string;
  issuedAt: LogicalTime;
};
