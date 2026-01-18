/**
 * TriggerNarrative Effect
 *
 * Declares that a narrative event would be triggered.
 * Does NOT trigger the event - merely describes the intent.
 *
 * Examples:
 * - Display story text
 * - Trigger cutscene
 * - Log combat description
 */

import type { Effect, EffectAuthority, EffectTarget } from '../types';
import { EffectType } from '../types';

/**
 * Parameters specific to TriggerNarrative
 *
 * Narrative content is OPAQUE - resolution does not interpret it.
 */
export type TriggerNarrativeParameters = {
  /** The narrative event identifier or content (opaque) */
  readonly narrativeDescriptor: unknown;

  /** Category of narrative (opaque string) */
  readonly category?: string;

  /** Priority or urgency (opaque) */
  readonly priority?: string;
};

/**
 * Create a TriggerNarrative effect
 *
 * Pure function. No side effects. No state mutation.
 */
export function createTriggerNarrativeEffect(params: {
  readonly effectId: string;
  readonly target: EffectTarget;
  readonly authority: EffectAuthority;
  readonly narrativeDescriptor: unknown;
  readonly category?: string;
  readonly priority?: string;
}): Effect {
  const parameters: TriggerNarrativeParameters = {
    narrativeDescriptor: params.narrativeDescriptor,
    ...(params.category !== undefined && { category: params.category }),
    ...(params.priority !== undefined && { priority: params.priority }),
  };

  return {
    effectId: params.effectId,
    effectType: EffectType.TRIGGER_NARRATIVE,
    target: params.target,
    authority: params.authority,
    parameters,
    description: `Trigger narrative event for ${params.target.targetType} ${params.target.targetId}`,
  };
}
