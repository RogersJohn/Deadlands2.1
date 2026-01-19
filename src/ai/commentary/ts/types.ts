/**
 * AI Commentary Types (PR 5.0)
 *
 * CRITICAL INVARIANT: AI is commentary, not control.
 *
 * This module defines the types for read-only AI commentary.
 * The AI receives SNAPSHOTS (deep copies) of system state.
 * The AI returns PLAIN TEXT only.
 * The AI has NO authority, direct or indirect.
 *
 * KILL CRITERIA (any violation fails PR 5.0):
 * - AI prepares, emits, or modifies intents
 * - AI applies effects or overrides
 * - AI resolves ambiguity
 * - AI output changes system behavior
 * - AI output becomes a primary CTA
 * - AI output is visible by default
 * - AI output is persisted as authority
 * - AI output feeds back into validation or resolution
 */

import type { ValidatedIntent } from '../../../intent/bridge/ts/ValidatedIntent';
import type {
  AggregatedValidationReport,
  Conflict,
  ConflictResult,
  RuleValidationResult,
  RuleViolation,
  AmbiguityInterpretation,
  ValidationReport,
} from '../../../intent/bridge/ts/RulesPipeline';
import { RulesOutcome } from '../../../intent/bridge/ts/RulesPipeline';
import type { EffectiveValidation } from '../../../overrides/ts/types';
import type { ResolutionResult, Effect } from '../../../resolution/ts/types';

// ============================================================================
// SNAPSHOT TYPES (IMMUTABLE, DEEP-COPIED)
// ============================================================================

/**
 * AICommentarySnapshot - immutable, deep-copied input for AI commentary
 *
 * CRITICAL: This is a SNAPSHOT, not a live reference.
 * - All fields are readonly
 * - No callbacks, no handles, no mutation paths
 * - No access to override or resolution APIs
 * - AI cannot use this to affect system state
 *
 * The snapshot is created by deep-copying live data.
 * Mutating the snapshot has NO effect on system state.
 */
export type AICommentarySnapshot = {
  /**
   * The validated intent (read-only copy)
   *
   * This is what the player/GM tried to do.
   * AI may explain but NOT modify.
   */
  readonly intent: Readonly<{
    readonly intentId: string;
    readonly intentType: string;
    readonly payload: unknown;
  }>;

  /**
   * The validation report (read-only copy)
   *
   * This is what the rules engine determined.
   * AI may explain but NOT change the outcome.
   */
  readonly validationReport: Readonly<{
    readonly outcome: RulesOutcome;
    readonly violations: readonly Readonly<{
      readonly ruleId: string;
      readonly message: string;
      readonly severity: string;
    }>[];
    readonly conflicts: readonly Readonly<{
      readonly kind: string;
      readonly sourceRule: string;
      readonly message: string;
    }>[];
    readonly ambiguity: Readonly<{
      readonly reason: string;
      readonly possibleInterpretations: readonly string[];
    }> | null;
    readonly costValidation: Readonly<{
      readonly outcome: string;
      readonly reason: string;
    }> | null;
  }>;

  /**
   * Override information (read-only copy, if any overrides exist)
   *
   * AI may explain the override chain but NOT modify it.
   */
  readonly overrideInfo: Readonly<{
    readonly hasOverrides: boolean;
    readonly overrideCount: number;
    readonly effectiveOutcome: RulesOutcome;
    readonly latestWarning: string | null;
    readonly latestReason: string | null;
  }> | null;

  /**
   * Resolution result (read-only copy, if resolution occurred)
   *
   * AI may explain effects but NOT apply them.
   */
  readonly resolutionInfo: Readonly<{
    readonly outcome: string;
    readonly effectCount: number;
    readonly effectDescriptions: readonly string[];
    readonly explanation: string;
  }> | null;

  /**
   * Timestamp when snapshot was created
   *
   * This proves the snapshot is a point-in-time copy.
   */
  readonly snapshotTimestamp: number;
};

// ============================================================================
// COMMENTARY OUTPUT TYPES (TEXT ONLY)
// ============================================================================

/**
 * AICommentary - the output from AI commentary service
 *
 * CRITICAL: This is TEXT ONLY.
 * - No structured commands
 * - No "recommended action" objects
 * - No references that can be used to apply changes
 * - No confidence scores that could influence UI emphasis
 *
 * The caller may display this text but MUST NOT act on it.
 */
export type AICommentary = {
  /**
   * Main commentary text (markdown allowed)
   *
   * This explains what happened in plain language.
   * It may reference rules by name but NOT by logic.
   */
  readonly commentary: string;

  /**
   * Whether commentary was successfully generated
   *
   * If false, the system continues unchanged.
   * AI failure is NOT a system failure.
   */
  readonly success: boolean;

  /**
   * Error message if commentary generation failed
   *
   * This is informational only. System behavior is unchanged.
   */
  readonly error: string | null;

  /**
   * Timestamp when commentary was generated
   *
   * This proves the commentary is advisory, not authoritative.
   */
  readonly generatedAt: number;
};

// ============================================================================
// SERVICE INTERFACE (READ-ONLY CONTRACT)
// ============================================================================

/**
 * AICommentaryService - read-only commentary generator
 *
 * CRITICAL INVARIANTS:
 * - Receives ONLY snapshots (no live references)
 * - Returns ONLY text (no structured commands)
 * - Has NO side effects
 * - Cannot access override or resolution APIs
 * - Cannot modify system state
 * - Failure does not break the system
 *
 * This is a pure function: snapshot → text
 */
export type AICommentaryService = {
  /**
   * Generate commentary for a validation snapshot
   *
   * @param snapshot - Immutable snapshot of system state
   * @returns Plain text commentary (success or error)
   *
   * INVARIANTS:
   * - Snapshot is not modified
   * - System state is not modified
   * - Result is pure text
   * - Failure returns error, does not throw
   */
  readonly generateCommentary: (
    snapshot: AICommentarySnapshot
  ) => Promise<AICommentary>;
};

// ============================================================================
// FACTORY FUNCTION (CREATES DEFENSIVE SNAPSHOTS)
// ============================================================================

/**
 * Create a defensive snapshot from live system state
 *
 * CRITICAL: This function DEEP COPIES all data.
 * - No references to live objects survive
 * - Mutating the snapshot has no effect on system state
 * - AI cannot use the snapshot to affect authority
 *
 * @param intent - The validated intent (will be deep-copied)
 * @param report - The validation report (will be deep-copied)
 * @param effectiveValidation - Override info (will be deep-copied, optional)
 * @param resolution - Resolution result (will be deep-copied, optional)
 * @returns Immutable snapshot safe for AI consumption
 */
export function createAICommentarySnapshot(
  intent: ValidatedIntent,
  report: ValidationReport | AggregatedValidationReport,
  effectiveValidation?: EffectiveValidation | null,
  resolution?: ResolutionResult | null
): AICommentarySnapshot {
  // Deep copy intent (defensive)
  const intentSnapshot = {
    intentId: String(intent.intentId),
    intentType: String(intent.intentType),
    payload: JSON.parse(JSON.stringify(intent.payload)),
  } as const;

  // Determine if this is aggregated or single report
  const isSingleReport = 'outcome' in report && 'violations' in report;

  // Extract validation data (defensive copy)
  let validationSnapshot: AICommentarySnapshot['validationReport'];

  if (isSingleReport) {
    const singleReport = report as ValidationReport;
    validationSnapshot = {
      outcome: singleReport.outcome,
      violations: singleReport.violations.map((v: RuleViolation) => ({
        ruleId: String(v.ruleId),
        message: String(v.message),
        severity: String(v.severity),
      })),
      conflicts: singleReport.conflicts.map((c: Conflict) => ({
        kind: String(c.kind),
        sourceRule: String(c.sourceRule),
        message: String(c.message),
      })),
      ambiguity: singleReport.ambiguity
        ? {
            reason: String(singleReport.ambiguity.reason),
            possibleInterpretations: singleReport.ambiguity.possibleInterpretations.map(
              (i: AmbiguityInterpretation) => String(i.description)
            ),
          }
        : null,
      costValidation: singleReport.costValidation
        ? {
            outcome: String(singleReport.costValidation.outcome),
            reason: String(singleReport.costValidation.reason),
          }
        : null,
    } as const;
  } else {
    // Aggregated report - flatten for AI consumption
    const aggReport = report as AggregatedValidationReport;
    const firstResult = aggReport.ruleResults[0];

    validationSnapshot = {
      outcome: firstResult?.outcome ?? RulesOutcome.FAIL,
      violations: aggReport.ruleResults.flatMap((r: RuleValidationResult) =>
        r.violations.map((v: RuleViolation) => ({
          ruleId: String(v.ruleId),
          message: String(v.message),
          severity: String(v.severity),
        }))
      ),
      conflicts: aggReport.allConflicts.map((c: ConflictResult) => ({
        kind: String(c.conflict.kind),
        sourceRule: String(c.conflict.sourceRule),
        message: String(c.conflict.message),
      })),
      ambiguity: firstResult?.ambiguity
        ? {
            reason: String(firstResult.ambiguity.reason),
            possibleInterpretations: firstResult.ambiguity.possibleInterpretations.map(
              (i: AmbiguityInterpretation) => String(i.description)
            ),
          }
        : null,
      costValidation: aggReport.costResults[0]?.costValidation
        ? {
            outcome: String(aggReport.costResults[0].costValidation.outcome),
            reason: String(aggReport.costResults[0].costValidation.reason),
          }
        : null,
    } as const;
  }

  // Extract override info (defensive copy)
  const overrideSnapshot: AICommentarySnapshot['overrideInfo'] = effectiveValidation
    ? {
        hasOverrides: Boolean(effectiveValidation.hasOverrides),
        overrideCount: Number(effectiveValidation.overrideCount),
        effectiveOutcome: effectiveValidation.effectiveOutcome,
        latestWarning: effectiveValidation.latestWarning
          ? String(effectiveValidation.latestWarning)
          : null,
        latestReason: null, // Not exposing GM reasons to AI
      }
    : null;

  // Extract resolution info (defensive copy)
  const resolutionSnapshot: AICommentarySnapshot['resolutionInfo'] = resolution
    ? {
        outcome: String(resolution.outcome),
        effectCount: Number(resolution.effects.length),
        effectDescriptions: resolution.effects.map((e: Effect) => String(e.description)),
        explanation: String(resolution.explanation),
      }
    : null;

  return {
    intent: intentSnapshot,
    validationReport: validationSnapshot,
    overrideInfo: overrideSnapshot,
    resolutionInfo: resolutionSnapshot,
    snapshotTimestamp: Date.now(),
  } as const;
}

// ============================================================================
// TYPE GUARDS (FOR DEFENSIVE PROGRAMMING)
// ============================================================================

/**
 * Type guard: verify object is a valid AICommentarySnapshot
 *
 * Used for defensive validation before AI processing.
 */
export function isValidSnapshot(obj: unknown): obj is AICommentarySnapshot {
  if (typeof obj !== 'object' || obj === null) return false;
  const snapshot = obj as AICommentarySnapshot;

  return (
    typeof snapshot.intent === 'object' &&
    snapshot.intent !== null &&
    typeof snapshot.intent.intentId === 'string' &&
    typeof snapshot.intent.intentType === 'string' &&
    typeof snapshot.validationReport === 'object' &&
    snapshot.validationReport !== null &&
    typeof snapshot.validationReport.outcome === 'string' &&
    Array.isArray(snapshot.validationReport.violations) &&
    Array.isArray(snapshot.validationReport.conflicts) &&
    typeof snapshot.snapshotTimestamp === 'number'
  );
}

/**
 * Type guard: verify object is a valid AICommentary
 *
 * Used for defensive validation of AI output.
 */
export function isValidCommentary(obj: unknown): obj is AICommentary {
  if (typeof obj !== 'object' || obj === null) return false;
  const commentary = obj as AICommentary;

  return (
    typeof commentary.commentary === 'string' &&
    typeof commentary.success === 'boolean' &&
    (commentary.error === null || typeof commentary.error === 'string') &&
    typeof commentary.generatedAt === 'number'
  );
}
