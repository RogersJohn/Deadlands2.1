import { DiceRoller } from './DiceRoller';
import { rollSavageWorldsDice, calculateDamageWithRaises, rollDamage } from './SavageWorldsRules';
import { GameCharacter, GameEnemy, CombatLogEntry, DiceRollEvent, CalledShotTarget, Illumination, ILLUMINATION_MODIFIERS } from '../types/GameTypes';

export type TurnPhase = 'player' | 'enemy' | 'victory' | 'defeat';

// Called shot modifiers per Savage Worlds rules
export const CALLED_SHOT_MODIFIERS = {
  head: { toHit: -4, damageBonus: 4, description: 'Head Shot' },
  vitals: { toHit: -4, damageBonus: 4, description: 'Vital Shot' },
  limb: { toHit: -2, damageBonus: 0, description: 'Limb Shot' },
  small: { toHit: -2, damageBonus: 0, description: 'Small Target' },
  tiny: { toHit: -4, damageBonus: 0, description: 'Tiny Target' },
};

// Combat log size limit to prevent unbounded memory growth
const MAX_COMBAT_LOG_ENTRIES = 100;

// Gang Up bonus cap (Savage Worlds rule)
const MAX_GANG_UP_BONUS = 4;

export class CombatManager {
  private turnNumber = 1;
  private currentPhase: TurnPhase = 'player';
  private combatLog: CombatLogEntry[] = [];
  private playerHealth: number;
  private playerMaxHealth: number;
  private playerWounds = 0;
  private playerShaken = false;

  // Phase 1: Ranged Combat Modifiers
  private playerAiming = false; // +2 to next ranged attack
  private calledShotTarget: CalledShotTarget = null; // Target for called shot
  private playerHasRun = false; // Whether player ran this turn

  // Critical Rules: Illumination, Multi-Action, Gang Up
  private illumination: Illumination = Illumination.BRIGHT; // Current lighting conditions
  private actionsThisTurn = 0; // Multi-action tracking

  constructor(
    private character: GameCharacter,
    private onLogUpdate: (log: CombatLogEntry[]) => void,
    private onPhaseChange: (phase: TurnPhase, turn: number) => void,
    private onDiceRoll?: (roll: DiceRollEvent) => void
  ) {
    // Calculate player health from Vigor (Savage Worlds: Vigor die size = Wounds)
    this.playerMaxHealth = this.getMaxHealthFromVigor(character.vigorDie);
    this.playerHealth = this.playerMaxHealth;

    this.addLog(`Combat begins! ${character.name} vs enemies!`, 'info');
    this.addLog(`Your turn - Move and Attack`, 'info');
  }

  private getMaxHealthFromVigor(vigorDie: string): number {
    // In Savage Worlds, you can take 3 wounds before incapacitation
    // Each wound is triggered when damage exceeds Toughness
    // For simplicity: base health = Toughness * 3
    return (this.character.toughness || 6) * 3;
  }

  public getCurrentPhase(): TurnPhase {
    return this.currentPhase;
  }

  public getTurnNumber(): number {
    return this.turnNumber;
  }

  public getPlayerHealth(): number {
    return this.playerHealth;
  }

  public getPlayerMaxHealth(): number {
    return this.playerMaxHealth;
  }

  public getCombatLog(): CombatLogEntry[] {
    return this.combatLog;
  }

  public getPlayerWounds(): number {
    return this.playerWounds;
  }

  public getPlayerShaken(): boolean {
    return this.playerShaken;
  }

  public setPlayerShaken(shaken: boolean) {
    this.playerShaken = shaken;
  }

  // Phase 1: Aim action methods
  public setPlayerAiming(aiming: boolean) {
    this.playerAiming = aiming;
    if (aiming) {
      this.addLog('Taking careful aim... (+2 to next ranged attack)', 'info');
    }
  }

  public getPlayerAiming(): boolean {
    return this.playerAiming;
  }

  // Phase 1: Called shot methods
  public setCalledShotTarget(target: CalledShotTarget) {
    this.calledShotTarget = target;
    if (target && target in CALLED_SHOT_MODIFIERS) {
      const mod = CALLED_SHOT_MODIFIERS[target];
      this.addLog(`Called Shot: ${mod.description} (${mod.toHit} to hit, +${mod.damageBonus} damage)`, 'info');
    }
  }

  public getCalledShotTarget(): CalledShotTarget {
    return this.calledShotTarget;
  }

  // Phase 1: Running state methods
  public setPlayerHasRun(hasRun: boolean) {
    this.playerHasRun = hasRun;
  }

  public getPlayerHasRun(): boolean {
    return this.playerHasRun;
  }

  // Critical Rules: Illumination methods
  public setIllumination(level: Illumination) {
    this.illumination = level;
    const penalty = ILLUMINATION_MODIFIERS[level];
    const desc = level === Illumination.BRIGHT ? 'Bright light (no penalty)' :
                 level === Illumination.DIM ? 'Dim light (-1)' :
                 level === Illumination.DARK ? 'Dark (-2)' :
                 'Pitch black (-4)';
    this.addLog(`Lighting changed: ${desc}`, 'info');
  }

  public getIllumination(): Illumination {
    return this.illumination;
  }

  public getIlluminationPenalty(): number {
    return ILLUMINATION_MODIFIERS[this.illumination];
  }

  // Critical Rules: Multi-action methods
  public getActionsThisTurn(): number {
    return this.actionsThisTurn;
  }

  public incrementActions(): void {
    this.actionsThisTurn++;
  }

  public getMultiActionPenalty(): number {
    // First action (actionsThisTurn=0): no penalty
    // Second action (actionsThisTurn=1): -2
    // Third action (actionsThisTurn=2): -4, etc.
    return this.actionsThisTurn > 0 ? this.actionsThisTurn * -2 : 0;
  }

  // Critical Rules: Gang Up bonus calculation
  // Count adjacent allies (within 1 square) attacking same target
  public calculateGangUpBonus(
    targetX: number,
    targetY: number,
    alliesPositions: Array<{ x: number; y: number }>
  ): number {
    let adjacentAllies = 0;

    for (const ally of alliesPositions) {
      const distance = Math.max(
        Math.abs(ally.x - targetX),
        Math.abs(ally.y - targetY)
      );
      if (distance <= 1) {
        adjacentAllies++;
      }
    }

    // +1 per adjacent ally, capped at +4
    return Math.min(adjacentAllies, MAX_GANG_UP_BONUS);
  }

  private addLog(message: string, type: 'info' | 'success' | 'damage' | 'miss') {
    const entry: CombatLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      message,
      type,
    };
    this.combatLog.push(entry);

    // Prevent unbounded growth - keep only last N entries
    if (this.combatLog.length > MAX_COMBAT_LOG_ENTRIES) {
      this.combatLog = this.combatLog.slice(-MAX_COMBAT_LOG_ENTRIES);
    }

    this.onLogUpdate([...this.combatLog]);
  }

  /**
   * Player attacks an enemy using Savage Worlds combat rules
   * PHASE 1: Now includes aim bonus, called shot, running target, and range penalties
   * CRITICAL RULES: Now includes illumination, multi-action, and gang-up bonuses
   */
  public playerAttackEnemy(
    enemy: GameEnemy,
    weapon: { name: string; damage?: string; rangePenalty?: number; range?: string } = { name: 'Fists', damage: 'Str+d4', rangePenalty: 0 },
    distance: number = 1,
    alliesPositions: Array<{ x: number; y: number }> = [] // For gang-up calculation
  ): { hit: boolean; rollDetails?: string } {
    // Determine if ranged attack and if in melee range
    const isRangedWeapon = weapon.range !== undefined;
    const isInMeleeRange = distance <= 1;

    // PHASE 1: Calculate all modifiers
    const rangePenalty = weapon.rangePenalty || 0;
    const woundPenalty = this.playerWounds * -1;
    const aimBonus = this.playerAiming && isRangedWeapon ? 2 : 0;
    const runningPenalty = enemy.hasRun ? -2 : 0;
    const calledShotMod = this.calledShotTarget && this.calledShotTarget in CALLED_SHOT_MODIFIERS
      ? CALLED_SHOT_MODIFIERS[this.calledShotTarget]
      : null;
    const calledShotPenalty = calledShotMod?.toHit || 0;

    // CRITICAL RULES: Calculate new modifiers
    const illuminationPenalty = ILLUMINATION_MODIFIERS[this.illumination];
    const multiActionPenalty = this.getMultiActionPenalty();
    const gangUpBonus = this.calculateGangUpBonus(enemy.gridX, enemy.gridY, alliesPositions);

    // Build attack description with all modifiers
    const modifiers: string[] = [];
    if (rangePenalty < 0) modifiers.push(`range ${rangePenalty}`);
    if (woundPenalty < 0) modifiers.push(`wounds ${woundPenalty}`);
    if (aimBonus > 0) modifiers.push(`aim +${aimBonus}`);
    if (runningPenalty < 0) modifiers.push(`running target -2`);
    if (calledShotPenalty < 0) modifiers.push(`${calledShotMod?.description} ${calledShotPenalty}`);
    if (illuminationPenalty < 0) modifiers.push(`lighting ${illuminationPenalty}`);
    if (multiActionPenalty < 0) modifiers.push(`multi-action ${multiActionPenalty}`);
    if (gangUpBonus > 0) modifiers.push(`gang up +${gangUpBonus}`);

    const modText = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : '';
    this.addLog(`${this.character.name} attacks ${enemy.name} with ${weapon.name}${modText}!`, 'info');

    // Savage Worlds Rule: Parry only applies to ranged attacks if attacker is within melee range
    let attackSkill: string;
    let attackDie: string;
    let targetNumber: number;
    let attackPurpose: string;

    if (isRangedWeapon) {
      // Ranged attack: Use Shooting/Throwing skill
      const shootingSkill = this.character.skills?.find(s =>
        s.name.toLowerCase().includes('shooting') || s.name.toLowerCase().includes('throwing')
      );
      attackDie = shootingSkill?.dieValue || '1d6';
      attackSkill = shootingSkill?.name || 'Shooting';
      attackPurpose = `${attackSkill} Attack`;

      // Ranged: Use Parry only if in melee range, otherwise use base target 4
      targetNumber = isInMeleeRange ? enemy.parry : 4;
    } else {
      // Melee attack: Use Fighting skill vs Parry
      const fightingSkill = this.character.skills?.find(s => s.name.toLowerCase().includes('fighting'));
      attackDie = fightingSkill?.dieValue || '1d6';
      attackSkill = 'Fighting';
      attackPurpose = 'Fighting Attack';
      targetNumber = enemy.parry;
    }

    // PHASE 1 + CRITICAL RULES: Combine all modifiers
    const totalModifier = woundPenalty + rangePenalty + aimBonus + runningPenalty + calledShotPenalty +
                          illuminationPenalty + multiActionPenalty + gangUpBonus;

    // CRITICAL RULES: Increment action counter (attack counts as an action)
    this.incrementActions();

    const attackRoll = rollSavageWorldsDice(
      attackDie,
      true, // Player is a Wild Card
      totalModifier, // Wound penalty + range penalty
      targetNumber
    );

    // Emit attack roll
    if (this.onDiceRoll) {
      this.onDiceRoll({
        id: `${Date.now()}-attack`,
        timestamp: Date.now(),
        roller: this.character.name,
        purpose: attackPurpose,
        dieType: attackDie,
        rolls: attackRoll.rolls,
        wildDie: attackRoll.wildDie,
        total: attackRoll.total,
        exploded: attackRoll.exploded,
        targetNumber: targetNumber,
        raises: attackRoll.raises,
      });
    }

    // Check if hit
    const targetText = (isRangedWeapon && !isInMeleeRange) ? `TN ${targetNumber}` : `Parry ${targetNumber}`;

    if (attackRoll.total < targetNumber) {
      this.addLog(`Miss! (Rolled ${attackRoll.total} vs ${targetText})`, 'miss');

      // BUG FIX: Clear aim and called shot even on miss
      this.playerAiming = false;
      this.calledShotTarget = null;

      return { hit: false, rollDetails: `🎲 ${attackRoll.total}` };
    }

    this.addLog(`Hit! (Rolled ${attackRoll.total} vs ${targetText})${attackRoll.raises > 0 ? ` with ${attackRoll.raises} raise(s)!` : ''}`, 'success');

    // Step 2: Roll damage using Savage Worlds damage calculation
    // BUG FIX: Correct parameter order (was: strengthDie, damage, raises)
    const damageResult = calculateDamageWithRaises(
      weapon.damage || 'Str+d4',        // baseDamage
      attackRoll.raises,                 // attackRaises
      this.character.strengthDie || '1d6' // strengthDie
    );

    // PHASE 1: Apply called shot damage bonus
    // BUG FIX: damageResult.total, not totalDamage
    let finalDamage = damageResult.total;
    if (calledShotMod && calledShotMod.damageBonus > 0) {
      finalDamage += calledShotMod.damageBonus;
      this.addLog(`${calledShotMod.description}! (+${calledShotMod.damageBonus} damage)`, 'success');
    }

    // Emit damage rolls
    if (this.onDiceRoll) {
      this.onDiceRoll({
        id: `${Date.now()}-damage`,
        timestamp: Date.now(),
        roller: this.character.name,
        purpose: 'Damage',
        dieType: weapon.damage || 'Str+d4',
        rolls: [damageResult.total],
        total: finalDamage,
        exploded: false,
      });
    }

    // Step 3: Compare damage to enemy Toughness
    const woundsDealt = finalDamage >= enemy.toughness
      ? Math.floor((finalDamage - enemy.toughness) / 4) + 1
      : 0;

    if (woundsDealt > 0) {
      const actualDamage = woundsDealt * 4;
      enemy.health = Math.max(0, enemy.health - actualDamage);

      this.addLog(
        `💥 Damage: ${finalDamage} vs Toughness ${enemy.toughness} = ${woundsDealt} wound(s)!`,
        'success'
      );
      this.addLog(`${enemy.name}: ${enemy.health}/${enemy.maxHealth} HP`, 'damage');

      if (enemy.health <= 0) {
        this.addLog(`${enemy.name} is defeated!`, 'success');
      }

      // PHASE 1: Clear aim and called shot after attack
      this.playerAiming = false;
      this.calledShotTarget = null;

      const rollDetails = `🎲 Attack: ${attackRoll.total}\n💥 Damage: ${finalDamage}`;
      return { hit: true, rollDetails };
    } else {
      this.addLog(`Shaken but no wounds! (Damage ${finalDamage} vs Toughness ${enemy.toughness})`, 'miss');

      // PHASE 1: Clear aim and called shot after attack (even on miss)
      this.playerAiming = false;
      this.calledShotTarget = null;

      return { hit: false, rollDetails: `🎲 ${attackRoll.total}\n💥 ${finalDamage}` };
    }
  }

  /**
   * Enemy attacks player
   * CRITICAL RULES: Now includes illumination and gang-up bonuses
   */
  public enemyAttackPlayer(
    enemy: GameEnemy,
    playerPosition: { x: number; y: number },
    otherEnemyPositions: Array<{ x: number; y: number }> = []
  ): boolean {
    // CRITICAL RULES: Calculate modifiers
    const illuminationPenalty = ILLUMINATION_MODIFIERS[this.illumination];
    const gangUpBonus = this.calculateGangUpBonus(playerPosition.x, playerPosition.y, otherEnemyPositions);

    const modifiers: string[] = [];
    if (illuminationPenalty < 0) modifiers.push(`lighting ${illuminationPenalty}`);
    if (gangUpBonus > 0) modifiers.push(`gang up +${gangUpBonus}`);
    const modText = modifiers.length > 0 ? ` (${modifiers.join(', ')})` : '';

    this.addLog(`${enemy.name} attacks ${this.character.name}${modText}!`, 'info');

    const totalModifier = illuminationPenalty + gangUpBonus;

    // Fighting roll vs player's Parry (enemy is NOT a Wild Card)
    const attackRoll = rollSavageWorldsDice(
      enemy.fightingDie,
      false, // Enemy is NOT a Wild Card
      totalModifier,
      this.character.parry || 2
    );

    if (attackRoll.total < (this.character.parry || 2)) {
      this.addLog(`${enemy.name} misses! (Rolled ${attackRoll.total} vs Parry ${this.character.parry})`, 'miss');
      return false;
    }

    this.addLog(`${enemy.name} hits! (Rolled ${attackRoll.total} vs Parry ${this.character.parry})${attackRoll.raises > 0 ? ` with ${attackRoll.raises} raise(s)!` : ''}`, 'damage');

    // Roll damage
    // BUG FIX: Correct parameter order
    const damageResult = calculateDamageWithRaises(
      'Str',              // baseDamage
      attackRoll.raises,  // attackRaises
      enemy.strengthDie   // strengthDie
    );

    // Compare to player Toughness
    // BUG FIX: damageResult.total, not totalDamage
    const woundsDealt = damageResult.total >= (this.character.toughness || 2)
      ? Math.floor((damageResult.total - (this.character.toughness || 2)) / 4) + 1
      : 0;

    if (woundsDealt > 0) {
      this.playerWounds += woundsDealt;
      const actualDamage = woundsDealt * 4;
      this.playerHealth = Math.max(0, this.playerHealth - actualDamage);

      this.addLog(
        `💥 Damage: ${damageResult.total} vs Toughness ${this.character.toughness} = ${woundsDealt} wound(s)!`,
        'damage'
      );
      this.addLog(`You: ${this.playerHealth}/${this.playerMaxHealth} HP | Wounds: ${this.playerWounds}`, 'damage');

      if (this.playerWounds >= 3) {
        this.addLog('You are INCAPACITATED!', 'damage');
        this.currentPhase = 'defeat';
        this.onPhaseChange(this.currentPhase, this.turnNumber);
      }

      return true;
    } else if (damageResult.total >= (this.character.toughness || 2) - 4) {
      // Even if no wounds, they might be shaken
      this.playerShaken = true;
      this.addLog(`You are SHAKEN! (Damage ${damageResult.total} vs Toughness ${this.character.toughness})`, 'damage');
      return true;
    } else {
      this.addLog(`No effect! (Damage ${damageResult.total} vs Toughness ${this.character.toughness})`, 'miss');
      return false;
    }
  }

  /**
   * End player turn and start enemy turn
   */
  public endPlayerTurn() {
    this.addLog('--- End Player Turn ---', 'info');

    // PHASE 1: Clear running flag for player
    this.playerHasRun = false;

    this.currentPhase = 'enemy';
    this.onPhaseChange(this.currentPhase, this.turnNumber);
  }

  /**
   * End enemy turn and start new player turn
   * PHASE 1: Clear running flags for all enemies at start of new turn
   * CRITICAL RULES: Reset multi-action counter at start of new turn
   */
  public endEnemyTurn(enemies?: GameEnemy[]) {
    this.turnNumber++;

    // PHASE 1: Clear running flags for all enemies
    if (enemies) {
      enemies.forEach(enemy => {
        enemy.hasRun = false;
      });
    }

    // CRITICAL RULES: Reset action counter for new turn
    this.actionsThisTurn = 0;

    this.addLog(`--- Turn ${this.turnNumber} - Your Turn ---`, 'info');
    this.currentPhase = 'player';
    this.onPhaseChange(this.currentPhase, this.turnNumber);
  }

  /**
   * Check victory condition
   */
  public checkVictory(enemies: GameEnemy[]): boolean {
    const allDefeated = enemies.every(e => e.health <= 0);
    if (allDefeated && this.currentPhase !== 'victory') {
      this.addLog('Victory! All enemies defeated!', 'success');
      this.currentPhase = 'victory';
      this.onPhaseChange(this.currentPhase, this.turnNumber);
      return true;
    }
    return false;
  }
}
