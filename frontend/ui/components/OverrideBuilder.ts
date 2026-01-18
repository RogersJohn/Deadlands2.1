/**
 * Override Builder (PR 3.1)
 *
 * Explicit, deliberate GM override creation.
 *
 * Core principle: Overrides must feel deliberate, heavy, and visible — not convenient.
 *
 * This component:
 * - Shows original rule outcome clearly
 * - Requires explicit selection of new outcome
 * - Requires written reason (cannot be empty)
 * - Makes override a conscious action, not a retry
 * - Does NOT allow overriding invalid intents or adapter failures
 *
 * This is a logic-only module - no DOM manipulation.
 */

import type {
  OverrideBuilderState,
  OverrideRequest,
  OverrideScope,
  PipelineResult,
  RulesOutcome,
  ValidationReport,
} from '../types';

// ============================================================================
// SCOPE CHECKING
// ============================================================================

/**
 * Check if a pipeline result can be overridden
 *
 * Override is ONLY allowed for rule outcomes (success with validation).
 * Override is NOT allowed for:
 * - validation_error (invalid intent structure)
 * - adapter_failure (no pipeline claimed authority)
 *
 * This is enforced in the backend and reflected in the UI.
 */
export function checkOverrideScope(result: PipelineResult): OverrideScope {
  if (result.kind === 'validation_error') {
    return {
      allowed: false,
      reason: 'Cannot override: Intent failed structural validation. Fix the intent instead.',
    };
  }

  if (result.kind === 'adapter_failure') {
    return {
      allowed: false,
      reason: `Cannot override: Adapter failure (${result.code}). No rules were invoked.`,
    };
  }

  // Success - override is allowed
  return {
    allowed: true,
    validation: result.validation,
  };
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Create initial override builder state (closed)
 */
export function createInitialOverrideState(): OverrideBuilderState {
  return {
    isOpen: false,
    targetValidation: null,
    selectedOutcome: null,
    reason: '',
    warningSeverity: null,
    isSubmitting: false,
    validationErrors: {},
  };
}

/**
 * Open the override builder for a specific validation report
 *
 * This is a conscious action - the GM is initiating a disagreement with rules.
 */
export function openOverrideBuilder(
  state: OverrideBuilderState,
  validation: ValidationReport
): OverrideBuilderState {
  return {
    isOpen: true,
    targetValidation: validation,
    selectedOutcome: null, // Must be explicitly chosen
    reason: '', // Must be explicitly written
    warningSeverity: null, // Must be explicitly chosen
    isSubmitting: false,
    validationErrors: {},
  };
}

/**
 * Close the override builder (cancel)
 */
export function closeOverrideBuilder(
  _state: OverrideBuilderState
): OverrideBuilderState {
  return createInitialOverrideState();
}

/**
 * Select the new outcome
 *
 * The GM must explicitly choose what outcome they are asserting.
 */
export function selectOutcome(
  state: OverrideBuilderState,
  outcome: RulesOutcome
): OverrideBuilderState {
  return {
    ...state,
    selectedOutcome: outcome,
    validationErrors: {
      ...state.validationErrors,
      selectedOutcome: undefined,
    } as Readonly<Record<string, string>>,
  };
}

/**
 * Set the override reason
 *
 * The GM must explain why they are overriding the rules.
 * Empty reasons are not allowed.
 */
export function setReason(
  state: OverrideBuilderState,
  reason: string
): OverrideBuilderState {
  return {
    ...state,
    reason,
    validationErrors: {
      ...state.validationErrors,
      reason: undefined,
    } as Readonly<Record<string, string>>,
  };
}

/**
 * Select the warning severity
 *
 * The GM must indicate how significant this override is.
 */
export function selectWarningSeverity(
  state: OverrideBuilderState,
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
): OverrideBuilderState {
  return {
    ...state,
    warningSeverity: severity,
    validationErrors: {
      ...state.validationErrors,
      warningSeverity: undefined,
    } as Readonly<Record<string, string>>,
  };
}

/**
 * Set submitting state
 */
export function setOverrideSubmitting(
  state: OverrideBuilderState,
  isSubmitting: boolean
): OverrideBuilderState {
  return {
    ...state,
    isSubmitting,
  };
}

/**
 * Set validation errors
 */
export function setOverrideValidationErrors(
  state: OverrideBuilderState,
  errors: Readonly<Record<string, string>>
): OverrideBuilderState {
  return {
    ...state,
    validationErrors: errors,
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate the override form
 *
 * All fields are REQUIRED. No defaults. No inference.
 */
export function validateOverrideForm(
  state: OverrideBuilderState
): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};

  if (state.targetValidation === null) {
    errors['targetValidation'] = 'No validation report selected';
  }

  if (state.selectedOutcome === null) {
    errors['selectedOutcome'] = 'You must select a new outcome';
  }

  if (state.reason.trim() === '') {
    errors['reason'] = 'You must provide a reason for this override';
  } else if (state.reason.trim().length < 10) {
    errors['reason'] = 'Reason must be at least 10 characters (be explicit)';
  }

  if (state.warningSeverity === null) {
    errors['warningSeverity'] = 'You must select a warning severity';
  }

  return errors;
}

/**
 * Check if the override form can be submitted
 */
export function canSubmitOverride(state: OverrideBuilderState): boolean {
  if (state.isSubmitting) {
    return false;
  }

  if (!state.isOpen || state.targetValidation === null) {
    return false;
  }

  const errors = validateOverrideForm(state);
  return Object.keys(errors).length === 0;
}

// ============================================================================
// REQUEST BUILDING
// ============================================================================

/**
 * Build an override request from the current state
 *
 * Returns null if state is invalid.
 * Does NOT auto-fill any values.
 */
export function buildOverrideRequest(
  state: OverrideBuilderState,
  gmId: string
): OverrideRequest | null {
  if (!canSubmitOverride(state)) {
    return null;
  }

  if (
    state.targetValidation === null ||
    state.selectedOutcome === null ||
    state.warningSeverity === null
  ) {
    return null;
  }

  // Warning message is derived from reason, but both are explicit
  const warningMessage = `GM Override: ${state.reason.trim()}`;

  return {
    validationReport: state.targetValidation,
    newOutcome: state.selectedOutcome,
    reason: state.reason.trim(),
    warningSeverity: state.warningSeverity,
    warningMessage,
    gmId,
  };
}

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Get description of what an override will do
 *
 * This makes the consequences of the override explicit and visible.
 */
export function getOverrideDescription(state: OverrideBuilderState): string | null {
  if (state.targetValidation === null || state.selectedOutcome === null) {
    return null;
  }

  const original = state.targetValidation.outcome;
  const newOutcome = state.selectedOutcome;

  if (original === newOutcome) {
    return `You are reasserting the same outcome (${original}). This creates an audit record but does not change the result.`;
  }

  return `You are changing the outcome from ${original} to ${newOutcome}. ` +
    `The original rule decision (${original}) will be preserved but the effective outcome will be ${newOutcome}.`;
}

/**
 * Get the original outcome for display
 */
export function getOriginalOutcome(state: OverrideBuilderState): RulesOutcome | null {
  return state.targetValidation?.outcome ?? null;
}

/**
 * Get severity description
 */
export function getSeverityDescription(severity: 'INFO' | 'WARNING' | 'CRITICAL'): string {
  switch (severity) {
    case 'INFO':
      return 'Minor adjustment - cosmetic or narrative change';
    case 'WARNING':
      return 'Significant deviation - rules-as-written are being bent';
    case 'CRITICAL':
      return 'Major override - gameplay consequences, proceed with caution';
  }
}

/**
 * Get all available outcomes for selection
 */
export function getAvailableOutcomes(): readonly { value: RulesOutcome; label: string; description: string }[] {
  return [
    { value: 'PASS', label: 'PASS', description: 'Allow the action to succeed' },
    { value: 'FAIL', label: 'FAIL', description: 'Force the action to fail' },
    { value: 'AMBIGUOUS', label: 'AMBIGUOUS', description: 'Mark as requiring further GM decision' },
  ];
}

/**
 * Get all available severity levels for selection
 */
export function getAvailableSeverities(): readonly { value: 'INFO' | 'WARNING' | 'CRITICAL'; label: string; description: string }[] {
  return [
    { value: 'INFO', label: 'Info', description: getSeverityDescription('INFO') },
    { value: 'WARNING', label: 'Warning', description: getSeverityDescription('WARNING') },
    { value: 'CRITICAL', label: 'Critical', description: getSeverityDescription('CRITICAL') },
  ];
}
