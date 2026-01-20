/**
 * AssistantOutput - Output contract for the Rules Assistant
 *
 * This shape is mandatory and must never be violated.
 * The assistant ALWAYS produces a suggestion - it never emits "UNRESOLVED".
 */

import type { Assumption } from './Assumption';

/**
 * A modifier applied to the roll
 */
export interface RollModifier {
  /** Human-readable label (e.g., "Long Range") */
  readonly label: string;

  /** Numeric value (e.g., -2) */
  readonly value: number;

  /** Source rule or heuristic name */
  readonly source: string;
}

/**
 * The suggested roll
 */
export interface SuggestedRoll {
  /** The trait/skill to roll (e.g., "Shooting") */
  readonly trait: string;

  /** The target number (usually 4 in Savage Worlds) */
  readonly targetNumber: number;

  /** Optional: specific die type if known (e.g., "d8") */
  readonly dieType?: string;
}

/**
 * Complete output from the assistant layer
 *
 * This is advisory, not authoritative.
 * The GM may override any part of this output.
 */
export interface AssistantOutput {
  /** The suggested roll to make */
  readonly suggestedRoll: SuggestedRoll;

  /** All modifiers that apply to this roll */
  readonly modifiers: readonly RollModifier[];

  /** Sum of all modifier values */
  readonly netModifier: number;

  /** Explicit assumptions made during processing */
  readonly assumptions: readonly Assumption[];

  /** Additional notes about edge cases or variants */
  readonly notes: readonly string[];

  /** The original input text for reference */
  readonly originalInput: string;
}

/**
 * Creates an AssistantOutput with calculated netModifier
 */
export function createAssistantOutput(
  suggestedRoll: SuggestedRoll,
  modifiers: readonly RollModifier[],
  assumptions: readonly Assumption[],
  notes: readonly string[],
  originalInput: string
): AssistantOutput {
  const netModifier = modifiers.reduce((sum, mod) => sum + mod.value, 0);

  return {
    suggestedRoll,
    modifiers,
    netModifier,
    assumptions,
    notes,
    originalInput,
  };
}
