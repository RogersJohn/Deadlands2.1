/**
 * RollSuggester - Suggests the roll to make based on parsed intent
 *
 * This module determines the trait to roll and target number.
 * It always produces a suggestion - never "UNRESOLVED".
 */

import type { AssumptionTracker } from './AssumptionTracker';
import type { ParsedIntent } from '../parsing/IntentParser';
import type { SuggestedRoll } from '../types';
import { TARGET_NUMBERS } from '../rules/SavageWorldsHeuristics';
import { DEADLANDS_SKILLS, detectArcaneBackground } from '../rules/DeadlandsModifiers';

/**
 * Suggests rolls based on intent
 */
export class RollSuggester {
  /**
   * Suggest a roll based on the parsed intent
   */
  suggest(intent: ParsedIntent, rawText: string, tracker: AssumptionTracker): SuggestedRoll {
    const trait = this.determineTrait(intent, rawText, tracker);
    const targetNumber = this.determineTargetNumber(intent, tracker);

    return {
      trait,
      targetNumber,
    };
  }

  private determineTrait(
    intent: ParsedIntent,
    rawText: string,
    tracker: AssumptionTracker
  ): string {
    // Special handling for arcane actions
    if (intent.actionType === 'arcane') {
      const arcaneBackground = detectArcaneBackground(rawText, tracker);
      if (arcaneBackground && DEADLANDS_SKILLS[arcaneBackground as keyof typeof DEADLANDS_SKILLS]) {
        return DEADLANDS_SKILLS[arcaneBackground as keyof typeof DEADLANDS_SKILLS];
      }
      // Default arcane skill
      return 'Spellcasting';
    }

    // Standard skill from intent
    if (intent.skill && intent.skill !== 'Common Knowledge') {
      return intent.skill;
    }

    // If unknown action type, try to infer from context
    if (intent.actionType === 'unknown') {
      return this.inferTraitFromContext(rawText, tracker);
    }

    return intent.skill;
  }

  private inferTraitFromContext(rawText: string, tracker: AssumptionTracker): string {
    const normalizedText = rawText.toLowerCase();

    // Social interactions
    if (/\b(?:talk|speak|convince|negotiate|charm|flatter)\b/i.test(normalizedText)) {
      tracker.assumeMedium(
        'This appears to be a Persuasion check',
        'skill',
        'Social/talking action inferred'
      );
      return 'Persuasion';
    }

    if (/\b(?:scare|threaten|intimidate|menace|glare)\b/i.test(normalizedText)) {
      tracker.assumeMedium(
        'This appears to be an Intimidation check',
        'skill',
        'Threatening action inferred'
      );
      return 'Intimidation';
    }

    // Physical checks
    if (/\b(?:climb|jump|swim|run|balance)\b/i.test(normalizedText)) {
      tracker.assumeMedium(
        'This appears to be an Athletics check',
        'skill',
        'Physical action inferred'
      );
      return 'Athletics';
    }

    // Perception
    if (/\b(?:look|search|spot|find|notice|see|hear)\b/i.test(normalizedText)) {
      tracker.assumeMedium(
        'This appears to be a Notice check',
        'skill',
        'Perception action inferred'
      );
      return 'Notice';
    }

    // Default fallback
    tracker.assumeLow(
      'Unable to determine specific skill, suggesting Common Knowledge',
      'skill',
      'No clear action pattern matched'
    );
    return 'Common Knowledge';
  }

  private determineTargetNumber(intent: ParsedIntent, tracker: AssumptionTracker): number {
    // In Savage Worlds, most rolls are against TN 4
    // Exceptions:
    // - Fighting rolls are against target's Parry
    // - Damage rolls are against target's Toughness
    // - Opposed rolls are against opponent's roll

    if (intent.actionType === 'fighting') {
      // Fighting is typically against Parry
      // We don't know the target's Parry, so we note this
      tracker.assumeMedium(
        'Target Number is 4 (standard). Actual TN may be target Parry.',
        'target',
        'Fighting rolls normally target Parry, which varies by target'
      );
      return TARGET_NUMBERS.STANDARD;
    }

    // Most other rolls use standard TN 4
    return TARGET_NUMBERS.STANDARD;
  }
}
