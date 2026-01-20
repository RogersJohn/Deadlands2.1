/**
 * DeadlandsModifiers - Deadlands-specific heuristics and modifiers
 *
 * Savage Worlds: Deadlands has setting-specific rules that augment
 * the core Savage Worlds system.
 */

import type { AssumptionTracker } from '../core/AssumptionTracker';

/**
 * Deadlands-specific skill mappings
 * Some skills have Deadlands-specific names or uses
 */
export const DEADLANDS_SKILLS = {
  /** Arcane Background: Huckster */
  huckster: 'Spellcasting (Huckster)',

  /** Arcane Background: Blessed */
  blessed: 'Faith',

  /** Arcane Background: Shaman */
  shaman: 'Faith (Shamanism)',

  /** Arcane Background: Chi Master */
  chiMaster: 'Focus',

  /** Arcane Background: Mad Scientist */
  madScientist: 'Weird Science',

  /** Arcane Background: Voodoo */
  voodoo: 'Faith (Voodoo)',
} as const;

/**
 * Fear-related modifiers (important in Deadlands)
 */
export const FEAR_MODIFIERS = {
  /** Base fear check is Spirit roll */
  FEAR_CHECK_SKILL: 'Spirit',

  /** Modifiers based on fear level */
  FEAR_LEVEL_MODIFIERS: {
    mild: 0,
    moderate: -1,
    severe: -2,
    terrifying: -4,
  } as const,
} as const;

/**
 * Grit - Deadlands-specific mechanic
 * Grit provides a bonus to Fear checks
 */
export function getGritBonus(gritLevel: number): number {
  // Grit adds to Fear checks directly
  return Math.max(0, gritLevel);
}

/**
 * Detect if the action involves Deadlands-specific arcane backgrounds
 */
export function detectArcaneBackground(
  text: string,
  tracker: AssumptionTracker
): string | null {
  const normalizedText = text.toLowerCase();

  // Huckster (card magic)
  if (/\b(?:huckster|hex|card\s*magic|deal|hand)\b/i.test(normalizedText)) {
    return 'huckster';
  }

  // Blessed (miracles)
  if (/\b(?:blessed|pray|miracle|blessing|faith)\b/i.test(normalizedText)) {
    return 'blessed';
  }

  // Shaman (nature spirits)
  if (/\b(?:shaman|spirit|nature|vision\s*quest)\b/i.test(normalizedText)) {
    return 'shaman';
  }

  // Chi Master (martial arts)
  if (/\b(?:chi|martial\s*arts?|monk|kung\s*fu)\b/i.test(normalizedText)) {
    return 'chiMaster';
  }

  // Mad Scientist (weird science)
  if (/\b(?:mad\s*scien|weird\s*science|gadget|invention|gizmo)\b/i.test(normalizedText)) {
    return 'madScientist';
  }

  // Voodoo
  if (/\b(?:voodoo|vodou|loa|zombie)\b/i.test(normalizedText)) {
    return 'voodoo';
  }

  // No specific background detected
  tracker.assumeMedium(
    'Arcane background not specified, assuming generic Spellcasting',
    'skill',
    'No Deadlands-specific arcane background mentioned'
  );
  return null;
}

/**
 * Environment hazards common in Deadlands
 */
export const DEADLANDS_ENVIRONMENTS = {
  /** Desert conditions */
  desert: {
    fatigue_check: true,
    visibility: 'bright' as const,
    notes: ['Heat may cause Fatigue checks', 'Bright sun provides good visibility'],
  },

  /** Mine/underground */
  mine: {
    lighting: 'dark' as const,
    confined: true,
    notes: ['Typically dark without light source', 'Confined spaces may limit movement'],
  },

  /** Ghost town */
  ghostTown: {
    fear_check: true,
    cover_abundant: true,
    notes: ['May trigger Fear checks', 'Abundant cover from buildings'],
  },

  /** Saloon */
  saloon: {
    lighting: 'dim' as const,
    improvised_weapons: true,
    notes: ['Typically dim lighting', 'Bottles and furniture as improvised weapons'],
  },

  /** Open plains */
  plains: {
    lighting: 'bright' as const,
    cover: 'none' as const,
    notes: ['Good visibility', 'Little to no cover'],
  },
} as const;

/**
 * Detect environment from text and return relevant modifiers
 */
export function detectEnvironment(
  text: string,
  tracker: AssumptionTracker
): keyof typeof DEADLANDS_ENVIRONMENTS | null {
  const normalizedText = text.toLowerCase();

  if (/\b(?:desert|wasteland|badlands)\b/i.test(normalizedText)) {
    return 'desert';
  }

  if (/\b(?:mine|underground|cave|tunnel)\b/i.test(normalizedText)) {
    return 'mine';
  }

  if (/\b(?:ghost\s*town|abandoned\s*town|haunted)\b/i.test(normalizedText)) {
    return 'ghostTown';
  }

  if (/\b(?:saloon|bar|tavern)\b/i.test(normalizedText)) {
    return 'saloon';
  }

  if (/\b(?:plains?|prairie|open\s*ground)\b/i.test(normalizedText)) {
    return 'plains';
  }

  // Default assumption for Deadlands
  tracker.assumeLow(
    'Assuming outdoor setting with normal lighting',
    'environment',
    'No specific environment mentioned'
  );
  return null;
}

/**
 * Common Deadlands weapon notes
 */
export const DEADLANDS_WEAPON_NOTES: Record<string, string> = {
  gatling: 'Gatling weapons use ROF 3, may cause Recoil if firing multiple times',
  dynamite: 'Dynamite is a Heavy Weapon, affects all in Blast Template',
  flamethrower: 'Flamethrower uses Cone Template, may cause Fire damage',
  bowie: 'Bowie knife can be thrown',
  tomahawk: 'Tomahawk can be thrown',
};
