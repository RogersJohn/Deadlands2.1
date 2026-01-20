import { parseIntent } from "./parsing/IntentParser";
import { resolveRoll } from "./resolution/RollResolver";
import { AssistantOutput } from "./types/AssistantOutput";

/**
 * AssistantEngine
 *
 * Provides suggested rulings for Savage Worlds: Deadlands.
 * Output is advisory, not authoritative.
 * Ambiguity is resolved via explicit assumptions.
 */
export class AssistantEngine {
  static suggestRoll(rawText: string): AssistantOutput {
    const intent = parseIntent(rawText);

    const resolution = resolveRoll(intent);

    return resolution;
  }
}
