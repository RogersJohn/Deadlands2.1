/**
 * AssistantInput - Input contract for the Rules Assistant
 *
 * Natural language input only. No structured data required.
 * The assistant layer handles all parsing and inference.
 */

/**
 * Supported game systems
 */
export type GameSystem = 'deadlands';

/**
 * Input to the assistant layer
 */
export interface AssistantInput {
  /** Natural language description of the intended action */
  readonly rawText: string;

  /** Game system to use for heuristics (default: deadlands) */
  readonly system?: GameSystem;
}

/**
 * Creates a validated AssistantInput
 */
export function createAssistantInput(
  rawText: string,
  system: GameSystem = 'deadlands'
): AssistantInput {
  return {
    rawText: rawText.trim(),
    system,
  };
}
