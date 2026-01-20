/**
 * Rules Index - Assistant Layer
 *
 * Exports for Savage Worlds and Deadlands heuristics.
 */

export type { RangeBand, CoverType, LightingCondition } from './SavageWorldsHeuristics';
export {
  TARGET_NUMBERS,
  RANGE_MODIFIERS,
  COVER_MODIFIERS,
  LIGHTING_MODIFIERS,
  MOVEMENT_MODIFIERS,
  SITUATIONAL_MODIFIERS,
  WEAPON_RANGES,
  getRangeBand,
  getRangeModifier,
} from './SavageWorldsHeuristics';

export {
  DEADLANDS_SKILLS,
  FEAR_MODIFIERS,
  DEADLANDS_ENVIRONMENTS,
  DEADLANDS_WEAPON_NOTES,
  getGritBonus,
  detectArcaneBackground,
  detectEnvironment,
} from './DeadlandsModifiers';
