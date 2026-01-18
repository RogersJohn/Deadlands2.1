/**
 * ChangePosition Effect
 *
 * Declares that a target's position would change.
 * Does NOT change the position - merely describes the intent.
 *
 * Examples:
 * - Move character to coordinates (x, y)
 * - Push target 2 squares away
 * - Teleport to named location
 */

import type { Effect, EffectAuthority, EffectTarget } from '../types';
import { EffectType } from '../types';

/**
 * Parameters specific to ChangePosition
 *
 * Position data is OPAQUE - resolution does not interpret it.
 * The position system is defined elsewhere.
 */
export type ChangePositionParameters = {
  /**
   * Position descriptor (opaque)
   *
   * This could be:
   * - Coordinates { x, y }
   * - Named location string
   * - Relative movement descriptor
   *
   * Resolution does NOT interpret this.
   */
  readonly positionDescriptor: unknown;

  /** Movement type (opaque string) */
  readonly movementType?: string;

  /** Reason for movement */
  readonly reason?: string;
};

/**
 * Create a ChangePosition effect
 *
 * Pure function. No side effects. No state mutation.
 */
export function createChangePositionEffect(params: {
  readonly effectId: string;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly positionDescriptor: unknown;
  readonly movementType?: string;
  readonly reason?: string;
}): Effect {
  const parameters: ChangePositionParameters = {
    positionDescriptor: params.positionDescriptor,
    ...(params.movementType !== undefined && { movementType: params.movementType }),
    ...(params.reason !== undefined && { reason: params.reason }),
  };

  return {
    effectId: params.effectId,
    effectType: EffectType.CHANGE_POSITION,
    target: params.target,
    authority: params.authority,
    parameters,
    description: `Change position of ${params.target.targetType} ${params.target.targetId}`,
  };
}
