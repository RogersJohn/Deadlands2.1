/**
 * Rule Applicability Module Exports (PR 6.1)
 *
 * CRITICAL INVARIANT: Applicability is filtering, not decision-making.
 *
 * This module exports types and functions for explicit rule applicability scoping.
 */

// Types
export type {
  GameMode,
  RuleApplicability,
  IntentContext,
} from './types';

// Functions
export {
  isRuleApplicable,
  isGameMode,
  isRuleApplicability,
  isIntentContext,
  createRuleApplicability,
  createIntentContext,
} from './types';
