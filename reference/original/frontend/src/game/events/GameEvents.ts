/**
 * Typed Game Event System
 *
 * Replaces string-based Phaser events with type-safe communication between React and Phaser.
 * Benefits:
 * - Compile-time event name checking (typos caught by TypeScript)
 * - Proper typing for event payloads (no more 'any')
 * - IDE autocomplete for event names and payloads
 * - Single source of truth for all game events
 */

import { Equipment, CombatLogEntry, DiceRollEvent, CombatAction, CalledShotTarget, Illumination } from '../types/GameTypes';
import { TurnPhase } from '../engine/CombatManager';
import { GeneratedMap } from '../../types/map';

// =============================================================================
// React → Phaser Events (User actions)
// =============================================================================

export interface PlayerActionSelectedEvent {
  action: CombatAction;
  power?: string;
}

export interface WeaponSelectedEvent {
  weapon: Equipment;
}

export interface CalledShotSelectedEvent {
  target: CalledShotTarget;
}

export interface CameraFollowToggleEvent {
  enabled: boolean;
}

export interface WeaponRangesToggleEvent {
  enabled: boolean;
}

export interface MovementRangesToggleEvent {
  enabled: boolean;
}

export interface IlluminationChangeEvent {
  level: Illumination;
}

export interface LoadGeneratedMapEvent {
  mapData: GeneratedMap;
}

// =============================================================================
// Multiplayer Events (Bidirectional)
// =============================================================================

export interface LocalTokenMovedEvent {
  tokenId: string;
  tokenType: 'PLAYER' | 'ENEMY';
  fromX?: number;
  fromY?: number;
  toX: number;
  toY: number;
}

export interface RemoteTokenMovedEvent {
  tokenId: string;
  tokenType: 'PLAYER' | 'ENEMY';
  gridX: number;
  gridY: number;
  movedBy: string;
}

// =============================================================================
// Phaser → React Events (Game state updates)
// =============================================================================

export interface CombatLogUpdateEvent {
  log: CombatLogEntry[];
}

export interface HealthUpdateEvent {
  playerHealth: number;
  playerMaxHealth: number;
}

export interface WoundsUpdateEvent {
  wounds: number;
  maxWounds: number;
}

export interface ShakenUpdateEvent {
  isShaken: boolean;
}

export interface PhaseChangeEvent {
  phase: TurnPhase;
  turnNumber: number;
}

export interface DiceRollUpdateEvent {
  roll: DiceRollEvent;
}

export interface MovementBudgetUpdateEvent {
  current: number;
  max: number;
}

// =============================================================================
// Event Map (All events in one place)
// =============================================================================

export interface GameEventMap {
  // React → Phaser
  'playerActionSelected': PlayerActionSelectedEvent;
  'weaponSelected': WeaponSelectedEvent;
  'calledShotSelected': CalledShotSelectedEvent;
  'cameraFollowToggle': CameraFollowToggleEvent;
  'weaponRangesToggle': WeaponRangesToggleEvent;
  'movementRangesToggle': MovementRangesToggleEvent;
  'illuminationChange': IlluminationChangeEvent;
  'loadGeneratedMap': LoadGeneratedMapEvent;
  'remoteTokenMoved': RemoteTokenMovedEvent;

  // Phaser → React
  'combatLogUpdate': CombatLogUpdateEvent;
  'healthUpdate': HealthUpdateEvent;
  'woundsUpdate': WoundsUpdateEvent;
  'shakenUpdate': ShakenUpdateEvent;
  'phaseChange': PhaseChangeEvent;
  'diceRoll': DiceRollUpdateEvent;
  'movementBudgetUpdate': MovementBudgetUpdateEvent;
  'localTokenMoved': LocalTokenMovedEvent;
}

// =============================================================================
// Type-safe Event Emitter Wrapper
// =============================================================================

export class TypedGameEvents {
  constructor(private phaserEvents: Phaser.Events.EventEmitter) {}

  /**
   * Emit a typed event
   * TypeScript will ensure event name and payload match GameEventMap
   */
  emit<K extends keyof GameEventMap>(
    event: K,
    payload: GameEventMap[K]
  ): void {
    this.phaserEvents.emit(event, payload);
  }

  /**
   * Listen to a typed event
   * TypeScript will ensure handler receives correct payload type
   */
  on<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ): void {
    this.phaserEvents.on(event, handler);
  }

  /**
   * Listen to event once
   */
  once<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ): void {
    this.phaserEvents.once(event, handler);
  }

  /**
   * Remove event listener
   */
  off<K extends keyof GameEventMap>(
    event: K,
    handler: (payload: GameEventMap[K]) => void
  ): void {
    this.phaserEvents.off(event, handler);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners<K extends keyof GameEventMap>(event?: K): void {
    if (event) {
      this.phaserEvents.removeAllListeners(event);
    } else {
      this.phaserEvents.removeAllListeners();
    }
  }
}

// =============================================================================
// Convenience Functions (backwards compatibility)
// =============================================================================

/**
 * Wrap Phaser game events with type safety
 */
export function wrapGameEvents(game: Phaser.Game): TypedGameEvents {
  return new TypedGameEvents(game.events);
}

/**
 * Wrap Phaser scene events with type safety
 */
export function wrapSceneEvents(scene: Phaser.Scene): TypedGameEvents {
  return new TypedGameEvents(scene.game.events);
}
