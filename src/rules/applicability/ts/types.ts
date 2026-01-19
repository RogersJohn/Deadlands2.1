/**
 * Rule Applicability Types (PR 6.1)
 *
 * CRITICAL INVARIANT: Applicability is filtering, not decision-making.
 *
 * This module defines types for explicit rule applicability scoping.
 * Applicability determines WHETHER a rule runs, not WHAT it does when it runs.
 *
 * KILL CRITERIA (any violation fails PR 6.1):
 * - Implicit applicability (rules applying without declaring scope)
 * - Default scopes ("combat by default", etc.)
 * - Priority between rules
 * - Ordering based on scope
 * - Automatic override or suppression
 * - "If no scope specified, apply everywhere"
 * - Hidden or inferred scope
 * - Applicability affecting outcomes beyond inclusion/exclusion
 *
 * Applicability may only decide whether a rule runs, nothing else.
 */

// ============================================================================
// GAME MODE TYPE
// ============================================================================

/**
 * GameMode - explicit mode context for rule applicability
 *
 * CRITICAL: This is an EXPLICIT value, not inferred.
 * - The intent must supply this explicitly
 * - There is NO default
 * - Missing mode means scoped rules do not apply
 *
 * This is not an exhaustive list. New modes may be added.
 * The engine does NOT interpret these values.
 */
export type GameMode = 'combat' | 'downtime' | 'social';

// ============================================================================
// RULE APPLICABILITY DECLARATION
// ============================================================================

/**
 * RuleApplicability - explicit declaration of when a rule applies
 *
 * CRITICAL INVARIANTS:
 * - Applicability is EXPLICIT - rules must declare it
 * - Absence of applicability means rule does NOT apply
 * - Applicability is DATA, not logic
 * - Applicability does NOT affect rule behavior when it runs
 *
 * A rule without applicability declaration is never applicable.
 * This is NOT a "global" rule - it simply does not run.
 */
export type RuleApplicability = {
  /**
   * Game modes where this rule applies
   *
   * If the intent's mode is in this array, the rule is applicable.
   * If not, the rule is not applicable.
   *
   * Empty array means rule applies to no modes (never applicable).
   * Undefined/missing applicability means rule never applies.
   */
  readonly modes: readonly GameMode[];

  /**
   * Optional tags for categorization (descriptive only)
   *
   * These are opaque strings. The engine does NOT interpret them.
   * They exist for human/UI categorization, not logic.
   */
  readonly tags?: readonly string[];
};

// ============================================================================
// INTENT CONTEXT
// ============================================================================

/**
 * IntentContext - explicit context supplied with the intent
 *
 * CRITICAL INVARIANTS:
 * - Context must be EXPLICIT - no defaulting
 * - Context must be EXPLICIT - no inference
 * - Missing context means scoped rules do not apply
 *
 * The intent provides context. Rules declare applicability.
 * The engine matches them. That's the entire contract.
 */
export type IntentContext = {
  /**
   * Current game mode
   *
   * CRITICAL: This must be explicitly provided.
   * There is NO default. There is NO inference.
   *
   * If this is not provided, rules with mode requirements do not run.
   */
  readonly mode: GameMode;
};

// ============================================================================
// APPLICABILITY CHECKING (PURE FUNCTION)
// ============================================================================

/**
 * Check if a rule is applicable given the intent context
 *
 * CRITICAL INVARIANTS:
 * - This is a PURE function (no side effects)
 * - This returns boolean only (applicable or not)
 * - This does NOT affect rule behavior
 * - This does NOT emit warnings or conflicts
 * - Non-applicable rules are SILENT
 *
 * @param applicability - The rule's declared applicability (may be undefined)
 * @param context - The intent's context (may be undefined)
 * @returns true if rule should run, false if rule should be skipped
 */
export function isRuleApplicable(
  applicability: RuleApplicability | undefined,
  context: IntentContext | undefined
): boolean {
  // No applicability declared → rule does not apply
  if (applicability === undefined) {
    return false;
  }

  // No context provided → scoped rules do not apply
  if (context === undefined) {
    return false;
  }

  // Empty modes array → rule applies to no modes
  if (applicability.modes.length === 0) {
    return false;
  }

  // Check if context mode is in applicability modes
  return applicability.modes.includes(context.mode);
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for GameMode
 */
export function isGameMode(value: unknown): value is GameMode {
  return value === 'combat' || value === 'downtime' || value === 'social';
}

/**
 * Type guard for RuleApplicability
 */
export function isRuleApplicability(value: unknown): value is RuleApplicability {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.modes)) return false;
  for (const mode of obj.modes) {
    if (!isGameMode(mode)) return false;
  }

  if (obj.tags !== undefined) {
    if (!Array.isArray(obj.tags)) return false;
    for (const tag of obj.tags) {
      if (typeof tag !== 'string') return false;
    }
  }

  return true;
}

/**
 * Type guard for IntentContext
 */
export function isIntentContext(value: unknown): value is IntentContext {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return isGameMode(obj.mode);
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a RuleApplicability declaration
 *
 * CRITICAL: Applicability must be EXPLICIT.
 * This function does NOT provide defaults.
 */
export function createRuleApplicability(
  modes: readonly GameMode[],
  tags?: readonly string[]
): RuleApplicability {
  return {
    modes,
    ...(tags !== undefined && { tags }),
  };
}

/**
 * Create an IntentContext
 *
 * CRITICAL: Context must be EXPLICIT.
 * This function does NOT provide defaults.
 */
export function createIntentContext(mode: GameMode): IntentContext {
  return { mode };
}
