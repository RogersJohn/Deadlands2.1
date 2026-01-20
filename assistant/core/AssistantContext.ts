/**
 * AssistantContext - Aggregates all parsed context for the assistant
 *
 * This is the intermediate state between raw input and final output.
 * It holds all extracted entities, parsed intent, and gathered assumptions.
 */

import type { ParsedIntent } from '../parsing/IntentParser';
import type { ExtractedEntities } from '../parsing/EntityExtractor';
import type { Assumption, RollModifier, SuggestedRoll } from '../types';

/**
 * Complete context gathered during processing
 */
export interface AssistantContext {
  /** Original raw input text */
  readonly rawText: string;

  /** Game system being used */
  readonly system: 'deadlands';

  /** Parsed intent from the input */
  readonly intent: ParsedIntent;

  /** Extracted entities from the input */
  readonly entities: ExtractedEntities;

  /** The suggested roll */
  readonly suggestedRoll: SuggestedRoll;

  /** All applicable modifiers */
  readonly modifiers: readonly RollModifier[];

  /** All assumptions made during processing */
  readonly assumptions: readonly Assumption[];

  /** Additional notes generated */
  readonly notes: readonly string[];
}

/**
 * Builder for AssistantContext
 */
export class AssistantContextBuilder {
  private rawText: string = '';
  private system: 'deadlands' = 'deadlands';
  private intent: ParsedIntent | null = null;
  private entities: ExtractedEntities | null = null;
  private suggestedRoll: SuggestedRoll | null = null;
  private modifiers: RollModifier[] = [];
  private assumptions: Assumption[] = [];
  private notes: string[] = [];

  setRawText(text: string): this {
    this.rawText = text;
    return this;
  }

  setSystem(system: 'deadlands'): this {
    this.system = system;
    return this;
  }

  setIntent(intent: ParsedIntent): this {
    this.intent = intent;
    return this;
  }

  setEntities(entities: ExtractedEntities): this {
    this.entities = entities;
    return this;
  }

  setSuggestedRoll(roll: SuggestedRoll): this {
    this.suggestedRoll = roll;
    return this;
  }

  setModifiers(modifiers: readonly RollModifier[]): this {
    this.modifiers = [...modifiers];
    return this;
  }

  setAssumptions(assumptions: readonly Assumption[]): this {
    this.assumptions = [...assumptions];
    return this;
  }

  addNote(note: string): this {
    this.notes.push(note);
    return this;
  }

  setNotes(notes: readonly string[]): this {
    this.notes = [...notes];
    return this;
  }

  /**
   * Build the final context
   * @throws Error if required fields are missing
   */
  build(): AssistantContext {
    if (!this.intent) {
      throw new Error('AssistantContext requires intent');
    }
    if (!this.entities) {
      throw new Error('AssistantContext requires entities');
    }
    if (!this.suggestedRoll) {
      throw new Error('AssistantContext requires suggestedRoll');
    }

    return {
      rawText: this.rawText,
      system: this.system,
      intent: this.intent,
      entities: this.entities,
      suggestedRoll: this.suggestedRoll,
      modifiers: [...this.modifiers],
      assumptions: [...this.assumptions],
      notes: [...this.notes],
    };
  }
}
