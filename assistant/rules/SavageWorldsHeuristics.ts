/**
 * SavageWorldsHeuristics - Core Savage Worlds rules heuristics
 *
 * This module encodes common Savage Worlds interpretations.
 * These are how a typical experienced GM would run these rules.
 */

/**
 * Range bands in Savage Worlds
 */
export type RangeBand = 'short' | 'medium' | 'long' | 'extreme';

/**
 * Cover types
 */
export type CoverType = 'none' | 'light' | 'medium' | 'heavy';

/**
 * Lighting conditions
 */
export type LightingCondition = 'bright' | 'dim' | 'dark' | 'pitch_black';

/**
 * Standard Savage Worlds target numbers
 */
export const TARGET_NUMBERS = {
  /** Standard difficulty for most trait rolls */
  STANDARD: 4,

  /** Parry is the target for Fighting attacks */
  PARRY_BASE: 2, // + half Fighting die

  /** Toughness is the target for damage */
  TOUGHNESS_BASE: 2, // + half Vigor die + armor
} as const;

/**
 * Range modifiers for ranged attacks
 * Based on standard Savage Worlds range penalties
 */
export const RANGE_MODIFIERS: Record<RangeBand, number> = {
  short: 0,
  medium: -2,
  long: -4,
  extreme: -8,
};

/**
 * Cover modifiers
 */
export const COVER_MODIFIERS: Record<CoverType, number> = {
  none: 0,
  light: -2,  // Light cover (-2)
  medium: -4, // Medium cover (-4)
  heavy: -6,  // Heavy cover (-6)
};

/**
 * Lighting modifiers
 */
export const LIGHTING_MODIFIERS: Record<LightingCondition, number> = {
  bright: 0,
  dim: -2,      // Dim lighting (-2)
  dark: -4,     // Dark (-4)
  pitch_black: -6, // Pitch darkness (-6)
};

/**
 * Movement modifiers
 */
export const MOVEMENT_MODIFIERS = {
  /** Attacker is running */
  RUNNING: -2,

  /** Attacker on unstable platform (mounted, vehicle) */
  UNSTABLE_PLATFORM: -2,

  /** Target is running/moving */
  TARGET_RUNNING: -2,
} as const;

/**
 * Other common modifiers
 */
export const SITUATIONAL_MODIFIERS = {
  /** Aiming (takes an action to aim first) */
  AIMING: 2,

  /** Called shot - specific location */
  CALLED_SHOT_LIMB: -2,
  CALLED_SHOT_HEAD: -4,
  CALLED_SHOT_SMALL: -4,
  CALLED_SHOT_TINY: -6,

  /** Off-hand attack */
  OFF_HAND: -2,

  /** Two-weapon fighting (off-hand) */
  TWO_WEAPONS: -2,

  /** Prone target (ranged) */
  TARGET_PRONE_RANGED: -4,

  /** Prone target (melee) */
  TARGET_PRONE_MELEE: 2,

  /** Attacker prone */
  ATTACKER_PRONE: -2,

  /** The Drop (surprise) */
  THE_DROP: 4,

  /** Gang Up bonus per additional attacker (max +4) */
  GANG_UP_PER_ATTACKER: 1,
  GANG_UP_MAX: 4,

  /** Higher ground */
  HIGHER_GROUND: 1,

  /** Improvised weapon */
  IMPROVISED_WEAPON: -2,

  /** Unarmed vs armed (no martial arts) */
  UNARMED_VS_ARMED: -2,
} as const;

/**
 * Default weapon range: [short, medium, long] in yards
 */
const DEFAULT_WEAPON_RANGE: readonly [number, number, number] = [12, 24, 48];

/**
 * Standard weapon ranges (in yards) for common Deadlands weapons
 * Format: [short, medium, long]
 */
export const WEAPON_RANGES = {
  // Pistols
  pistol: [12, 24, 48] as const,
  revolver: [12, 24, 48] as const,
  colt: [12, 24, 48] as const,
  derringer: [5, 10, 20] as const,

  // Rifles
  rifle: [24, 48, 96] as const,
  winchester: [24, 48, 96] as const,
  sharps: [24, 48, 96] as const,

  // Shotguns
  shotgun: [12, 24, 48] as const,

  // Bows
  bow: [12, 24, 48] as const,
  crossbow: [15, 30, 60] as const,

  // Thrown
  knife: [3, 6, 12] as const,
  axe: [3, 6, 12] as const,
  spear: [3, 6, 12] as const,

  // Default for unknown ranged
  default: [12, 24, 48] as const,
} as const;

type WeaponRangeKey = keyof typeof WEAPON_RANGES;

/**
 * Get weapon ranges for a given weapon, falling back to default
 */
function getWeaponRanges(weapon: string | null): readonly [number, number, number] {
  if (!weapon) {
    return DEFAULT_WEAPON_RANGE;
  }
  const weaponKey = weapon.toLowerCase();
  if (isWeaponRangeKey(weaponKey)) {
    return WEAPON_RANGES[weaponKey];
  }
  return DEFAULT_WEAPON_RANGE;
}

function isWeaponRangeKey(key: string): key is WeaponRangeKey {
  return key in WEAPON_RANGES;
}

/**
 * Determine range band based on distance and weapon
 */
export function getRangeBand(
  distanceYards: number,
  weapon: string | null
): RangeBand {
  const ranges = getWeaponRanges(weapon);

  const short = ranges[0];
  const medium = ranges[1];
  const long = ranges[2];

  if (distanceYards <= short) {
    return 'short';
  }
  if (distanceYards <= medium) {
    return 'medium';
  }
  if (distanceYards <= long) {
    return 'long';
  }
  return 'extreme';
}

/**
 * Get range modifier for a given distance and weapon
 */
export function getRangeModifier(
  distanceYards: number,
  weapon: string | null
): { modifier: number; band: RangeBand } {
  const band = getRangeBand(distanceYards, weapon);
  return {
    modifier: RANGE_MODIFIERS[band],
    band,
  };
}
