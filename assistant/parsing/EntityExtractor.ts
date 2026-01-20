/**
 * EntityExtractor - Extracts named entities from natural language
 *
 * Heuristic-based extraction. Not NLP perfection, but robust for
 * common Savage Worlds action descriptions.
 */

import type { AssumptionTracker } from '../core/AssumptionTracker';

/**
 * Extracted entities from natural language input
 */
export interface ExtractedEntities {
  /** The actor performing the action (if found) */
  readonly actor: string | null;

  /** The target of the action (if found) */
  readonly target: string | null;

  /** Distance in yards (if found) */
  readonly distanceYards: number | null;

  /** Weapon mentioned (if found) */
  readonly weapon: string | null;

  /** Location/setting (if found) */
  readonly location: string | null;
}

/**
 * Patterns for entity extraction
 */
const PATTERNS = {
  // Actor patterns: "Alice shoots", "The cowboy attacks"
  actor: [
    /^(\w+)\s+(?:shoots?|fires?|attacks?|casts?|throws?|stabs?|punches?|kicks?)/i,
    /^(?:the\s+)?(\w+(?:\s+\w+)?)\s+(?:shoots?|fires?|attacks?|casts?)/i,
  ],

  // Target patterns: "shoots at Bob", "attacks the bandit"
  target: [
    /(?:at|toward|towards)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
    /(?:shoots?|fires?\s+at|attacks?)\s+(?:the\s+)?(\w+)/i,
  ],

  // Distance patterns: "100 yards away", "at 50 yards", "from 20 yards"
  distance: [
    /(\d+)\s*(?:yards?|yds?)\s*(?:away)?/i,
    /(?:at|from)\s+(\d+)\s*(?:yards?|yds?)/i,
    /range\s+(?:of\s+)?(\d+)/i,
  ],

  // Weapon patterns
  weapon: [
    /(?:with\s+(?:a\s+|an\s+|the\s+)?)(pistol|revolver|rifle|shotgun|bow|crossbow|knife|sword|axe)/i,
    /(?:fires?\s+(?:a\s+|an\s+|the\s+)?)(pistol|revolver|rifle|shotgun)/i,
    /(colt|winchester|remington|sharps|derringer)/i,
  ],

  // Location patterns
  location: [
    /(?:in|at|inside|within)\s+(?:a\s+|an\s+|the\s+)?(\w+(?:\s+\w+)?(?:\s+\w+)?)/i,
  ],
};

/**
 * Extracts entities from natural language text
 */
export class EntityExtractor {
  /**
   * Extract all entities from input text
   */
  extract(text: string, tracker: AssumptionTracker): ExtractedEntities {
    const normalizedText = text.toLowerCase().trim();

    return {
      actor: this.extractActor(normalizedText, text, tracker),
      target: this.extractTarget(normalizedText, text, tracker),
      distanceYards: this.extractDistance(normalizedText, tracker),
      weapon: this.extractWeapon(normalizedText, tracker),
      location: this.extractLocation(normalizedText, tracker),
    };
  }

  private extractActor(
    _normalized: string,
    original: string,
    tracker: AssumptionTracker
  ): string | null {
    for (const pattern of PATTERNS.actor) {
      const match = original.match(pattern);
      if (match && match[1]) {
        return this.capitalize(match[1]);
      }
    }

    // If no actor found, we'll need to assume one
    tracker.assumeMedium(
      'Actor is the active player character',
      'actor',
      'No actor explicitly named in input'
    );
    return null;
  }

  private extractTarget(
    _normalized: string,
    original: string,
    tracker: AssumptionTracker
  ): string | null {
    for (const pattern of PATTERNS.target) {
      const match = original.match(pattern);
      if (match && match[1]) {
        return this.capitalize(match[1]);
      }
    }

    // Check for pronouns that indicate a target
    if (/\b(him|her|them|it)\b/i.test(original)) {
      tracker.assumeLow(
        'Target is the previously mentioned enemy',
        'target',
        'Pronoun used without explicit target name'
      );
      return null;
    }

    tracker.assumeMedium(
      'Target is the primary threat in the scene',
      'target',
      'No target explicitly named in input'
    );
    return null;
  }

  private extractDistance(normalized: string, _tracker: AssumptionTracker): number | null {
    for (const pattern of PATTERNS.distance) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    // No distance specified - will need to assume
    return null;
  }

  private extractWeapon(normalized: string, _tracker: AssumptionTracker): string | null {
    for (const pattern of PATTERNS.weapon) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return this.capitalize(match[1]);
      }
    }

    return null;
  }

  private extractLocation(normalized: string, _tracker: AssumptionTracker): string | null {
    for (const pattern of PATTERNS.location) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        // Filter out common false positives
        const location = match[1].toLowerCase();
        if (!['a', 'an', 'the', 'him', 'her', 'them'].includes(location)) {
          return this.capitalize(match[1]);
        }
      }
    }

    return null;
  }

  private capitalize(text: string): string {
    return text
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
