import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ArenaScene } from '../engine/ArenaScene';
import { GameCharacter, CombatLogEntry, DiceRollEvent, Equipment } from '../types/GameTypes';
import { TurnPhase } from '../engine/CombatManager';

interface CombatState {
  playerHealth: number;
  playerMaxHealth: number;
  turnNumber: number;
  phase: TurnPhase;
  combatLog: CombatLogEntry[];
}

interface GameCanvasProps {
  character?: GameCharacter;
  selectedWeapon?: Equipment;
  onCombatStateUpdate?: (state: CombatState) => void;
  onDiceRoll?: (roll: DiceRollEvent) => void;
  onWoundsUpdate?: (wounds: number, maxWounds: number) => void;
  onShakenUpdate?: (isShaken: boolean) => void;
  onMovementBudgetUpdate?: (current: number, max: number) => void;
  onPhaserGameReady?: (game: Phaser.Game) => void;
}

export function GameCanvas({ character, selectedWeapon, onCombatStateUpdate, onDiceRoll, onWoundsUpdate, onShakenUpdate, onMovementBudgetUpdate, onPhaserGameReady }: GameCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const combatStateRef = useRef<CombatState>({
    playerHealth: 0,
    playerMaxHealth: 0,
    turnNumber: 1,
    phase: 'player',
    combatLog: [],
  });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1280,
      height: 800,
      parent: containerRef.current,
      backgroundColor: '#2d1b0e',
      scene: [ArenaScene],
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 }, // Top-down, no gravity
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    // Create Phaser game instance
    gameRef.current = new Phaser.Game(config);

    // Notify parent that game is ready
    if (onPhaserGameReady) {
      onPhaserGameReady(gameRef.current);
    }

    // Set up event listeners for combat state updates
    gameRef.current.events.on('combatStateInit', (state: CombatState) => {
      combatStateRef.current = state;
      if (onCombatStateUpdate) {
        onCombatStateUpdate(state);
      }
    });

    gameRef.current.events.on('combatLogUpdate', (log: CombatLogEntry[]) => {
      combatStateRef.current.combatLog = log;
      if (onCombatStateUpdate) {
        onCombatStateUpdate({ ...combatStateRef.current });
      }
    });

    gameRef.current.events.on('phaseChange', (phase: TurnPhase, turn: number) => {
      combatStateRef.current.phase = phase;
      combatStateRef.current.turnNumber = turn;
      if (onCombatStateUpdate) {
        onCombatStateUpdate({ ...combatStateRef.current });
      }
    });

    gameRef.current.events.on('healthUpdate', (health: { playerHealth: number; playerMaxHealth: number }) => {
      combatStateRef.current.playerHealth = health.playerHealth;
      combatStateRef.current.playerMaxHealth = health.playerMaxHealth;
      if (onCombatStateUpdate) {
        onCombatStateUpdate({ ...combatStateRef.current });
      }
    });

    // Dice roll event listener
    gameRef.current.events.on('diceRoll', (roll: DiceRollEvent) => {
      if (onDiceRoll) {
        onDiceRoll(roll);
      }
    });

    // Wounds update event listener
    gameRef.current.events.on('woundsUpdate', (data: { wounds: number; maxWounds: number }) => {
      if (onWoundsUpdate) {
        onWoundsUpdate(data.wounds, data.maxWounds);
      }
    });

    // Shaken update event listener
    gameRef.current.events.on('shakenUpdate', (data: { isShaken: boolean }) => {
      if (onShakenUpdate) {
        onShakenUpdate(data.isShaken);
      }
    });

    // Movement budget update event listener
    gameRef.current.events.on('movementBudgetUpdate', (data: { current: number; max: number }) => {
      if (onMovementBudgetUpdate) {
        onMovementBudgetUpdate(data.current, data.max);
      }
    });

    // Pass character and weapon data to the scene
    if (character) {
      gameRef.current.scene.start('ArenaScene', { character, selectedWeapon });
    }

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [character]); // Removed onCombatStateUpdate from dependencies

  return (
    <div
      ref={containerRef}
      style={{
        width: '1280px',
        height: '800px',
        margin: '0 auto',
        border: '4px solid #8b4513',
        borderRadius: '4px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
      }}
    />
  );
}
