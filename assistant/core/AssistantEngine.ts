/**
 * AssistantEngine - Main orchestrator for the Rules Assistant Logic Layer
 *
 * This module provides suggested rulings based on common
 * Savage Worlds: Deadlands interpretations.
 *
 * Output is advisory, not authoritative.
 * Assumptions are explicit and challengeable.
 *
 * Key guarantees:
 * - Always produces a suggestion (never "UNRESOLVED")
 * - Assumptions are always explicit
 * - No frontend dependencies
 * - No engine logic modifications
 * - Output format is stable and documented
 */

import type { AssistantInput, AssistantOutput } from '../types';
import { createAssistantOutput } from '../types';
import { AssumptionTracker } from './AssumptionTracker';
import { AssistantContextBuilder } from './AssistantContext';
import { ModifierResolver } from './ModifierResolver';
import { RollSuggester } from './RollSuggester';
import { IntentParser } from '../parsing/IntentParser';
import { EntityExtractor } from '../parsing/EntityExtractor';
import { detectEnvironment, DEADLANDS_ENVIRONMENTS } from '../rules/DeadlandsModifiers';

/**
 * The main assistant engine
 *
 * Typical usage:
 * ```typescript
 * const engine = new AssistantEngine();
 * const result = engine.process({ rawText: "Alice shoots at Bob, 50 yards away" });
 * console.log(result.suggestedRoll); // { trait: "Shooting", targetNumber: 4 }
 * console.log(result.modifiers);     // [{ label: "Medium Range", value: -2, ... }]
 * console.log(result.assumptions);   // [...explicit assumptions...]
 * ```
 */
export class AssistantEngine {
  private readonly intentParser: IntentParser;
  private readonly entityExtractor: EntityExtractor;
  private readonly modifierResolver: ModifierResolver;
  private readonly rollSuggester: RollSuggester;

  constructor() {
    this.intentParser = new IntentParser();
    this.entityExtractor = new EntityExtractor();
    this.modifierResolver = new ModifierResolver();
    this.rollSuggester = new RollSuggester();
  }

  /**
   * Process natural language input and produce a suggested roll
   *
   * This method always returns a valid AssistantOutput.
   * It never throws or returns "UNRESOLVED".
   */
  process(input: AssistantInput): AssistantOutput {
    const tracker = new AssumptionTracker();
    const rawText = input.rawText.trim();

    // Validate input
    if (!rawText) {
      tracker.assumeLow(
        'Empty input provided, assuming a generic action',
        'intent',
        'No text provided'
      );
      return this.createDefaultOutput(tracker, '');
    }

    // Step 1: Parse intent
    const intent = this.intentParser.parse(rawText, tracker);

    // Step 2: Extract entities
    const entities = this.entityExtractor.extract(rawText, tracker);

    // Step 3: Suggest the roll
    const suggestedRoll = this.rollSuggester.suggest(intent, rawText, tracker);

    // Step 4: Resolve modifiers
    const modifiers = this.modifierResolver.resolve(
      { intent, entities, rawText },
      tracker
    );

    // Step 5: Generate notes
    const notes = this.generateNotes(rawText, intent, entities, tracker);

    // Step 6: Build context (for potential future use / extension)
    // The context aggregates all parsed data and could be used for:
    // - Caching / memoization
    // - Debugging / inspection
    // - Extension hooks
    void new AssistantContextBuilder()
      .setRawText(rawText)
      .setSystem('deadlands')
      .setIntent(intent)
      .setEntities(entities)
      .setSuggestedRoll(suggestedRoll)
      .setModifiers(modifiers)
      .setAssumptions(tracker.getAssumptions())
      .setNotes(notes)
      .build();

    // Step 7: Create output
    return createAssistantOutput(
      suggestedRoll,
      modifiers,
      tracker.getAssumptions(),
      notes,
      rawText
    );
  }

  /**
   * Create a default output for edge cases
   */
  private createDefaultOutput(
    tracker: AssumptionTracker,
    rawText: string
  ): AssistantOutput {
    return createAssistantOutput(
      { trait: 'Common Knowledge', targetNumber: 4 },
      [],
      tracker.getAssumptions(),
      ['Unable to parse specific action. Consider rephrasing the input.'],
      rawText
    );
  }

  /**
   * Generate helpful notes based on the context
   */
  private generateNotes(
    rawText: string,
    intent: ReturnType<IntentParser['parse']>,
    entities: ReturnType<EntityExtractor['extract']>,
    tracker: AssumptionTracker
  ): string[] {
    const notes: string[] = [];

    // Add combat-specific notes
    if (intent.isCombat) {
      if (intent.actionType === 'fighting') {
        notes.push('Fighting attacks target Parry (2 + half Fighting die). Actual Parry depends on target.');
      }
      if (intent.actionType === 'shooting' && !entities.weapon) {
        notes.push('Weapon not specified. Range bands may vary by actual weapon used.');
      }
    }

    // Add movement notes
    if (intent.movementType === 'mounted') {
      notes.push('Mounted characters may use Riding skill to negate Unstable Platform penalty.');
    }

    // Add environment notes
    const env = detectEnvironment(rawText, tracker);
    if (env) {
      const envData = DEADLANDS_ENVIRONMENTS[env];
      notes.push(...envData.notes);
    }

    // Add arcane notes
    if (intent.actionType === 'arcane') {
      notes.push('Spellcasting may require Power Points. Backlash possible on critical failure.');
    }

    // Add range notes for extreme range
    if (entities.distanceYards && entities.distanceYards > 48) {
      notes.push('Extreme range may not be possible with all weapons. Check weapon range increment.');
    }

    return notes;
  }
}

/**
 * Factory function for creating an AssistantEngine
 */
export function createAssistantEngine(): AssistantEngine {
  return new AssistantEngine();
}
