/**
 * Authority Viewer (PR 3.0)
 *
 * Displays the complete authority chain:
 * - Original Intent
 * - Validation outcome
 * - Rule violations and ambiguity
 * - GM Override (if present)
 * - Resolution effects
 *
 * Core principle: The UI is a window into authority, not a source of authority.
 *
 * This is a logic-only module - it prepares data for display.
 * No DOM manipulation. No styling. No interpretation.
 */

import type {
  Effect,
  GmOverride,
  PipelineResult,
  RawIntentInput,
  ResolutionResult,
  RulesOutcome,
  ValidationReport,
} from '../types';

// ============================================================================
// VIEW MODELS (structured for display)
// ============================================================================

/**
 * IntentView - how the original intent is displayed
 */
export type IntentView = {
  readonly intentType: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly payloadFields: readonly { key: string; value: string }[];
};

/**
 * ViolationView - how a violation is displayed
 */
export type ViolationView = {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: 'ERROR' | 'WARNING';
  readonly severityLabel: string;
};

/**
 * AmbiguityView - how ambiguity is displayed
 */
export type AmbiguityView = {
  readonly reason: string;
  readonly interpretations: readonly string[];
};

/**
 * ValidationView - how validation result is displayed
 */
export type ValidationView = {
  readonly invocationId: string;
  readonly outcome: RulesOutcome;
  readonly outcomeLabel: string;
  readonly outcomeDescription: string;
  readonly rulesetId: string;
  readonly violations: readonly ViolationView[];
  readonly ambiguity: AmbiguityView | null;
  readonly hasViolations: boolean;
  readonly hasAmbiguity: boolean;
};

/**
 * OverrideView - how GM override is displayed
 */
export type OverrideView = {
  readonly overrideId: string;
  readonly originalOutcome: RulesOutcome;
  readonly newOutcome: RulesOutcome;
  readonly reason: string;
  readonly warning: {
    readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
    readonly severityLabel: string;
    readonly message: string;
  };
  readonly issuedBy: string;
  readonly issuedAt: string; // Formatted timestamp
};

/**
 * EffectView - how an effect is displayed
 */
export type EffectView = {
  readonly effectId: string;
  readonly effectType: string;
  readonly description: string;
  readonly targetId: string;
  readonly targetType: string;
  readonly authoritySource: 'RULES' | 'OVERRIDE';
  readonly parameters: readonly { key: string; value: string }[];
};

/**
 * ResolutionView - how resolution result is displayed
 */
export type ResolutionView = {
  readonly outcomeLabel: string;
  readonly explanation: string;
  readonly hasEffects: boolean;
  readonly effects: readonly EffectView[];
};

/**
 * Complete authority chain view
 */
export type AuthorityChainView = {
  readonly intent: IntentView;
  readonly validation: ValidationView;
  readonly override: OverrideView | null;
  readonly effectiveOutcome: RulesOutcome;
  readonly effectiveOutcomeLabel: string;
  readonly resolution: ResolutionView;
  readonly wasOverridden: boolean;
};

// ============================================================================
// VIEW TRANSFORMERS
// ============================================================================

/**
 * Transform raw intent to view model
 */
export function toIntentView(intent: RawIntentInput): IntentView {
  const payloadFields = Object.entries(intent.payload).map(([key, value]) => ({
    key,
    value: formatValue(value),
  }));

  return {
    intentType: intent.intentType,
    payload: intent.payload,
    payloadFields,
  };
}

/**
 * Transform validation report to view model
 */
export function toValidationView(
  report: ValidationReport,
  originalOutcome?: RulesOutcome
): ValidationView {
  const violations = report.violations.map((v) => ({
    ruleId: v.ruleId,
    message: v.message,
    severity: v.severity,
    severityLabel: v.severity === 'ERROR' ? 'Error' : 'Warning',
  }));

  const ambiguity = report.ambiguity
    ? {
        reason: report.ambiguity.reason,
        interpretations: report.ambiguity.possibleInterpretations,
      }
    : null;

  return {
    invocationId: report.invocationId,
    outcome: report.outcome,
    outcomeLabel: formatOutcome(report.outcome),
    outcomeDescription: getOutcomeDescription(report.outcome),
    rulesetId: report.rulesetId,
    violations,
    ambiguity,
    hasViolations: violations.length > 0,
    hasAmbiguity: ambiguity !== null,
  };
}

/**
 * Transform GM override to view model
 */
export function toOverrideView(
  override: GmOverride,
  originalOutcome: RulesOutcome
): OverrideView {
  return {
    overrideId: override.overrideId,
    originalOutcome,
    newOutcome: override.overriddenOutcome.newOutcome,
    reason: override.reason,
    warning: {
      severity: override.warning.severity,
      severityLabel: formatWarningSeverity(override.warning.severity),
      message: override.warning.message,
    },
    issuedBy: override.issuedBy,
    issuedAt: formatTimestamp(override.issuedAt),
  };
}

/**
 * Transform effect to view model
 */
export function toEffectView(effect: Effect): EffectView {
  const parameters = Object.entries(effect.parameters).map(([key, value]) => ({
    key,
    value: formatValue(value),
  }));

  return {
    effectId: effect.effectId,
    effectType: effect.effectType,
    description: effect.description,
    targetId: effect.target.targetId,
    targetType: effect.target.targetType,
    authoritySource: effect.authority.source,
    parameters,
  };
}

/**
 * Transform resolution result to view model
 */
export function toResolutionView(resolution: ResolutionResult): ResolutionView {
  const effects = resolution.effects.map(toEffectView);

  return {
    outcomeLabel: formatResolutionOutcome(resolution.outcome),
    explanation: resolution.explanation,
    hasEffects: effects.length > 0,
    effects,
  };
}

/**
 * Build complete authority chain view from pipeline result
 */
export function toAuthorityChainView(
  intent: RawIntentInput,
  result: PipelineResult
): AuthorityChainView | null {
  if (result.kind !== 'success') {
    return null;
  }

  const intentView = toIntentView(intent);
  const validationView = toValidationView(result.validation);

  const overrideView = result.override
    ? toOverrideView(result.override, result.validation.outcome)
    : null;

  const resolutionView = toResolutionView(result.resolution);

  return {
    intent: intentView,
    validation: validationView,
    override: overrideView,
    effectiveOutcome: result.effectiveOutcome,
    effectiveOutcomeLabel: formatOutcome(result.effectiveOutcome),
    resolution: resolutionView,
    wasOverridden: result.override !== null,
  };
}

// ============================================================================
// FORMATTING HELPERS (display only, no logic)
// ============================================================================

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Format outcome for display
 */
function formatOutcome(outcome: RulesOutcome): string {
  switch (outcome) {
    case 'PASS':
      return 'PASS';
    case 'FAIL':
      return 'FAIL';
    case 'AMBIGUOUS':
      return 'AMBIGUOUS';
  }
}

/**
 * Get outcome description
 */
function getOutcomeDescription(outcome: RulesOutcome): string {
  switch (outcome) {
    case 'PASS':
      return 'All rules satisfied';
    case 'FAIL':
      return 'One or more rules violated';
    case 'AMBIGUOUS':
      return 'Rules cannot determine outcome - GM decision required';
  }
}

/**
 * Format warning severity for display
 */
function formatWarningSeverity(severity: 'INFO' | 'WARNING' | 'CRITICAL'): string {
  switch (severity) {
    case 'INFO':
      return 'Info';
    case 'WARNING':
      return 'Warning';
    case 'CRITICAL':
      return 'Critical';
  }
}

/**
 * Format resolution outcome for display
 */
function formatResolutionOutcome(outcome: string): string {
  switch (outcome) {
    case 'EFFECTS_PRODUCED':
      return 'Effects Produced';
    case 'NO_EFFECTS_FAIL':
      return 'No Effects (FAIL)';
    case 'NO_EFFECTS_AMBIGUOUS':
      return 'No Effects (AMBIGUOUS)';
    case 'NO_EFFECTS_NO_PRODUCER':
      return 'No Effects (No Producer)';
    default:
      return outcome;
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: number): string {
  // Simple formatting - no locale logic
  return `Time: ${timestamp}`;
}

// ============================================================================
// ERROR VIEW BUILDERS
// ============================================================================

/**
 * Build error view for validation errors
 */
export type ValidationErrorView = {
  readonly kind: 'validation_error';
  readonly errors: readonly string[];
};

/**
 * Build error view for adapter failures
 */
export type AdapterFailureView = {
  readonly kind: 'adapter_failure';
  readonly code: string;
  readonly details: string;
};

/**
 * Build error view from pipeline result
 */
export function toErrorView(
  result: PipelineResult
): ValidationErrorView | AdapterFailureView | null {
  if (result.kind === 'success') {
    return null;
  }

  if (result.kind === 'validation_error') {
    return {
      kind: 'validation_error',
      errors: result.errors,
    };
  }

  return {
    kind: 'adapter_failure',
    code: result.code,
    details: result.details,
  };
}
