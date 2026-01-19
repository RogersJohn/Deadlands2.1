/**
 * Effect DTO Contracts (FE-PR 0.1)
 *
 * CRITICAL: These types mirror backend DTOs EXACTLY.
 * - No derived fields
 * - No convenience helpers
 * - No interpretation
 * - Frontend is CONSUMER ONLY
 */

import type { RulesOutcome } from './ValidationReport';

/**
 * EffectType - categories of effects
 */
export type EffectType =
  | 'APPLY_CONDITION'
  | 'CONSUME_RESOURCE'
  | 'DEAL_DAMAGE'
  | 'CHANGE_POSITION'
  | 'TRIGGER_NARRATIVE'
  | 'GRANT_RESOURCE'
  | 'REMOVE_CONDITION';

/**
 * EffectTarget - who or what is affected
 */
export type EffectTarget = {
  readonly targetId: string;
  readonly targetType: string;
};

/**
 * EffectAuthority - why this effect exists
 */
export type EffectAuthority = {
  readonly invocationId: string;
  readonly source: 'RULES' | 'OVERRIDE';
  readonly outcome: RulesOutcome;
};

/**
 * Effect - declarative effect
 */
export type Effect = {
  readonly effectId: string;
  readonly effectType: EffectType;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly description: string;
};

/**
 * ResolutionOutcome - why resolution produced effects (or not)
 */
export type ResolutionOutcome =
  | 'EFFECTS_PRODUCED'
  | 'NO_EFFECTS_FAIL'
  | 'NO_EFFECTS_AMBIGUOUS'
  | 'NO_EFFECTS_NO_PRODUCER';

/**
 * ResolutionResult - resolution output
 */
export type ResolutionResult = {
  readonly outcome: ResolutionOutcome;
  readonly effects: readonly Effect[];
  readonly explanation: string;
};
