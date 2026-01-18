/**
 * GrantResource Effect
 *
 * Declares that a resource would be granted to a target.
 * Does NOT grant the resource - merely describes the intent.
 *
 * Examples:
 * - Grant 1 Benny
 * - Add temporary bonus
 * - Restore power points
 */

import type { Effect, EffectAuthority, EffectTarget } from '../types';
import { EffectType } from '../types';

/**
 * Parameters specific to GrantResource
 *
 * Amount is OPAQUE - resolution does not calculate it.
 */
export type GrantResourceParameters = {
  /** Name of the resource to grant (opaque string) */
  readonly resourceName: string;

  /** Amount to grant (opaque number - not calculated here) */
  readonly amount: number;

  /** Optional reason for granting */
  readonly reason?: string;

  /** Optional duration descriptor */
  readonly duration?: string;
};

/**
 * Create a GrantResource effect
 *
 * Pure function. No side effects. No state mutation.
 */
export function createGrantResourceEffect(params: {
  readonly effectId: string;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly resourceName: string;
  readonly amount: number;
  readonly reason?: string;
  readonly duration?: string;
}): Effect {
  const parameters: GrantResourceParameters = {
    resourceName: params.resourceName,
    amount: params.amount,
    ...(params.reason !== undefined && { reason: params.reason }),
    ...(params.duration !== undefined && { duration: params.duration }),
  };

  return {
    effectId: params.effectId,
    effectType: EffectType.GRANT_RESOURCE,
    target: params.target,
    authority: params.authority,
    parameters,
    description: `Grant ${params.amount} ${params.resourceName} to ${params.target.targetType} ${params.target.targetId}`,
  };
}
