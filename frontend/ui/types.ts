/**
 * UI Types (PR 3.0, PR 3.1)
 *
 * These types mirror backend types for display purposes only.
 * The UI renders data - it does not interpret or modify it.
 *
 * Core principle: The UI is a window into authority, not a source of authority.
 *
 * PR 3.1 additions:
 * - Override creation types (OverrideRequest, OverrideBuilderState)
 * - Scope checking types
 */

// ============================================================================
// RAW INTENT (UI constructs this)
// ============================================================================

/**
 * RawIntentInput - what the UI collects from the user
 *
 * All fields are explicit. No auto-fill. No inference.
 */
export type RawIntentInput = {
  readonly intentType: string;
  readonly payload: Record<string, unknown>;
};

/**
 * Intent field definition for the builder
 */
export type IntentFieldDefinition = {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'select';
  readonly required: boolean;
  readonly options?: readonly string[]; // For select type
  readonly description?: string;
};

/**
 * Intent type definition for the builder
 */
export type IntentTypeDefinition = {
  readonly intentType: string;
  readonly description: string;
  readonly fields: readonly IntentFieldDefinition[];
};

// ============================================================================
// VALIDATION RESULT (UI receives this)
// ============================================================================

/**
 * RulesOutcome - outcome of rules validation
 */
export type RulesOutcome = 'PASS' | 'FAIL' | 'AMBIGUOUS';

/**
 * RuleViolation - a single rule violation
 */
export type RuleViolation = {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
};

/**
 * RulesAmbiguity - why rules could not determine outcome
 */
export type RulesAmbiguity = {
  readonly reason: string;
  readonly possibleInterpretations: readonly string[];
};

/**
 * ValidationReport - rules engine output
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

// ============================================================================
// OVERRIDE (UI displays and creates via backend)
// ============================================================================

/**
 * OverrideWarning - GM warning attached to override
 */
export type OverrideWarning = {
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly message: string;
};

/**
 * GmOverride - a GM override decision
 */
export type GmOverride = {
  readonly overrideId: string;
  readonly parentOverrideId: string | null;
  readonly overriddenOutcome: {
    readonly newOutcome: RulesOutcome;
  };
  readonly warning: OverrideWarning;
  readonly reason: string;
  readonly issuedBy: string;
  readonly issuedAt: number;
};

// ============================================================================
// OVERRIDE CREATION (PR 3.1)
// ============================================================================

/**
 * OverrideRequest - what the UI submits to create an override
 *
 * All fields are REQUIRED and EXPLICIT.
 * No defaults. No inference. No convenience.
 *
 * The GM must consciously provide:
 * - The validation report to override
 * - The new outcome they are asserting
 * - A written reason explaining the override
 * - Warning severity (how significant this deviation is)
 */
export type OverrideRequest = {
  /** The validation report being overridden */
  readonly validationReport: ValidationReport;

  /** The outcome the GM is asserting */
  readonly newOutcome: RulesOutcome;

  /** REQUIRED: Why the GM is overriding the rules */
  readonly reason: string;

  /** Warning severity - how significant is this override? */
  readonly warningSeverity: 'INFO' | 'WARNING' | 'CRITICAL';

  /** Warning message (derived from reason, but explicit) */
  readonly warningMessage: string;

  /** GM identity (may be stubbed, but must be explicit) */
  readonly gmId: string;
};

/**
 * OverrideResult - response from submitting an override
 */
export type OverrideSubmitResult =
  | {
      readonly kind: 'success';
      readonly override: GmOverride;
      readonly newEffectiveOutcome: RulesOutcome;
      readonly resolution: ResolutionResult;
    }
  | {
      readonly kind: 'violation';
      readonly code: string;
      readonly details: string;
    };

/**
 * OverrideScope - whether override is allowed for this result
 *
 * Override is ONLY allowed for rule outcomes (PASS/FAIL/AMBIGUOUS).
 * Override is NOT allowed for:
 * - validation_error (invalid intent structure)
 * - adapter_failure (no pipeline claimed authority)
 */
export type OverrideScope =
  | { readonly allowed: true; readonly validation: ValidationReport }
  | { readonly allowed: false; readonly reason: string };

/**
 * OverrideBuilderState - state of the override creation form
 *
 * Overrides must feel deliberate, heavy, and visible — not convenient.
 */
export type OverrideBuilderState = {
  /** Is the override form visible? */
  readonly isOpen: boolean;

  /** The validation report being considered for override */
  readonly targetValidation: ValidationReport | null;

  /** Selected new outcome (must be explicitly chosen) */
  readonly selectedOutcome: RulesOutcome | null;

  /** Written reason (REQUIRED, cannot be empty) */
  readonly reason: string;

  /** Warning severity (must be explicitly chosen) */
  readonly warningSeverity: 'INFO' | 'WARNING' | 'CRITICAL' | null;

  /** Is the override being submitted? */
  readonly isSubmitting: boolean;

  /** Validation errors for the form */
  readonly validationErrors: Readonly<Record<string, string>>;
};

// ============================================================================
// RESOLUTION (UI displays this)
// ============================================================================

/**
 * ResolutionOutcome - why resolution produced (or did not produce) effects
 */
export type ResolutionOutcome =
  | 'EFFECTS_PRODUCED'
  | 'NO_EFFECTS_FAIL'
  | 'NO_EFFECTS_AMBIGUOUS'
  | 'NO_EFFECTS_NO_PRODUCER';

/**
 * Effect - a declarative effect (display only)
 */
export type Effect = {
  readonly effectId: string;
  readonly effectType: string;
  readonly target: {
    readonly targetId: string;
    readonly targetType: string;
  };
  readonly authority: {
    readonly invocationId: string;
    readonly source: 'RULES' | 'OVERRIDE';
    readonly outcome: RulesOutcome;
  };
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly description: string;
};

/**
 * ResolutionResult - resolution output (display only)
 */
export type ResolutionResult = {
  readonly outcome: ResolutionOutcome;
  readonly effects: readonly Effect[];
  readonly explanation: string;
};

// ============================================================================
// PIPELINE RESULT (complete response from backend)
// ============================================================================

/**
 * PipelineResult - the complete response from submitting an intent
 *
 * This is what the UI receives after submitting a raw intent.
 * It contains the full authority chain for display.
 */
export type PipelineResult =
  | {
      readonly kind: 'success';
      readonly intentId: string;
      readonly validation: ValidationReport;
      readonly override: GmOverride | null;
      readonly effectiveOutcome: RulesOutcome;
      readonly resolution: ResolutionResult;
    }
  | {
      readonly kind: 'validation_error';
      readonly errors: readonly string[];
    }
  | {
      readonly kind: 'adapter_failure';
      readonly code: string;
      readonly details: string;
    };

// ============================================================================
// UI STATE (internal to UI)
// ============================================================================

/**
 * IntentBuilderState - state of the intent builder form
 */
export type IntentBuilderState = {
  readonly selectedIntentType: string | null;
  readonly fieldValues: Readonly<Record<string, unknown>>;
  readonly validationErrors: Readonly<Record<string, string>>;
  readonly isSubmitting: boolean;
};

/**
 * Field validation result
 */
export type FieldValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly error: string };
