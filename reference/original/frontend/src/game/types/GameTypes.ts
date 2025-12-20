// Game-specific TypeScript types
// Isolated from existing character types

export interface Equipment {
  id: number;
  name: string;
  description?: string;
  type: string; // WEAPON_MELEE, WEAPON_RANGED, ARMOR, etc.
  quantity: number;
  damage?: string; // e.g., "2d6+1"
  range?: string; // e.g., "12/24/48"
  rof?: number; // Rate of Fire
  shots?: number; // Ammo capacity
  isEquipped: boolean;
  indirectFire?: boolean; // Can fire over obstacles (bows, grenades, artillery)
}

export interface Skill {
  id: number;
  name: string;
  dieValue: string; // e.g., "d8", "d10"
}

export interface Edge {
  id: number;
  name: string;
  description?: string;
}

export interface GameCharacter {
  id: number;
  name: string;

  // Savage Worlds Attributes
  agilityDie: string;
  smartsDie: string;
  spiritDie: string;
  strengthDie: string;
  vigorDie: string;

  // Derived Stats
  parry: number;
  toughness: number;
  pace: number;

  // Power Points and Fate Chips (Savage Worlds)
  currentPowerPoints?: number;
  maxPowerPoints?: number;
  fateChips?: number;

  // Combat State (Savage Worlds)
  woundCount?: number;
  isShaken?: boolean;

  // Character abilities
  equipment?: Equipment[];
  skills?: Skill[];
  edges?: Edge[];
  powers?: Array<{
    id: number;
    name: string;
    description: string;
    powerPoints: number;
    range: string;
    duration: string;
    effect: string;
    traitRoll: string;
    arcaneBackgrounds: string;
  }>;

  // For game rendering
  characterImageUrl?: string;
}

export interface GameEnemy {
  id: string;
  name: string;
  type: string;

  // Combat stats
  health: number;
  maxHealth: number;
  toughness: number;
  parry: number;
  pace: number;

  // Combat attributes (Savage Worlds)
  fightingDie: string; // e.g., "1d6"
  strengthDie: string; // For damage

  // Position
  gridX: number;
  gridY: number;

  // AI state
  aiState: 'idle' | 'patrol' | 'chase' | 'attack';
  hasActed: boolean; // Whether this enemy has taken its turn
  hasRun: boolean; // Whether this enemy ran this turn (for -2 to hit penalty)
}

export interface CombatState {
  turn: number;
  phase: 'player' | 'enemy' | 'animating';

  // Player state
  playerHealth: number;
  playerMaxHealth: number;
  playerPosition: { x: number; y: number };
  playerWounds: number;
  playerShaken: boolean;
  playerSelectedWeapon?: Equipment;
  playerActions: number; // Remaining actions this turn

  enemies: GameEnemy[];

  combatLog: CombatLogEntry[];
}

export type CombatActionType =
  | 'attack_melee'
  | 'attack_ranged'
  | 'aim'
  | 'defend'
  | 'run'
  | 'grapple'
  | 'disarm'
  | 'called_shot'
  | 'wild_attack'
  | 'trick'
  | 'test_of_wills'
  | 'support'
  | 'multi_action'
  | 'unshaken'
  | 'use_power'
  | 'reload'
  | 'change_weapon'
  | 'use_item'
  | 'coup_de_grace'
  | 'finishing_move'
  | 'evasion'
  | 'withdraw';

export type CalledShotTarget = 'head' | 'vitals' | 'limb' | 'small' | 'tiny' | null;

export interface CalledShotModifier {
  toHit: number;
  damageBonus: number;
  description: string;
}

// Illumination levels (Savage Worlds core rule)
export enum Illumination {
  BRIGHT = 'bright',      // Full daylight, no penalty
  DIM = 'dim',           // Twilight, torchlight: -1 to attacks/Notice
  DARK = 'dark',         // Moonlight, distant light: -2 to attacks/Notice
  PITCH_BLACK = 'pitch_black', // No light at all: -4 to attacks/Notice
}

export const ILLUMINATION_MODIFIERS: Record<Illumination, number> = {
  [Illumination.BRIGHT]: 0,
  [Illumination.DIM]: -1,
  [Illumination.DARK]: -2,
  [Illumination.PITCH_BLACK]: -4,
};

// Cover levels (Savage Worlds core rule)
export enum Cover {
  NONE = 'none',           // No cover: 0 penalty to attacker
  LIGHT = 'light',         // Light cover: -2 to ranged attacks (furniture, low walls)
  MEDIUM = 'medium',       // Medium cover: -4 to ranged attacks (thick trees, barrels)
  HEAVY = 'heavy',         // Heavy cover: -6 to ranged attacks (brick walls, armored vehicles)
  TOTAL = 'total',         // Total cover: Cannot be targeted (behind solid wall)
}

export const COVER_MODIFIERS: Record<Cover, number> = {
  [Cover.NONE]: 0,
  [Cover.LIGHT]: -2,
  [Cover.MEDIUM]: -4,
  [Cover.HEAVY]: -6,
  [Cover.TOTAL]: -999,  // Effectively blocks shot
};

// Cover tile on the battlefield grid
export interface CoverTile {
  gridX: number;
  gridY: number;
  coverLevel: Cover;
  blocksLOS: boolean;  // Whether this tile completely blocks line of sight
  buildingId?: string;  // ID of building this tile belongs to (for interior LOS)
  isWindow?: boolean;   // Can see through from inside/outside
  isDoor?: boolean;     // Can see through when open
}

export interface CombatAction {
  type: CombatActionType;
  name: string;
  description: string;
  icon: string;
  modifier?: string; // e.g. "-2 to attack", "+2 to Parry"
  requiresTarget?: boolean;
  requiresArcane?: boolean;
}

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'damage' | 'miss';
}

export interface DiceRollResult {
  total: number;
  rolls: number[];
  exploded: boolean;
  dieType: string;
}

export interface DiceRollEvent {
  id: string;
  timestamp: number;
  roller: string; // "Player" or enemy name
  purpose: string; // "Attack", "Damage", "Strength", etc.
  dieType: string; // "1d6", "1d8", etc.
  rolls: number[];
  total: number;
  exploded: boolean;
}
