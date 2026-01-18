/**
 * DealDamage Effect
 *
 * Declares that damage would be dealt to a target.
 * Does NOT deal the damage - merely describes the intent.
 *
 * CRITICAL: Amount is OPAQUE. Resolution does NOT:
 * - Roll dice
 * - Calculate damage
 * - Apply modifiers
 * - Interpret Savage Worlds rules
 *
 * The amount comes from elsewhere, fully calculated.
 *
 * Examples:
 * - Deal 2 Wounds to target
 * - Deal damage descriptor "2d6+2" (opaque string)
 */

import type { Effect, EffectAuthority, EffectTarget } from '../types';
import { EffectType } from '../types';

/**
 * Parameters specific to DealDamage
 *
 * All values are OPAQUE - resolution does not interpret them.
 */
export type DealDamageParameters = {
  /**
   * Damage descriptor (opaque)
   *
   * This could be:
   * - A number (pre-calculated wounds)
   * - A string (dice expression, passed through)
   * - An object (complex damage info)
   *
   * Resolution does NOT interpret this.
   */
  readonly damageDescriptor: unknown;

  /** Damage type (opaque string) */
  readonly damageType?: string;

  /** Source of damage (opaque string) */
  readonly source?: string;
};

/**
 * Create a DealDamage effect
 *
 * Pure function. No side effects. No state mutation.
 * No dice rolling. No damage calculation.
 */
export function createDealDamageEffect(params: {
  readonly effectId: string;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly damageDescriptor: unknown;
  readonly damageType?: string;
  readonly source?: string;
}): Effect {
  const parameters: DealDamageParameters = {
    damageDescriptor: params.damageDescriptor,
    ...(params.damageType !== undefined && { damageType: params.damageType }),
    ...(params.source !== undefined && { source: params.source }),
  };

  // Description is intentionally vague - we don't interpret the descriptor
  const descriptorStr = typeof params.damageDescriptor === 'string'
    ? params.damageDescriptor
    : typeof params.damageDescriptor === 'number'
      ? String(params.damageDescriptor)
      : 'damage';

  return {
    effectId: params.effectId,
    effectType: EffectType.DEAL_DAMAGE,
    target: params.target,
    authority: params.authority,
    parameters,
    description: `Deal ${descriptorStr} to ${params.target.targetType} ${params.target.targetId}`,
  };
}
