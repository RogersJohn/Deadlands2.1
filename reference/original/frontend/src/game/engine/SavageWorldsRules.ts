/**
 * Savage Worlds Core Rules Implementation
 * Accurate implementation of Savage Worlds Deluxe Edition mechanics
 */

export interface DiceRoll {
  rolls: number[];
  wildDie?: number;
  total: number;
  raises: number;
  exploded: boolean;
  targetNumber: number;
}

/**
 * Roll a single die with exploding (Ace) mechanic
 */
function rollDie(sides: number): { value: number; exploded: boolean } {
  let total = 0;
  let exploded = false;
  let currentRoll: number;

  do {
    currentRoll = Math.floor(Math.random() * sides) + 1;
    total += currentRoll;

    if (currentRoll === sides) {
      exploded = true;
    } else {
      break;
    }
  } while (currentRoll === sides);

  return { value: total, exploded };
}

/**
 * Parse die notation (e.g., "d8", "2d6", "d10+2")
 */
export function parseDieNotation(notation: string): { count: number; sides: number; modifier: number } {
  // Remove whitespace
  notation = notation.trim().toLowerCase();

  // Match patterns like "d8", "2d6", "d10+2", "1d6+1"
  const match = notation.match(/^(\d*)d(\d+)([+-]\d+)?$/);

  if (!match) {
    console.warn(`Invalid die notation: ${notation}, defaulting to d6`);
    return { count: 1, sides: 6, modifier: 0 };
  }

  const count = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  const modifier = match[3] ? parseInt(match[3]) : 0;

  return { count, sides, modifier };
}

/**
 * Roll dice with Savage Worlds rules (exploding dice, Wild Die for Wild Cards)
 * @param dieNotation - e.g., "d8", "d10", "d12"
 * @param isWildCard - Whether this is a Wild Card (player/important NPC)
 * @param modifier - Flat modifier to add to the roll
 * @param targetNumber - Target number to beat (default 4)
 */
export function rollSavageWorldsDice(
  dieNotation: string,
  isWildCard: boolean = true,
  modifier: number = 0,
  targetNumber: number = 4
): DiceRoll {
  const { sides } = parseDieNotation(dieNotation);

  // Roll the skill die
  const skillRoll = rollDie(sides);

  let wildDie: number | undefined;
  let exploded = skillRoll.exploded;

  // Wild Cards roll an additional d6 (Wild Die) and take the higher result
  if (isWildCard) {
    const wildRoll = rollDie(6);
    wildDie = wildRoll.value;

    if (wildRoll.exploded) {
      exploded = true;
    }
  }

  // Take the higher of skill die or wild die
  const baseRoll = isWildCard && wildDie !== undefined
    ? Math.max(skillRoll.value, wildDie)
    : skillRoll.value;

  const total = baseRoll + modifier;

  // Calculate raises (every 4 points over target number)
  const raises = total >= targetNumber
    ? Math.floor((total - targetNumber) / 4)
    : 0;

  return {
    rolls: [skillRoll.value],
    wildDie,
    total,
    raises,
    exploded,
    targetNumber,
  };
}

/**
 * Roll damage dice (exploding, can include modifiers)
 */
export function rollDamage(damageNotation: string): { total: number; rolls: number[]; exploded: boolean } {
  const { count, sides, modifier } = parseDieNotation(damageNotation);

  let total = modifier;
  const rolls: number[] = [];
  let exploded = false;

  for (let i = 0; i < count; i++) {
    const roll = rollDie(sides);
    rolls.push(roll.value);
    total += roll.value;

    if (roll.exploded) {
      exploded = true;
    }
  }

  return { total, rolls, exploded };
}

/**
 * Calculate if an attack hits based on target's Parry
 */
export function calculateAttackResult(
  attackRoll: DiceRoll,
  targetParry: number
): { hit: boolean; raises: number } {
  const hit = attackRoll.total >= targetParry;
  const raises = hit ? Math.floor((attackRoll.total - targetParry) / 4) : 0;

  return { hit, raises };
}

/**
 * Calculate damage result after hitting
 * Each raise on attack roll adds +1d6 to damage
 */
export function calculateDamageWithRaises(
  baseDamage: string,
  attackRaises: number,
  strengthDie?: string
): { total: number; rolls: number[]; description: string } {
  // Roll base weapon damage
  const baseDmg = rollDamage(baseDamage);
  let total = baseDmg.total;
  let rolls = [...baseDmg.rolls];
  let description = baseDamage;

  // Add strength die if melee
  if (strengthDie) {
    const strDmg = rollDamage(strengthDie);
    total += strDmg.total;
    rolls.push(...strDmg.rolls);
    description += ` + ${strengthDie} (Str)`;
  }

  // Each raise adds +1d6 damage
  if (attackRaises > 0) {
    for (let i = 0; i < attackRaises; i++) {
      const raiseDmg = rollDamage('1d6');
      total += raiseDmg.total;
      rolls.push(...raiseDmg.rolls);
    }
    description += ` + ${attackRaises}d6 (raises)`;
  }

  return { total, rolls, description };
}

/**
 * Apply damage to a character
 * Savage Worlds wound system:
 * - Damage >= Toughness: Shaken
 * - Each raise (4+) over Toughness: 1 Wound
 * - 3+ Wounds: Incapacitated
 */
export function applyDamage(
  damageTotal: number,
  toughness: number,
  currentWounds: number,
  isShaken: boolean
): {
  newWounds: number;
  newShaken: boolean;
  woundsInflicted: number;
  message: string;
  incapacitated: boolean;
} {
  if (damageTotal < toughness) {
    return {
      newWounds: currentWounds,
      newShaken: isShaken,
      woundsInflicted: 0,
      message: "Damage absorbed by toughness!",
      incapacitated: false,
    };
  }

  // If already Shaken, take a wound
  let woundsInflicted = isShaken ? 1 : 0;
  let newShaken = true;

  // Each raise over toughness causes a wound
  const raises = Math.floor((damageTotal - toughness) / 4);
  woundsInflicted += raises;

  const newWounds = currentWounds + woundsInflicted;
  const incapacitated = newWounds >= 3;

  let message = "";
  if (woundsInflicted === 0) {
    message = "Shaken!";
  } else if (woundsInflicted === 1) {
    message = "Wounded! (1 wound taken)";
  } else {
    message = `Severely Wounded! (${woundsInflicted} wounds taken)`;
  }

  if (incapacitated) {
    message = "Incapacitated!";
  }

  return {
    newWounds,
    newShaken,
    woundsInflicted,
    message,
    incapacitated,
  };
}

/**
 * Get skill die for a specific skill by name
 */
export function getSkillDie(skills: Array<{ name: string; dieValue: string }>, skillName: string): string | null {
  const skill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
  return skill ? skill.dieValue : null;
}

/**
 * Calculate multi-action penalty
 * -2 per additional action
 */
export function getMultiActionPenalty(actionCount: number): number {
  return actionCount > 1 ? (actionCount - 1) * -2 : 0;
}

/**
 * Calculate range penalties for ranged attacks
 * Short: 0, Medium: -2, Long: -4
 */
export function getRangePenalty(distance: number, weaponRange: string): number {
  // Parse range (e.g., "12/24/48")
  const ranges = weaponRange.split('/').map(r => parseInt(r.trim()));

  if (ranges.length !== 3) {
    console.warn(`Invalid range notation: ${weaponRange}`);
    return 0;
  }

  const [short, medium, long] = ranges;

  if (distance <= short) return 0;
  if (distance <= medium) return -2;
  if (distance <= long) return -4;

  // Beyond long range
  return -8;
}
