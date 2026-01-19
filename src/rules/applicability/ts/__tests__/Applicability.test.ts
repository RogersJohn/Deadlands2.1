/**
 * Rule Applicability Tests (PR 6.1)
 *
 * CRITICAL TEST: Applicability is filtering, not decision-making.
 *
 * These tests prove:
 * - Applicability is explicit (no defaults)
 * - Non-applicable rules are skipped silently
 * - Context must be provided explicitly
 * - Applicability affects only inclusion/exclusion
 */

import { describe, it, expect } from 'vitest';
import {
  isRuleApplicable,
  isGameMode,
  isRuleApplicability,
  isIntentContext,
  createRuleApplicability,
  createIntentContext,
} from '../types';
import type { RuleApplicability, IntentContext, GameMode } from '../types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const COMBAT_CONTEXT: IntentContext = createIntentContext('combat');
const DOWNTIME_CONTEXT: IntentContext = createIntentContext('downtime');
const SOCIAL_CONTEXT: IntentContext = createIntentContext('social');

const COMBAT_ONLY_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat']);
const DOWNTIME_ONLY_APPLICABILITY: RuleApplicability = createRuleApplicability(['downtime']);
const SOCIAL_ONLY_APPLICABILITY: RuleApplicability = createRuleApplicability(['social']);
const COMBAT_AND_SOCIAL_APPLICABILITY: RuleApplicability = createRuleApplicability(['combat', 'social']);
const EMPTY_APPLICABILITY: RuleApplicability = createRuleApplicability([]);

// ============================================================================
// CRITICAL TEST: APPLICABLE RULE RUNS
// ============================================================================

describe('Applicability - Applicable Rule Runs', () => {
  it('rule with combat applicability is applicable in combat context', () => {
    expect(isRuleApplicable(COMBAT_ONLY_APPLICABILITY, COMBAT_CONTEXT)).toBe(true);
  });

  it('rule with downtime applicability is applicable in downtime context', () => {
    expect(isRuleApplicable(DOWNTIME_ONLY_APPLICABILITY, DOWNTIME_CONTEXT)).toBe(true);
  });

  it('rule with social applicability is applicable in social context', () => {
    expect(isRuleApplicable(SOCIAL_ONLY_APPLICABILITY, SOCIAL_CONTEXT)).toBe(true);
  });

  it('rule with multiple modes is applicable when context matches any mode', () => {
    expect(isRuleApplicable(COMBAT_AND_SOCIAL_APPLICABILITY, COMBAT_CONTEXT)).toBe(true);
    expect(isRuleApplicable(COMBAT_AND_SOCIAL_APPLICABILITY, SOCIAL_CONTEXT)).toBe(true);
  });
});

// ============================================================================
// CRITICAL TEST: NON-APPLICABLE RULE DOES NOT RUN
// ============================================================================

describe('Applicability - Non-Applicable Rule Does Not Run', () => {
  it('rule with combat applicability is NOT applicable in downtime context', () => {
    expect(isRuleApplicable(COMBAT_ONLY_APPLICABILITY, DOWNTIME_CONTEXT)).toBe(false);
  });

  it('rule with combat applicability is NOT applicable in social context', () => {
    expect(isRuleApplicable(COMBAT_ONLY_APPLICABILITY, SOCIAL_CONTEXT)).toBe(false);
  });

  it('rule with downtime applicability is NOT applicable in combat context', () => {
    expect(isRuleApplicable(DOWNTIME_ONLY_APPLICABILITY, COMBAT_CONTEXT)).toBe(false);
  });

  it('rule with multiple modes is NOT applicable when context matches none', () => {
    expect(isRuleApplicable(COMBAT_AND_SOCIAL_APPLICABILITY, DOWNTIME_CONTEXT)).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: MISSING CONTEXT
// ============================================================================

describe('Applicability - Missing Context', () => {
  it('rule is NOT applicable when context is undefined', () => {
    expect(isRuleApplicable(COMBAT_ONLY_APPLICABILITY, undefined)).toBe(false);
  });

  it('rule with any applicability is NOT applicable when context is undefined', () => {
    expect(isRuleApplicable(DOWNTIME_ONLY_APPLICABILITY, undefined)).toBe(false);
    expect(isRuleApplicable(SOCIAL_ONLY_APPLICABILITY, undefined)).toBe(false);
    expect(isRuleApplicable(COMBAT_AND_SOCIAL_APPLICABILITY, undefined)).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: NO DEFAULTS
// ============================================================================

describe('Applicability - No Defaults', () => {
  it('rule is NOT applicable when applicability is undefined', () => {
    expect(isRuleApplicable(undefined, COMBAT_CONTEXT)).toBe(false);
  });

  it('rule with empty modes array is never applicable', () => {
    expect(isRuleApplicable(EMPTY_APPLICABILITY, COMBAT_CONTEXT)).toBe(false);
    expect(isRuleApplicable(EMPTY_APPLICABILITY, DOWNTIME_CONTEXT)).toBe(false);
    expect(isRuleApplicable(EMPTY_APPLICABILITY, SOCIAL_CONTEXT)).toBe(false);
  });

  it('both undefined applicability and undefined context returns false', () => {
    expect(isRuleApplicable(undefined, undefined)).toBe(false);
  });
});

// ============================================================================
// CRITICAL TEST: SILENT NON-APPLICATION
// ============================================================================

describe('Applicability - Silent Non-Application', () => {
  it('isRuleApplicable returns boolean only', () => {
    const result = isRuleApplicable(COMBAT_ONLY_APPLICABILITY, DOWNTIME_CONTEXT);

    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
    // No warnings, no conflicts, no errors - just false
  });

  it('non-applicable result is indistinguishable from any other false', () => {
    const nonApplicable = isRuleApplicable(COMBAT_ONLY_APPLICABILITY, DOWNTIME_CONTEXT);
    const missingContext = isRuleApplicable(COMBAT_ONLY_APPLICABILITY, undefined);
    const missingApplicability = isRuleApplicable(undefined, COMBAT_CONTEXT);

    // All return false, no special markers
    expect(nonApplicable).toBe(false);
    expect(missingContext).toBe(false);
    expect(missingApplicability).toBe(false);
  });
});

// ============================================================================
// TYPE GUARD TESTS
// ============================================================================

describe('Applicability - Type Guards', () => {
  it('isGameMode validates game mode values', () => {
    expect(isGameMode('combat')).toBe(true);
    expect(isGameMode('downtime')).toBe(true);
    expect(isGameMode('social')).toBe(true);

    expect(isGameMode('invalid')).toBe(false);
    expect(isGameMode('')).toBe(false);
    expect(isGameMode(null)).toBe(false);
    expect(isGameMode(undefined)).toBe(false);
    expect(isGameMode(123)).toBe(false);
  });

  it('isRuleApplicability validates applicability structure', () => {
    expect(isRuleApplicability({ modes: ['combat'] })).toBe(true);
    expect(isRuleApplicability({ modes: ['combat', 'social'] })).toBe(true);
    expect(isRuleApplicability({ modes: [] })).toBe(true);
    expect(isRuleApplicability({ modes: ['combat'], tags: ['action'] })).toBe(true);

    expect(isRuleApplicability(null)).toBe(false);
    expect(isRuleApplicability(undefined)).toBe(false);
    expect(isRuleApplicability({})).toBe(false);
    expect(isRuleApplicability({ modes: 'combat' })).toBe(false);
    expect(isRuleApplicability({ modes: ['invalid'] })).toBe(false);
  });

  it('isIntentContext validates context structure', () => {
    expect(isIntentContext({ mode: 'combat' })).toBe(true);
    expect(isIntentContext({ mode: 'downtime' })).toBe(true);
    expect(isIntentContext({ mode: 'social' })).toBe(true);

    expect(isIntentContext(null)).toBe(false);
    expect(isIntentContext(undefined)).toBe(false);
    expect(isIntentContext({})).toBe(false);
    expect(isIntentContext({ mode: 'invalid' })).toBe(false);
  });
});

// ============================================================================
// FACTORY FUNCTION TESTS
// ============================================================================

describe('Applicability - Factory Functions', () => {
  it('createRuleApplicability creates valid applicability', () => {
    const applicability = createRuleApplicability(['combat', 'social'], ['action', 'weapon']);

    expect(applicability.modes).toEqual(['combat', 'social']);
    expect(applicability.tags).toEqual(['action', 'weapon']);
    expect(isRuleApplicability(applicability)).toBe(true);
  });

  it('createRuleApplicability works without tags', () => {
    const applicability = createRuleApplicability(['combat']);

    expect(applicability.modes).toEqual(['combat']);
    expect(applicability.tags).toBeUndefined();
    expect(isRuleApplicability(applicability)).toBe(true);
  });

  it('createIntentContext creates valid context', () => {
    const context = createIntentContext('combat');

    expect(context.mode).toBe('combat');
    expect(isIntentContext(context)).toBe(true);
  });
});

// ============================================================================
// CRITICAL ASSERTION: NO PRIORITY, NO ORDERING
// ============================================================================

describe('Applicability - No Priority or Ordering', () => {
  it('applicability does not include priority field', () => {
    const applicability = createRuleApplicability(['combat']);

    expect('priority' in applicability).toBe(false);
    expect('order' in applicability).toBe(false);
    expect('precedence' in applicability).toBe(false);
  });

  it('applicability result is boolean, not rank', () => {
    const result1 = isRuleApplicable(
      createRuleApplicability(['combat']),
      COMBAT_CONTEXT
    );
    const result2 = isRuleApplicable(
      createRuleApplicability(['combat', 'social']),
      COMBAT_CONTEXT
    );

    // Both are just true, not "more applicable" or "less applicable"
    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result1 === result2).toBe(true);
  });
});

// ============================================================================
// CRITICAL ASSERTION: TAGS ARE DESCRIPTIVE ONLY
// ============================================================================

describe('Applicability - Tags Are Descriptive Only', () => {
  it('tags do not affect applicability', () => {
    const withTags = createRuleApplicability(['combat'], ['action', 'weapon']);
    const withoutTags = createRuleApplicability(['combat']);

    expect(isRuleApplicable(withTags, COMBAT_CONTEXT)).toBe(true);
    expect(isRuleApplicable(withoutTags, COMBAT_CONTEXT)).toBe(true);

    expect(isRuleApplicable(withTags, DOWNTIME_CONTEXT)).toBe(false);
    expect(isRuleApplicable(withoutTags, DOWNTIME_CONTEXT)).toBe(false);
  });

  it('tags are strings, not logic', () => {
    const applicability = createRuleApplicability(['combat'], ['action', 'weapon', 'reload']);

    expect(applicability.tags?.every(t => typeof t === 'string')).toBe(true);
  });
});
