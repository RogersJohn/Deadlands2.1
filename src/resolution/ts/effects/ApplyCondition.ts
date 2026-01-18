/**
 * ApplyCondition Effect
 *
 * Declares that a condition would be applied to a target.
 * Does NOT apply the condition - merely describes the intent.
 *
 * Examples:
 * - Target becomes Shaken
 * - Target gains Wounded status
 * - Target is now Prone
 */

import type { Effect, EffectAuthority, EffectTarget } from '../types';
import { EffectType } from '../types';

/**
 * Parameters specific to ApplyCondition
 *
 * These are OPAQUE - resolution does not interpret them.
 * The condition name and any modifiers come from elsewhere.
 */
export type ApplyConditionParameters = {
  /** Name of the condition to apply (opaque string) */
  readonly conditionName: string;

  /** Optional duration descriptor (opaque) */
  readonly duration?: string;

  /** Optional source descriptor (what caused this) */
  readonly source?: string;
};

/**
 * Create an ApplyCondition effect
 *
 * Pure function. No side effects. No state mutation.
 */
export function createApplyConditionEffect(params: {
  readonly effectId: string;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly conditionName: string;
  readonly duration?: string;
  readonly source?: string;
}): Effect {
  const parameters: ApplyConditionParameters = {
    conditionName: params.conditionName,
    ...(params.duration !== undefined && { duration: params.duration }),
    ...(params.source !== undefined && { source: params.source }),
  };

  return {
    effectId: params.effectId,
    effectType: EffectType.APPLY_CONDITION,
    target: params.target,
    authority: params.authority,
    parameters,
    description: `Apply condition "${params.conditionName}" to ${params.target.targetType} ${params.target.targetId}`,
  };
}
