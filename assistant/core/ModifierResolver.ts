/**
 * ModifierResolver - Resolves all applicable modifiers for an action
 *
 * Modifiers are cumulative, list their source, and are reversible.
 * This module applies the heuristic modifier tables based on context.
 */

import type { AssumptionTracker } from './AssumptionTracker';
import type { ParsedIntent } from '../parsing/IntentParser';
import type { ExtractedEntities } from '../parsing/EntityExtractor';
import type { RollModifier } from '../types';
import {
  getRangeModifier,
  COVER_MODIFIERS,
  LIGHTING_MODIFIERS,
  MOVEMENT_MODIFIERS,
  SITUATIONAL_MODIFIERS,
  type CoverType,
  type LightingCondition,
} from '../rules/SavageWorldsHeuristics';
import { detectEnvironment, DEADLANDS_ENVIRONMENTS } from '../rules/DeadlandsModifiers';

/**
 * Context for modifier resolution
 */
export interface ModifierContext {
  readonly intent: ParsedIntent;
  readonly entities: ExtractedEntities;
  readonly rawText: string;
}

/**
 * Resolves modifiers based on context
 */
export class ModifierResolver {
  /**
   * Resolve all applicable modifiers
   */
  resolve(context: ModifierContext, tracker: AssumptionTracker): readonly RollModifier[] {
    const modifiers: RollModifier[] = [];

    // Range modifiers (for ranged actions)
    if (context.intent.isRanged) {
      this.addRangeModifiers(context, tracker, modifiers);
    }

    // Movement modifiers
    this.addMovementModifiers(context, tracker, modifiers);

    // Cover modifiers
    this.addCoverModifiers(context, tracker, modifiers);

    // Lighting modifiers
    this.addLightingModifiers(context, tracker, modifiers);

    // Situational modifiers
    this.addSituationalModifiers(context, tracker, modifiers);

    return modifiers;
  }

  private addRangeModifiers(
    context: ModifierContext,
    tracker: AssumptionTracker,
    modifiers: RollModifier[]
  ): void {
    const { entities, rawText } = context;

    let distance = entities.distanceYards;

    // If no distance specified, make an assumption
    if (distance === null) {
      // Check for range hints in text
      if (/\b(?:close|nearby|near|point[\s-]?blank)\b/i.test(rawText)) {
        distance = 5;
        tracker.assumeMedium(
          'Range is Short (approximately 5 yards)',
          'range',
          'Text suggests close proximity'
        );
      } else if (/\b(?:far|distant|across)\b/i.test(rawText)) {
        distance = 30;
        tracker.assumeMedium(
          'Range is Medium (approximately 30 yards)',
          'range',
          'Text suggests significant distance'
        );
      } else {
        // Default to medium range for typical combat
        distance = 15;
        tracker.assumeLow(
          'Range assumed to be Short/Medium (approximately 15 yards)',
          'range',
          'No distance specified in input'
        );
      }
    }

    const weapon = entities.weapon;
    const { modifier, band } = getRangeModifier(distance, weapon);

    if (modifier !== 0) {
      modifiers.push({
        label: `${this.capitalizeFirst(band)} Range`,
        value: modifier,
        source: `Range band: ${band} (${distance} yards)`,
      });
    }

    // Assume weapon if not specified
    if (!weapon && context.intent.actionType === 'shooting') {
      tracker.assumeMedium(
        'Weapon is a standard pistol/revolver',
        'weapon',
        'No weapon specified for shooting action'
      );
    }
  }

  private addMovementModifiers(
    context: ModifierContext,
    _tracker: AssumptionTracker,
    modifiers: RollModifier[]
  ): void {
    const { intent, rawText } = context;

    // Attacker movement
    if (intent.movementType === 'running') {
      modifiers.push({
        label: 'Running',
        value: MOVEMENT_MODIFIERS.RUNNING,
        source: 'Attacker is running (-2)',
      });
    }

    if (intent.movementType === 'mounted' || intent.movementType === 'vehicle') {
      modifiers.push({
        label: 'Unstable Platform',
        value: MOVEMENT_MODIFIERS.UNSTABLE_PLATFORM,
        source: `Attacker on ${intent.movementType} platform (-2)`,
      });
    }

    // Target movement - various phrasings
    if (
      /\b(?:target|enemy|they|he|she)\s+(?:is\s+)?(?:running|moving|fleeing)\b/i.test(rawText) ||
      /\b(?:target|enemy)\s+(?:who\s+)?(?:is\s+)?running/i.test(rawText) ||
      /\brunning\s+(?:target|enemy|away)\b/i.test(rawText)
    ) {
      modifiers.push({
        label: 'Target Running',
        value: MOVEMENT_MODIFIERS.TARGET_RUNNING,
        source: 'Target is moving (-2)',
      });
    }
  }

  private addCoverModifiers(
    context: ModifierContext,
    tracker: AssumptionTracker,
    modifiers: RollModifier[]
  ): void {
    const { rawText } = context;

    // Detect cover from text
    let cover: CoverType = 'none';

    if (/\b(?:full|heavy|solid)\s*cover\b/i.test(rawText)) {
      cover = 'heavy';
    } else if (/\b(?:medium|partial)\s*cover\b/i.test(rawText)) {
      cover = 'medium';
    } else if (/\b(?:light|some)\s*cover\b/i.test(rawText)) {
      cover = 'light';
    } else if (/\bcover\b/i.test(rawText)) {
      // Generic "cover" mentioned - assume light
      cover = 'light';
      tracker.assumeMedium(
        'Cover is Light (-2)',
        'cover',
        'Cover mentioned but type not specified'
      );
    } else if (/\b(?:behind|hiding|ducking|crouching)\b/i.test(rawText)) {
      cover = 'light';
      tracker.assumeLow(
        'Target may have Light Cover (-2)',
        'cover',
        'Positional words suggest possible cover'
      );
    }

    if (cover !== 'none') {
      modifiers.push({
        label: `${this.capitalizeFirst(cover)} Cover`,
        value: COVER_MODIFIERS[cover],
        source: `Target has ${cover} cover`,
      });
    }
  }

  private addLightingModifiers(
    context: ModifierContext,
    tracker: AssumptionTracker,
    modifiers: RollModifier[]
  ): void {
    const { rawText } = context;

    // Detect lighting from text
    let lighting: LightingCondition = 'bright';

    if (/\b(?:pitch\s*black|no\s*light|total\s*dark)\b/i.test(rawText)) {
      lighting = 'pitch_black';
    } else if (/\b(?:dark|darkness|night|midnight)\b/i.test(rawText)) {
      lighting = 'dark';
    } else if (/\b(?:dim|dusk|dawn|twilight|candlelit|torch)\b/i.test(rawText)) {
      lighting = 'dim';
    }

    // Check environment for lighting hints
    if (lighting === 'bright') {
      const env = detectEnvironment(rawText, tracker);
      if (env) {
        const envData = DEADLANDS_ENVIRONMENTS[env];
        if ('lighting' in envData) {
          lighting = envData.lighting as LightingCondition;
        }
      }
    }

    // Apply lighting modifier if not bright
    if (lighting !== 'bright') {
      modifiers.push({
        label: `${this.capitalizeFirst(lighting.replace('_', ' '))} Lighting`,
        value: LIGHTING_MODIFIERS[lighting],
        source: `Lighting condition: ${lighting}`,
      });
    } else if (!context.intent.isCombat) {
      // Don't assume lighting for non-combat
    } else {
      // Assume bright/normal lighting for combat
      tracker.assumeHigh(
        'Lighting is normal/bright (no penalty)',
        'lighting',
        'No lighting conditions mentioned'
      );
    }
  }

  private addSituationalModifiers(
    context: ModifierContext,
    _tracker: AssumptionTracker,
    modifiers: RollModifier[]
  ): void {
    const { rawText } = context;

    // Aiming
    if (/\b(?:aim|aiming|carefully|takes?\s+aim)\b/i.test(rawText)) {
      modifiers.push({
        label: 'Aiming',
        value: SITUATIONAL_MODIFIERS.AIMING,
        source: 'Spent action to aim (+2)',
      });
    }

    // Called shots
    if (/\b(?:head\s*shot|shoot\s*in\s*(?:the\s+)?head)\b/i.test(rawText)) {
      modifiers.push({
        label: 'Called Shot (Head)',
        value: SITUATIONAL_MODIFIERS.CALLED_SHOT_HEAD,
        source: 'Called shot to head (-4)',
      });
    } else if (/\b(?:called\s*shot|shoot\s*(?:the\s+)?(?:arm|leg|hand|foot))\b/i.test(rawText)) {
      modifiers.push({
        label: 'Called Shot (Limb)',
        value: SITUATIONAL_MODIFIERS.CALLED_SHOT_LIMB,
        source: 'Called shot to limb (-2)',
      });
    }

    // The Drop (surprise)
    if (/\b(?:surprise|caught\s*off\s*guard|the\s*drop|before\s*(?:he|she|they)\s*(?:can\s*)?draw)\b/i.test(rawText)) {
      modifiers.push({
        label: 'The Drop',
        value: SITUATIONAL_MODIFIERS.THE_DROP,
        source: 'Has The Drop on target (+4)',
      });
    }

    // Prone
    if (/\b(?:attacker|shooter|actor)\s+(?:is\s+)?prone\b/i.test(rawText)) {
      modifiers.push({
        label: 'Attacker Prone',
        value: SITUATIONAL_MODIFIERS.ATTACKER_PRONE,
        source: 'Attacker is prone (-2)',
      });
    }

    if (/\b(?:target|enemy)\s+(?:is\s+)?prone\b/i.test(rawText)) {
      if (context.intent.isRanged) {
        modifiers.push({
          label: 'Target Prone (Ranged)',
          value: SITUATIONAL_MODIFIERS.TARGET_PRONE_RANGED,
          source: 'Target is prone, ranged attack (-4)',
        });
      } else {
        modifiers.push({
          label: 'Target Prone (Melee)',
          value: SITUATIONAL_MODIFIERS.TARGET_PRONE_MELEE,
          source: 'Target is prone, melee attack (+2)',
        });
      }
    }

    // Off-hand
    if (/\b(?:off[\s-]?hand|weak\s*hand|left\s*hand)\b/i.test(rawText)) {
      modifiers.push({
        label: 'Off-Hand',
        value: SITUATIONAL_MODIFIERS.OFF_HAND,
        source: 'Using off-hand (-2)',
      });
    }

    // Higher ground
    if (/\b(?:higher\s*ground|above|elevated|balcony|roof)\b/i.test(rawText)) {
      modifiers.push({
        label: 'Higher Ground',
        value: SITUATIONAL_MODIFIERS.HIGHER_GROUND,
        source: 'Has higher ground (+1)',
      });
    }

    // Improvised weapon
    if (/\b(?:improvised|bottle|chair|table|bar\s*stool)\b/i.test(rawText)) {
      modifiers.push({
        label: 'Improvised Weapon',
        value: SITUATIONAL_MODIFIERS.IMPROVISED_WEAPON,
        source: 'Using improvised weapon (-2)',
      });
    }
  }

  private capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
