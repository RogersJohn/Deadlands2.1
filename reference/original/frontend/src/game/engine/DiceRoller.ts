import { DiceRollResult } from '../types/GameTypes';

/**
 * Savage Worlds Dice Roller
 * Implements "exploding dice" mechanic - when you roll max value, roll again and add
 */
export class DiceRoller {
  /**
   * Roll a Savage Worlds die with exploding mechanic
   * @param dieNotation - e.g., "1d6", "2d8", "1d12+2"
   */
  static roll(dieNotation: string): DiceRollResult {
    const match = dieNotation.match(/(\d+)?d(\d+)([+\-]\d+)?/);

    if (!match) {
      console.error(`Invalid die notation: ${dieNotation}`);
      return { total: 0, rolls: [], exploded: false, dieType: dieNotation };
    }

    const numDice = parseInt(match[1] || '1');
    const dieSize = parseInt(match[2]);
    const modifier = parseInt(match[3] || '0');

    const rolls: number[] = [];
    let exploded = false;

    for (let i = 0; i < numDice; i++) {
      let diceTotal = 0;
      let roll = this.rollDie(dieSize);
      diceTotal += roll;
      rolls.push(roll);

      // Exploding dice: if you roll max, roll again and add
      while (roll === dieSize) {
        exploded = true;
        roll = this.rollDie(dieSize);
        diceTotal += roll;
        rolls.push(roll);
      }
    }

    const total = rolls.reduce((sum, r) => sum + r, 0) + modifier;

    return {
      total,
      rolls,
      exploded,
      dieType: dieNotation,
    };
  }

  /**
   * Roll a single die (1 to max)
   */
  private static rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Roll with Wild Die (for player characters)
   * Roll both the skill die AND a d6, take the higher result
   */
  static rollWithWildDie(skillDie: string): { skill: DiceRollResult; wild: DiceRollResult; total: number } {
    const skillRoll = this.roll(skillDie);
    const wildRoll = this.roll('1d6'); // Wild Die is always d6

    // Take the higher of the two
    const total = Math.max(skillRoll.total, wildRoll.total);

    return {
      skill: skillRoll,
      wild: wildRoll,
      total,
    };
  }

  /**
   * Make an opposed roll (attacker vs defender)
   */
  static opposedRoll(attackerDie: string, defenderValue: number): {
    success: boolean;
    raises: number;
    attackRoll: number;
    margin: number;
  } {
    const roll = this.rollWithWildDie(attackerDie);
    const success = roll.total >= defenderValue;
    const margin = roll.total - defenderValue;
    const raises = success ? Math.floor(margin / 4) : 0; // Every 4 over target = 1 raise

    return {
      success,
      raises,
      attackRoll: roll.total,
      margin,
    };
  }
}
