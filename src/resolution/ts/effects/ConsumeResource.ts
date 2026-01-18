/**
 * ConsumeResource Effect
 *
 * Declares that a resource would be consumed from a target.
 * Does NOT consume the resource - merely describes the intent.
 *
 * Examples:
 * - Spend 1 Benny
 * - Use 3 rounds of ammunition
 * - Expend a power point
 */

import type { Effect, EffectAuthority, EffectTarget } from '../types';
import { EffectType } from '../types';

/**
 * Parameters specific to ConsumeResource
 *
 * Amount is OPAQUE - resolution does not calculate it.
 * The value comes from elsewhere (intent payload, rules output).
 */
export type ConsumeResourceParameters = {
  /** Name of the resource to consume (opaque string) */
  readonly resourceName: string;

  /** Amount to consume (opaque number - not calculated here) */
  readonly amount: number;

  /** Optional reason for consumption */
  readonly reason?: string;
};

/**
 * Create a ConsumeResource effect
 *
 * Pure function. No side effects. No state mutation.
 */
export function createConsumeResourceEffect(params: {
  readonly effectId: string;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly resourceName: string;
  readonly amount: number;
  readonly reason?: string;
}): Effect {
  const parameters: ConsumeResourceParameters = {
    resourceName: params.resourceName,
    amount: params.amount,
    ...(params.reason !== undefined && { reason: params.reason }),
  };

  return {
    effectId: params.effectId,
    effectType: EffectType.CONSUME_RESOURCE,
    target: params.target,
    authority: params.authority,
    parameters,
    description: `Consume ${params.amount} ${params.resourceName} from ${params.target.targetType} ${params.target.targetId}`,
  };
}
