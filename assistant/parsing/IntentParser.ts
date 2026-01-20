/**
 * IntentParser - Parses natural language to extract action intent
 *
 * Heuristic-based parsing. Focuses on common Savage Worlds actions.
 * If intent is ambiguous, we choose the most likely interpretation
 * and record the assumption.
 */

import type { AssumptionTracker } from '../core/AssumptionTracker';

/**
 * Types of actions that can be parsed
 */
export type ActionType =
  | 'shooting'
  | 'fighting'
  | 'throwing'
  | 'athletics'
  | 'arcane'
  | 'stealth'
  | 'persuasion'
  | 'intimidation'
  | 'notice'
  | 'survival'
  | 'healing'
  | 'repair'
  | 'riding'
  | 'driving'
  | 'unknown';

/**
 * Parsed intent from natural language
 */
export interface ParsedIntent {
  /** The primary action type */
  readonly actionType: ActionType;

  /** The skill that maps to this action */
  readonly skill: string;

  /** Whether this is a combat action */
  readonly isCombat: boolean;

  /** Whether this is a ranged action */
  readonly isRanged: boolean;

  /** Whether movement is involved */
  readonly hasMovement: boolean;

  /** Type of movement if any */
  readonly movementType: 'running' | 'mounted' | 'vehicle' | 'stationary' | null;

  /** Raw action verb found */
  readonly actionVerb: string | null;
}

/**
 * Action verb to action type mapping
 */
const ACTION_VERBS: Record<string, ActionType> = {
  // Shooting
  shoot: 'shooting',
  shoots: 'shooting',
  fire: 'shooting',
  fires: 'shooting',
  aim: 'shooting',
  aims: 'shooting',
  snipe: 'shooting',
  snipes: 'shooting',

  // Fighting
  attack: 'fighting',
  attacks: 'fighting',
  hit: 'fighting',
  hits: 'fighting',
  punch: 'fighting',
  punches: 'fighting',
  kick: 'fighting',
  kicks: 'fighting',
  stab: 'fighting',
  stabs: 'fighting',
  slash: 'fighting',
  slashes: 'fighting',
  strike: 'fighting',
  strikes: 'fighting',
  swing: 'fighting',
  swings: 'fighting',

  // Throwing
  throw: 'throwing',
  throws: 'throwing',
  hurl: 'throwing',
  hurls: 'throwing',
  toss: 'throwing',
  tosses: 'throwing',

  // Athletics
  jump: 'athletics',
  jumps: 'athletics',
  climb: 'athletics',
  climbs: 'athletics',
  swim: 'athletics',
  swims: 'athletics',
  run: 'athletics',
  runs: 'athletics',
  sprint: 'athletics',
  sprints: 'athletics',

  // Arcane
  cast: 'arcane',
  casts: 'arcane',
  invoke: 'arcane',
  invokes: 'arcane',
  channel: 'arcane',
  channels: 'arcane',
  hex: 'arcane',
  hexes: 'arcane',
  pray: 'arcane',
  prays: 'arcane',
  bless: 'arcane',
  blesses: 'arcane',

  // Stealth
  sneak: 'stealth',
  sneaks: 'stealth',
  hide: 'stealth',
  hides: 'stealth',
  creep: 'stealth',
  creeps: 'stealth',

  // Persuasion
  persuade: 'persuasion',
  persuades: 'persuasion',
  convince: 'persuasion',
  convinces: 'persuasion',
  charm: 'persuasion',
  charms: 'persuasion',
  negotiate: 'persuasion',
  negotiates: 'persuasion',

  // Intimidation
  intimidate: 'intimidation',
  intimidates: 'intimidation',
  threaten: 'intimidation',
  threatens: 'intimidation',
  menace: 'intimidation',
  menaces: 'intimidation',

  // Notice
  notice: 'notice',
  notices: 'notice',
  spot: 'notice',
  spots: 'notice',
  search: 'notice',
  searches: 'notice',
  look: 'notice',
  looks: 'notice',
  observe: 'notice',
  observes: 'notice',

  // Survival
  track: 'survival',
  tracks: 'survival',
  forage: 'survival',
  forages: 'survival',
  navigate: 'survival',
  navigates: 'survival',

  // Healing
  heal: 'healing',
  heals: 'healing',
  bandage: 'healing',
  bandages: 'healing',
  treat: 'healing',
  treats: 'healing',

  // Repair
  repair: 'repair',
  repairs: 'repair',
  fix: 'repair',
  fixes: 'repair',

  // Riding
  ride: 'riding',
  rides: 'riding',
  gallop: 'riding',
  gallops: 'riding',

  // Driving
  drive: 'driving',
  drives: 'driving',
  steer: 'driving',
  steers: 'driving',
};

/**
 * Action type to skill mapping
 */
const ACTION_TO_SKILL: Record<ActionType, string> = {
  shooting: 'Shooting',
  fighting: 'Fighting',
  throwing: 'Athletics',
  athletics: 'Athletics',
  arcane: 'Spellcasting',
  stealth: 'Stealth',
  persuasion: 'Persuasion',
  intimidation: 'Intimidation',
  notice: 'Notice',
  survival: 'Survival',
  healing: 'Healing',
  repair: 'Repair',
  riding: 'Riding',
  driving: 'Driving',
  unknown: 'Common Knowledge',
};

/**
 * Movement indicators
 */
const MOVEMENT_PATTERNS = {
  mounted: [
    /(?:while|when|as)\s+(?:riding|mounted|on\s+(?:a\s+)?horse|galloping|horseback)/i,
    /(?:from|on)\s+(?:a\s+)?(?:horse|mount|steed)/i,
    /gallop(?:ing)?/i,
  ],
  running: [
    /(?:while|when|as)\s+running/i,
    /run(?:ning)?\s+(?:and|then|while)/i,
    /(?:on\s+the\s+)?move/i,
    /moving\s+(?:and|while)/i,
  ],
  vehicle: [
    /(?:from|in|on)\s+(?:a\s+)?(?:wagon|stagecoach|train|cart)/i,
    /(?:while|when)\s+driving/i,
  ],
};

/**
 * Parses natural language intent
 */
export class IntentParser {
  /**
   * Parse natural language text to extract intent
   */
  parse(text: string, tracker: AssumptionTracker): ParsedIntent {
    const normalizedText = text.toLowerCase().trim();

    const actionVerb = this.findActionVerb(normalizedText);
    const actionType = this.determineActionType(normalizedText, actionVerb, tracker);
    const skill = ACTION_TO_SKILL[actionType];
    const movementType = this.detectMovement(normalizedText, tracker);
    const isRanged = this.isRangedAction(actionType, normalizedText);
    const isCombat = this.isCombatAction(actionType);

    return {
      actionType,
      skill,
      isCombat,
      isRanged,
      hasMovement: movementType !== 'stationary',
      movementType,
      actionVerb,
    };
  }

  private findActionVerb(text: string): string | null {
    const words = text.split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (ACTION_VERBS[cleanWord]) {
        return cleanWord;
      }
    }
    return null;
  }

  private determineActionType(
    text: string,
    actionVerb: string | null,
    tracker: AssumptionTracker
  ): ActionType {
    // If we found a clear action verb, use it
    if (actionVerb && ACTION_VERBS[actionVerb]) {
      return ACTION_VERBS[actionVerb];
    }

    // Heuristic detection for common phrases
    if (/\b(?:gun|pistol|rifle|revolver|shotgun)\b/i.test(text)) {
      tracker.assumeHigh(
        'Action involves Shooting based on weapon mention',
        'skill',
        'Firearm mentioned in input'
      );
      return 'shooting';
    }

    if (/\b(?:sword|knife|axe|fist|punch|melee)\b/i.test(text)) {
      tracker.assumeHigh(
        'Action involves Fighting based on melee weapon/action',
        'skill',
        'Melee weapon or action mentioned'
      );
      return 'fighting';
    }

    if (/\b(?:spell|magic|hex|power)\b/i.test(text)) {
      tracker.assumeHigh(
        'Action involves Spellcasting based on arcane reference',
        'skill',
        'Magical/arcane reference in input'
      );
      return 'arcane';
    }

    // Default fallback
    tracker.assumeLow(
      'Action type unclear, assuming general skill check',
      'skill',
      'No clear action verb or context found'
    );
    return 'unknown';
  }

  private detectMovement(
    text: string,
    tracker: AssumptionTracker
  ): 'running' | 'mounted' | 'vehicle' | 'stationary' | null {
    // Check mounted first (most impactful modifier)
    for (const pattern of MOVEMENT_PATTERNS.mounted) {
      if (pattern.test(text)) {
        return 'mounted';
      }
    }

    // Check running
    for (const pattern of MOVEMENT_PATTERNS.running) {
      if (pattern.test(text)) {
        return 'running';
      }
    }

    // Check vehicle
    for (const pattern of MOVEMENT_PATTERNS.vehicle) {
      if (pattern.test(text)) {
        return 'vehicle';
      }
    }

    // No movement detected - assume stationary
    tracker.assumeMedium(
      'Actor is stationary (not moving)',
      'movement',
      'No movement indicators in input'
    );
    return 'stationary';
  }

  private isRangedAction(actionType: ActionType, text: string): boolean {
    if (actionType === 'shooting' || actionType === 'throwing') {
      return true;
    }

    // Arcane could be ranged or melee
    if (actionType === 'arcane') {
      // Default to ranged for spells unless "touch" mentioned
      return !/\btouch\b/i.test(text);
    }

    return false;
  }

  private isCombatAction(actionType: ActionType): boolean {
    return ['shooting', 'fighting', 'throwing', 'arcane'].includes(actionType);
  }
}
