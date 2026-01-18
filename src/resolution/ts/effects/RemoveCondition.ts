/**
 * RemoveCondition Effect
 *
 * Declares that a condition would be removed from a target.
 * Does NOT remove the condition - merely describes the intent.
 *
 * Examples:
 * - Remove Shaken status
 * - Clear Wounded condition
 * - End Prone state
 */

import type { Effect, EffectAuthority, EffectTarget } from '../types';
import { EffectType } from '../types';

/**
 * Parameters specific to RemoveCondition
 *
 * These are OPAQUE - resolution does not interpret them.
 */
export type RemoveConditionParameters = {
  /** Name of the condition to remove (opaque string) */
  readonly conditionName: string;

  /** Optional reason for removal */
  readonly reason?: string;
};

/**
 * Create a RemoveCondition effect
 *
 * Pure function. No side effects. No state mutation.
 */
export function createRemoveConditionEffect(params: {
  readonly effectId: string;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly conditionName: string;
  readonly reason?: string;
}): Effect {
  const parameters: RemoveConditionParameters = {
    conditionName: params.conditionName,
    ...(params.reason !== undefined && { reason: params.reason }),
  };

  return {
    effectId: params.effectId,
    effectType: EffectType.REMOVE_CONDITION,
    target: params.target,
    authority: params.authority,
    parameters,
    description: `Remove condition "${params.conditionName}" from ${params.target.targetType} ${params.target.targetId}`,
  };
}
