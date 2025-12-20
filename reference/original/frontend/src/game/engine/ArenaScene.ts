import Phaser from 'phaser';
import { GameCharacter, GameEnemy, CombatLogEntry, Equipment, CoverTile, Cover } from '../types/GameTypes';
import { CombatManager, TurnPhase } from './CombatManager';
import { TypedGameEvents, wrapSceneEvents } from '../events/GameEvents';
import { initializeMapLoaderListener, MapLoader } from '../utils/MapLoader';

export class ArenaScene extends Phaser.Scene {
  // Type-safe event bus (wraps game.events, not scene.events)
  private gameEvents!: TypedGameEvents;

  // Grid settings
  private readonly TILE_SIZE = 32; // 32x32 pixel tiles
  private readonly GRID_WIDTH = 200; // 200 tiles wide
  private readonly GRID_HEIGHT = 200; // 200 tiles tall

  // Game objects
  private player?: Phaser.GameObjects.Rectangle;
  private playerGridX = 100; // Starting grid position (center)
  private playerGridY = 100;
  private enemySprites: Phaser.GameObjects.Rectangle[] = [];
  private enemyData: GameEnemy[] = [];

  // Multiplayer - remote player tokens
  private remotePlayerSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();

  // Grid visuals
  private arenaBackground?: Phaser.GameObjects.Rectangle; // Original brown background
  private gridGraphics?: Phaser.GameObjects.Graphics;
  private movementRangeGraphics?: Phaser.GameObjects.Graphics;
  private attackRangeGraphics?: Phaser.GameObjects.Graphics;
  private lineOfSightGraphics?: Phaser.GameObjects.Graphics;
  private hoveredTile?: { x: number; y: number };
  private attackInfoText?: Phaser.GameObjects.Text;

  // Input
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private attackKey?: Phaser.Input.Keyboard.Key;
  private lastMoveTime = 0;
  private moveDelay = 200; // ms between moves
  private lastActionTime = 0;

  // Camera zoom
  private currentZoom = 1;
  private minZoom = 0.5;
  private maxZoom = 2;

  // Camera follow
  private cameraFollowEnabled = true;
  private cameraPanSpeed = 10;

  /**
   * Check if user is currently typing in an input field.
   * Used to prevent Phaser keyboard shortcuts from interfering with text input.
   */
  private isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' ||
           (activeElement as HTMLElement).isContentEditable;
  }

  // Weapon ranges display
  private showWeaponRanges = true;

  // Movement ranges display
  private showMovementRanges = true;

  // Movement budget
  // Dynamically updates as player moves - range visualization reflects remaining movement
  // Extensible for vehicles/horses: just update movementBudget and call updateMovementRange()
  private movementBudget = 0; // Remaining movement this turn
  private maxMovementBudget = 0; // Total movement available this turn

  // Camera drag
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;

  // Game state
  private character?: GameCharacter;
  private selectedTile?: { x: number; y: number };
  private combatManager?: CombatManager;
  private selectedWeapon?: Equipment;

  // Cover system
  private coverTiles: CoverTile[] = [];
  private coverGraphics?: Phaser.GameObjects.Graphics;
  private coverTooltip?: Phaser.GameObjects.Text;
  private coverTooltipTimer?: Phaser.Time.TimerEvent;
  private hoveredCoverTile?: { gridX: number; gridY: number };

  // Coordinate display
  private coordinateText?: Phaser.GameObjects.Text;
  private showCoordinates = true; // Toggle for coordinate display

  // Map loader for tactical overlays
  private mapLoader?: MapLoader;

  constructor() {
    super({ key: 'ArenaScene' });
  }

  init(data: { character?: GameCharacter; selectedWeapon?: Equipment }) {
    this.character = data.character;
    this.selectedWeapon = data.selectedWeapon;
    console.log('ArenaScene initialized with weapon:', this.selectedWeapon);
  }

  create() {
    // Initialize MapLoader listener for AI-generated maps and store instance
    this.mapLoader = initializeMapLoaderListener(this);

    const arenaWidth = this.GRID_WIDTH * this.TILE_SIZE;
    const arenaHeight = this.GRID_HEIGHT * this.TILE_SIZE;

    // Draw arena background (store reference so it can be destroyed when loading custom maps)
    this.arenaBackground = this.add.rectangle(
      arenaWidth / 2,
      arenaHeight / 2,
      arenaWidth,
      arenaHeight,
      0x2d1b0e // Dark brown arena floor
    );
    this.arenaBackground.setDepth(-1); // Below everything

    // Draw the grid
    this.drawGrid();

    // Set world bounds to the full arena size
    this.cameras.main.setBounds(0, 0, arenaWidth, arenaHeight);

    // Create movement range graphics layer (drawn under characters)
    this.movementRangeGraphics = this.add.graphics();
    this.movementRangeGraphics.setDepth(1);

    // Create attack range graphics layer (drawn under characters)
    this.attackRangeGraphics = this.add.graphics();
    this.attackRangeGraphics.setDepth(2);

    // Create cover graphics layer (drawn above grid but under characters)
    this.coverGraphics = this.add.graphics();
    this.coverGraphics.setDepth(3);

    // Create line of sight graphics layer (drawn above most elements)
    this.lineOfSightGraphics = this.add.graphics();
    this.lineOfSightGraphics.setDepth(10);

    // Initialize CombatManager
    if (this.character) {
      this.combatManager = new CombatManager(
        this.character,
        (log) => {
          // Emit combat log update to React
          this.game.events.emit('combatLogUpdate', log);
        },
        (phase, turn) => {
          // Emit phase change to React
          this.game.events.emit('phaseChange', phase, turn);
          if (phase === 'enemy') {
            this.executeEnemyTurn();
          } else if (phase === 'player') {
            // Reset movement budget for new turn
            this.maxMovementBudget = this.character!.pace || 6;
            this.movementBudget = this.maxMovementBudget;

            // Emit movement budget update
            this.game.events.emit('movementBudgetUpdate', {
              current: this.movementBudget,
              max: this.maxMovementBudget,
            });
          }
        },
        (diceRoll) => {
          // Emit dice roll to React
          this.game.events.emit('diceRoll', diceRoll);
        }
      );

      // Initialize movement budget for first turn
      this.maxMovementBudget = this.character.pace || 6;
      this.movementBudget = this.maxMovementBudget;

      // Emit initial combat state to React
      this.game.events.emit('combatStateInit', {
        playerHealth: this.combatManager.getPlayerHealth(),
        playerMaxHealth: this.combatManager.getPlayerMaxHealth(),
        turnNumber: this.combatManager.getTurnNumber(),
        phase: this.combatManager.getCurrentPhase(),
        combatLog: this.combatManager.getCombatLog(),
      });

      // Emit initial movement budget
      this.game.events.emit('movementBudgetUpdate', {
        current: this.movementBudget,
        max: this.maxMovementBudget,
      });
    }

    // Create player at grid position
    this.createPlayer(this.playerGridX, this.playerGridY);

    // Make camera follow player (with smooth lerp)
    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }

    // Create cover objects on the battlefield
    this.createCoverObjects();

    // Create cover tooltip (initially hidden)
    this.coverTooltip = this.add.text(0, 0, '', {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 6, y: 4 },
    });
    this.coverTooltip.setDepth(100);
    this.coverTooltip.setScrollFactor(0); // Fix to screen (HUD element)
    this.coverTooltip.setVisible(false);

    // Create coordinate display (follows mouse cursor)
    this.coordinateText = this.add.text(0, 0, '', {
      fontSize: '12px',
      color: '#FFD700',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 6, y: 3 },
    });
    this.coordinateText.setDepth(200);
    this.coordinateText.setScrollFactor(0); // Fix to screen (HUD element)
    this.coordinateText.setVisible(false);

    // Create test enemies around the player
    this.createTestEnemy(115, 95); // Northeast
    this.createTestEnemy(105, 110); // South
    this.createTestEnemy(90, 100); // West

    // Set up keyboard controls
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.attackKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);

    // Add mouse input for grid clicking
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Handle drag-to-pan
      if (pointer.isDown) {
        const dragThreshold = 5; // pixels of movement before considering it a drag
        const deltaX = pointer.x - this.dragStartX;
        const deltaY = pointer.y - this.dragStartY;

        if (!this.isDragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
          this.isDragging = true;
        }

        if (this.isDragging) {
          // Pan the camera based on drag movement
          const camera = this.cameras.main;
          camera.scrollX = this.cameraStartX - (pointer.x - this.dragStartX) / this.currentZoom;
          camera.scrollY = this.cameraStartY - (pointer.y - this.dragStartY) / this.currentZoom;

          // Hide coordinate display while dragging
          if (this.coordinateText) {
            this.coordinateText.setVisible(false);
          }
          return; // Don't update hover tile while dragging
        }
      }

      const gridX = Math.floor(pointer.worldX / this.TILE_SIZE);
      const gridY = Math.floor(pointer.worldY / this.TILE_SIZE);

      if (gridX >= 0 && gridX < this.GRID_WIDTH && gridY >= 0 && gridY < this.GRID_HEIGHT) {
        this.hoveredTile = { x: gridX, y: gridY };
        this.updateMovementRange();

        // Update coordinate display (only if enabled)
        if (this.coordinateText && this.showCoordinates) {
          this.coordinateText.setText(`(${gridX}, ${gridY})`);
          // Position slightly below and to the right of cursor
          this.coordinateText.setPosition(pointer.x + 15, pointer.y + 15);
          this.coordinateText.setVisible(true);
        } else if (this.coordinateText) {
          this.coordinateText.setVisible(false);
        }

        // Update cover tooltip
        this.updateCoverTooltip(gridX, gridY, pointer.x, pointer.y);
      } else {
        // Hide tooltips when outside grid
        if (this.coverTooltip) {
          this.coverTooltip.setVisible(false);
        }
        if (this.coordinateText) {
          this.coordinateText.setVisible(false);
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Track potential drag start
      this.isDragging = false;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.cameraStartX = this.cameras.main.scrollX;
      this.cameraStartY = this.cameras.main.scrollY;
    });

    // Add pointerup handler to complete drag or process click
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // If it was a drag, don't process as a click
      if (this.isDragging) {
        this.isDragging = false;
        return;
      }

      // Not a drag - process as a click
      if (!this.combatManager || this.combatManager.getCurrentPhase() !== 'player') return;

      const gridX = Math.floor(pointer.worldX / this.TILE_SIZE);
      const gridY = Math.floor(pointer.worldY / this.TILE_SIZE);

      // Check if clicking on an enemy for attack
      const enemyIndex = this.enemyData.findIndex(e => e.gridX === gridX && e.gridY === gridY);
      if (enemyIndex !== -1) {
        const enemy = this.enemyData[enemyIndex];
        if (enemy.health > 0) {
          const distance = this.getGridDistance(this.playerGridX, this.playerGridY, gridX, gridY);
          const weaponRange = this.getWeaponRange(this.selectedWeapon);

          console.log('Click on enemy:', enemy.name, 'Distance:', distance, 'Weapon range:', weaponRange, 'Selected weapon:', this.selectedWeapon);

          if (this.isWithinWeaponRange(gridX, gridY, this.selectedWeapon)) {
            this.attackEnemy(enemy, enemyIndex);
          } else {
            console.log('Target out of range! Distance:', distance, 'Max range:', weaponRange.max);
            // Add visual feedback for out of range
            if (this.combatManager) {
              const logEntry = {
                id: `${Date.now()}-${Math.random()}`,
                timestamp: Date.now(),
                message: `${enemy.name} is out of range! (${distance} squares, max range: ${weaponRange.max})`,
                type: 'miss' as const,
              };
              const currentLog = this.combatManager.getCombatLog();
              currentLog.push(logEntry);
              this.game.events.emit('combatLogUpdate', [...currentLog]);
            }
          }
        }
        return;
      }

      // Otherwise try to move
      if (this.canMoveTo(gridX, gridY)) {
        this.movePlayerTo(gridX, gridY);
      }
    });

    // Add instructions
    this.add.text(16, 16, 'Arrow Keys/Click to Move | A or Click Enemy to Attack | Space to End Turn | C to Toggle Coordinates', {
      fontSize: '12px',
      color: '#f5e6d3',
      backgroundColor: '#2d1b0e',
      padding: { x: 8, y: 4 },
    }).setDepth(100);

    // Add character stats display
    if (this.character) {
      const statsText = `${this.character.name} | Pace: ${this.character.pace} squares
Parry: ${this.character.parry} | Toughness: ${this.character.toughness}`;

      this.add.text(16, arenaHeight - 50, statsText, {
        fontSize: '12px',
        color: '#f5e6d3',
        backgroundColor: '#2d1b0e',
        padding: { x: 8, y: 4 },
      }).setDepth(100);
    }

    // Show initial movement range
    this.updateMovementRange();

    // Initialize type-safe event bus
    this.gameEvents = wrapSceneEvents(this);

    // Listen for action button events from React (TYPE-SAFE)
    this.gameEvents.on('playerActionSelected', (payload) => {
      this.handlePlayerAction(payload);
    });

    // PHASE 1: Listen for called shot target selection from React (TYPE-SAFE)
    this.gameEvents.on('calledShotSelected', (payload) => {
      if (this.combatManager) {
        this.combatManager.setCalledShotTarget(payload.target);
        this.gameEvents.emit('combatLogUpdate', { log: [...this.combatManager.getCombatLog()] });
      }
      console.log('[ArenaScene] Called shot target selected:', payload.target);
    });

    // Listen for weapon selection changes from React (TYPE-SAFE)
    this.gameEvents.on('weaponSelected', (payload) => {
      console.log('[ArenaScene] Weapon object received:', JSON.stringify(payload.weapon, null, 2));
      this.selectedWeapon = payload.weapon;
      console.log('[ArenaScene] this.selectedWeapon after assignment:', JSON.stringify(this.selectedWeapon, null, 2));
      this.updateMovementRange(); // Refresh range indicators
    });

    // Listen for camera follow toggle from React (TYPE-SAFE)
    this.gameEvents.on('cameraFollowToggle', (payload) => {
      console.log('[ArenaScene] Camera follow toggled:', payload.enabled);
      this.cameraFollowEnabled = payload.enabled;
      if (payload.enabled && this.player) {
        // Re-enable camera follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      } else {
        // Disable camera follow
        this.cameras.main.stopFollow();
      }
    });

    // Listen for weapon ranges toggle from React (TYPE-SAFE)
    this.gameEvents.on('weaponRangesToggle', (payload) => {
      console.log('[ArenaScene] Weapon ranges display toggled:', payload.enabled);
      this.showWeaponRanges = payload.enabled;
      this.updateMovementRange(); // Refresh to show/hide ranges
    });

    // Listen for movement ranges toggle from React (TYPE-SAFE)
    this.gameEvents.on('movementRangesToggle', (payload) => {
      console.log('[ArenaScene] Movement ranges display toggled:', payload.enabled);
      this.showMovementRanges = payload.enabled;
      this.updateMovementRange(); // Refresh to show/hide ranges
    });

    // Listen for illumination changes from React (TYPE-SAFE)
    this.gameEvents.on('illuminationChange', (payload) => {
      console.log('[ArenaScene] Illumination changed:', payload.level);
      if (this.combatManager) {
        this.combatManager.setIllumination(payload.level);
      }
    });

    // Listen for map grid toggle from React (TYPE-SAFE)
    this.gameEvents.on('mapGridToggle', (payload) => {
      console.log('[ArenaScene] Map grid toggle:', payload.enabled);
      if (this.mapLoader) {
        this.mapLoader.toggleGrid(payload.enabled);
      }
    });

    // Listen for map walls toggle from React (TYPE-SAFE)
    this.gameEvents.on('mapWallsToggle', (payload) => {
      console.log('[ArenaScene] Map walls toggle:', payload.enabled);
      if (this.mapLoader) {
        this.mapLoader.toggleWalls(payload.enabled);
      }
    });

    // Listen for map cover toggle from React (TYPE-SAFE)
    this.gameEvents.on('mapCoverToggle', (payload) => {
      console.log('[ArenaScene] Map cover toggle:', payload.enabled);
      if (this.mapLoader) {
        this.mapLoader.toggleCover(payload.enabled);
      }
    });

    // MULTIPLAYER: Listen for remote player token movements (TYPE-SAFE)
    this.gameEvents.on('remoteTokenMoved', (event) => {
      console.log('[ArenaScene] Remote token moved:', event.movedBy, 'to', event.gridX, event.gridY);
      this.handleRemoteTokenMoved(event);
    });

    // Set up camera zoom controls
    this.setupZoomControls();
  }

  private setupZoomControls() {
    // Mouse wheel zoom
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
      const zoomChange = deltaY > 0 ? -0.1 : 0.1;
      this.currentZoom = Phaser.Math.Clamp(this.currentZoom + zoomChange, this.minZoom, this.maxZoom);
      this.cameras.main.setZoom(this.currentZoom);
    });

    // Keyboard zoom controls (+ and - keys)
    this.input.keyboard?.on('keydown-PLUS', () => {
      if (this.isTypingInInput()) return;
      this.currentZoom = Phaser.Math.Clamp(this.currentZoom + 0.1, this.minZoom, this.maxZoom);
      this.cameras.main.setZoom(this.currentZoom);
    });

    this.input.keyboard?.on('keydown-MINUS', () => {
      if (this.isTypingInInput()) return;
      this.currentZoom = Phaser.Math.Clamp(this.currentZoom - 0.1, this.minZoom, this.maxZoom);
      this.cameras.main.setZoom(this.currentZoom);
    });

    // Also support = key for zoom in (no shift needed)
    this.input.keyboard?.on('keydown-EQUALS', () => {
      if (this.isTypingInInput()) return;
      this.currentZoom = Phaser.Math.Clamp(this.currentZoom + 0.1, this.minZoom, this.maxZoom);
      this.cameras.main.setZoom(this.currentZoom);
    });

    // Toggle coordinate display with 'C' key
    this.input.keyboard?.on('keydown-C', () => {
      if (this.isTypingInInput()) return;
      this.showCoordinates = !this.showCoordinates;
      if (!this.showCoordinates && this.coordinateText) {
        this.coordinateText.setVisible(false);
      }
      console.log(`[ArenaScene] Coordinate display: ${this.showCoordinates ? 'ON' : 'OFF'}`);
    });
  }

  private drawGrid() {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, 0x4a3425, 0.3); // Subtle brown grid lines

    // Draw vertical lines
    for (let x = 0; x <= this.GRID_WIDTH; x++) {
      this.gridGraphics.lineBetween(
        x * this.TILE_SIZE,
        0,
        x * this.TILE_SIZE,
        this.GRID_HEIGHT * this.TILE_SIZE
      );
    }

    // Draw horizontal lines
    for (let y = 0; y <= this.GRID_HEIGHT; y++) {
      this.gridGraphics.lineBetween(
        0,
        y * this.TILE_SIZE,
        this.GRID_WIDTH * this.TILE_SIZE,
        y * this.TILE_SIZE
      );
    }

    // Draw border
    this.gridGraphics.lineStyle(4, 0x8b4513);
    this.gridGraphics.strokeRect(
      0,
      0,
      this.GRID_WIDTH * this.TILE_SIZE,
      this.GRID_HEIGHT * this.TILE_SIZE
    );
  }

  private createPlayer(gridX: number, gridY: number) {
    const pixelX = gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
    const pixelY = gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

    this.player = this.add.rectangle(
      pixelX,
      pixelY,
      this.TILE_SIZE - 4,
      this.TILE_SIZE - 4,
      0x4169e1 // Blue for player
    );
    this.player.setStrokeStyle(2, 0xffffff);
    this.player.setDepth(10);

    // Add player label
    if (this.character) {
      const nameText = this.add.text(
        pixelX,
        pixelY - this.TILE_SIZE / 2 - 10,
        this.character.name,
        {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 3, y: 1 },
        }
      );
      nameText.setOrigin(0.5);
      nameText.setDepth(11);
      this.player.setData('nameText', nameText);
    }
  }

  private createTestEnemy(gridX: number, gridY: number) {
    // Create enemy data (Savage Worlds stats)
    const enemyData: GameEnemy = {
      id: `enemy_${Date.now()}`,
      name: 'Bandit',
      type: 'humanoid',
      health: 20,
      maxHealth: 20,
      toughness: 5,
      parry: 4,
      pace: 6,
      fightingDie: '1d6',
      strengthDie: '1d6',
      gridX,
      gridY,
      aiState: 'idle',
      hasActed: false,
      hasRun: false, // PHASE 1: Running target modifier
    };
    this.enemyData.push(enemyData);

    const pixelX = gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
    const pixelY = gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

    const enemy = this.add.rectangle(
      pixelX,
      pixelY,
      this.TILE_SIZE - 4,
      this.TILE_SIZE - 4,
      0xff4444 // Red for enemy
    );
    enemy.setStrokeStyle(2, 0xffffff);
    enemy.setDepth(10);
    enemy.setData('enemyId', enemyData.id);
    this.enemySprites.push(enemy);

    // Add enemy label
    const enemyText = this.add.text(
      pixelX,
      pixelY - this.TILE_SIZE / 2 - 10,
      enemyData.name,
      {
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 3, y: 1 },
      }
    );
    enemyText.setOrigin(0.5);
    enemyText.setDepth(11);
    enemy.setData('nameText', enemyText);
  }

  private updateMovementRange() {
    if (!this.movementRangeGraphics || !this.character || !this.combatManager) return;
    if (this.combatManager.getCurrentPhase() !== 'player') return;

    this.movementRangeGraphics.clear();
    if (this.attackRangeGraphics) {
      this.attackRangeGraphics.clear();
    }
    if (this.lineOfSightGraphics) {
      this.lineOfSightGraphics.clear();
    }

    // Use remaining movement budget instead of base pace
    // This updates dynamically as player moves or sprints
    const remainingMovement = this.movementBudget;

    // Highlight all tiles within movement range (only if enabled)
    if (this.showMovementRanges) {
      for (let x = 0; x < this.GRID_WIDTH; x++) {
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
          const distance = this.getGridDistance(this.playerGridX, this.playerGridY, x, y);

          if (distance <= remainingMovement && distance > 0) {
            // Check if tile is occupied by enemy
            const isOccupied = this.enemyData.some(enemy => enemy.gridX === x && enemy.gridY === y && enemy.health > 0);

            if (!isOccupied) {
              // Highlight valid movement tiles in blue
              this.movementRangeGraphics.fillStyle(0x4169e1, 0.2);
              this.movementRangeGraphics.fillRect(
                x * this.TILE_SIZE + 2,
                y * this.TILE_SIZE + 2,
                this.TILE_SIZE - 4,
                this.TILE_SIZE - 4
              );
            }
          }
        }
      }
    }

    // Highlight grid squares based on weapon range (only if enabled)
    if (this.attackRangeGraphics && this.showWeaponRanges) {
      const weaponRange = this.getWeaponRange(this.selectedWeapon);

      // Color grid squares based on weapon range
      for (let y = 0; y < this.GRID_HEIGHT; y++) {
        for (let x = 0; x < this.GRID_WIDTH; x++) {
          // Skip player position
          if (x === this.playerGridX && y === this.playerGridY) continue;

          const distance = this.getGridDistance(this.playerGridX, this.playerGridY, x, y);

          // Determine color based on range
          let color: number | null = null;
          let alpha = 0.15;

          if (distance <= weaponRange.short && distance > 0) {
            color = 0x44ff44; // Green for short range
            alpha = 0.2;
          } else if (distance <= weaponRange.medium) {
            color = 0xffaa44; // Orange for medium range
            alpha = 0.18;
          } else if (distance <= weaponRange.long) {
            color = 0xff4444; // Red for long range
            alpha = 0.15;
          }

          // Draw colored square if in range
          if (color !== null) {
            this.attackRangeGraphics!.fillStyle(color, alpha);
            this.attackRangeGraphics!.fillRect(
              x * this.TILE_SIZE + 1,
              y * this.TILE_SIZE + 1,
              this.TILE_SIZE - 2,
              this.TILE_SIZE - 2
            );
          }
        }
      }

      // Highlight individual enemies with color based on range
      this.enemyData.forEach(enemy => {
        if (enemy.health > 0 && this.isWithinWeaponRange(enemy.gridX, enemy.gridY, this.selectedWeapon)) {
          const distance = this.getGridDistance(this.playerGridX, this.playerGridY, enemy.gridX, enemy.gridY);
          const penalty = this.getRangePenalty(distance, this.selectedWeapon);

          let color = 0xff8844;
          let alpha = 0.3;

          if (penalty === 0) {
            color = 0x44ff44; // Green for short range (no penalty)
            alpha = 0.4;
          } else if (penalty === -2) {
            color = 0xffaa44; // Orange for medium range (-2)
            alpha = 0.35;
          } else if (penalty === -4) {
            color = 0xff4444; // Red for long range (-4)
            alpha = 0.3;
          }

          this.attackRangeGraphics!.fillStyle(color, alpha);
          this.attackRangeGraphics!.fillRect(
            enemy.gridX * this.TILE_SIZE + 2,
            enemy.gridY * this.TILE_SIZE + 2,
            this.TILE_SIZE - 4,
            this.TILE_SIZE - 4
          );

          // Show attack info if hovering over this enemy
          if (this.hoveredTile && this.hoveredTile.x === enemy.gridX && this.hoveredTile.y === enemy.gridY) {
            this.showAttackInfo(enemy, distance, penalty);
          }
        }
      });
    }

    // Clear attack info if not hovering over an enemy
    if (this.attackInfoText && (!this.hoveredTile || !this.enemyData.some(e =>
      e.health > 0 && e.gridX === this.hoveredTile!.x && e.gridY === this.hoveredTile!.y &&
      this.isWithinWeaponRange(e.gridX, e.gridY, this.selectedWeapon)
    ))) {
      this.attackInfoText.setVisible(false);
    }

    // Highlight hovered tile (only if movement ranges are shown)
    if (this.hoveredTile && this.showMovementRanges) {
      const distance = this.getGridDistance(
        this.playerGridX,
        this.playerGridY,
        this.hoveredTile.x,
        this.hoveredTile.y
      );

      if (distance <= this.movementBudget && distance > 0 && this.canMoveTo(this.hoveredTile.x, this.hoveredTile.y)) {
        this.movementRangeGraphics.fillStyle(0xffff00, 0.3); // Yellow highlight
        this.movementRangeGraphics.fillRect(
          this.hoveredTile.x * this.TILE_SIZE + 2,
          this.hoveredTile.y * this.TILE_SIZE + 2,
          this.TILE_SIZE - 4,
          this.TILE_SIZE - 4
        );
      }
    }

    // Draw line of sight to hovered enemy
    if (this.hoveredTile && this.lineOfSightGraphics) {
      // Check if hoveredTile contains an enemy
      const hoveredEnemy = this.enemyData.find(
        enemy => enemy.health > 0 && enemy.gridX === this.hoveredTile!.x && enemy.gridY === this.hoveredTile!.y
      );

      if (hoveredEnemy) {
        this.drawLineOfSight(this.hoveredTile.x, this.hoveredTile.y);
      }
    }
  }

  private getGridDistance(x1: number, y1: number, x2: number, y2: number): number {
    // Chebyshev distance (diagonal movement counts as 1 square in Savage Worlds)
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  private canMoveTo(gridX: number, gridY: number): boolean {
    if (!this.character) return false;

    const distance = this.getGridDistance(this.playerGridX, this.playerGridY, gridX, gridY);

    // Check if within remaining movement budget
    if (distance > this.movementBudget) return false;

    // Check if tile is occupied by enemy
    const isOccupied = this.enemyData.some(enemy => enemy.gridX === gridX && enemy.gridY === gridY && enemy.health > 0);
    if (isOccupied) return false;

    // Check if tile is blocked by solid cover (walls, buildings)
    const coverTile = this.coverTiles.find((c) => c.gridX === gridX && c.gridY === gridY);
    if (coverTile && coverTile.blocksLOS) {
      return false; // Cannot move through walls
    }

    return true;
  }

  private isAdjacentToPlayer(gridX: number, gridY: number): boolean {
    const distance = this.getGridDistance(this.playerGridX, this.playerGridY, gridX, gridY);
    return distance === 1; // Adjacent = distance of 1 (Manhattan)
  }

  /**
   * Parse weapon range from string (e.g., "12/24/48") and return max effective range
   * Returns {short, medium, long, max}
   */
  private getWeaponRange(weapon?: Equipment): { short: number; medium: number; long: number; max: number } {
    if (!weapon || !weapon.range) {
      // Melee weapon - adjacent only
      return { short: 1, medium: 1, long: 1, max: 1 };
    }

    const rangeParts = weapon.range.split('/').map(r => parseInt(r.trim(), 10));

    if (rangeParts.length >= 3) {
      // Format: "12/24/48" - use as-is
      return {
        short: rangeParts[0],
        medium: rangeParts[1],
        long: rangeParts[2],
        max: rangeParts[2],
      };
    } else if (rangeParts.length === 1 && !isNaN(rangeParts[0])) {
      // Format: "20" - single number, calculate standard Savage Worlds increments
      // Short = base, Medium = 2x base, Long = 4x base
      const baseRange = rangeParts[0];
      return {
        short: baseRange,
        medium: baseRange * 2,
        long: baseRange * 4,
        max: baseRange * 4,
      };
    }

    // Fallback for unusual formats - treat as melee
    return { short: 1, medium: 1, long: 1, max: 1 };
  }

  /**
   * Calculate range penalty based on distance
   * Savage Worlds: -2 at medium range, -4 at long range
   */
  private getRangePenalty(distance: number, weapon?: Equipment): number {
    const range = this.getWeaponRange(weapon);

    if (distance <= range.short) {
      return 0; // No penalty at short range
    } else if (distance <= range.medium) {
      return -2; // Medium range penalty
    } else if (distance <= range.long) {
      return -4; // Long range penalty
    }

    return -99; // Out of range
  }

  /**
   * Check if target is within weapon range
   */
  private isWithinWeaponRange(gridX: number, gridY: number, weapon?: Equipment): boolean {
    const distance = this.getGridDistance(this.playerGridX, this.playerGridY, gridX, gridY);
    const range = this.getWeaponRange(weapon);
    return distance <= range.max;
  }

  /**
   * Show attack info text for hovered enemy
   */
  private showAttackInfo(enemy: GameEnemy, distance: number, rangePenalty: number) {
    if (!this.character) return;

    // Create text if it doesn't exist
    if (!this.attackInfoText) {
      this.attackInfoText = this.add.text(0, 0, '', {
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 6, y: 4 },
      }).setDepth(150);
    }

    // Calculate modifiers
    const isRangedWeapon = this.selectedWeapon && this.selectedWeapon.range;
    const isInMeleeRange = distance <= 1;

    // Determine appropriate skill and target number
    // Savage Worlds rule: Parry only applies to ranged attacks if attacker is within melee range
    let attackSkill: string;
    let attackDie: string;
    let targetNumber: number;

    if (isRangedWeapon) {
      const shootingSkill = this.character.skills?.find(s =>
        s.name.toLowerCase().includes('shooting') || s.name.toLowerCase().includes('throwing')
      );
      attackDie = shootingSkill?.dieValue || '1d6';
      attackSkill = shootingSkill?.name || 'Shooting';

      // Ranged: Use Parry only if in melee range, otherwise use base target 4
      targetNumber = isInMeleeRange ? enemy.parry : 4;
    } else {
      // Melee: Always use Fighting skill vs Parry
      const fightingSkill = this.character.skills?.find(s => s.name.toLowerCase().includes('fighting'));
      attackDie = fightingSkill?.dieValue || '1d6';
      attackSkill = 'Fighting';
      targetNumber = enemy.parry;
    }

    const woundPenalty = this.combatManager ? this.combatManager.getPlayerWounds() * -1 : 0;
    const coverPenalty = this.checkLineOfSight(this.playerGridX, this.playerGridY, enemy.gridX, enemy.gridY);
    const totalModifier = woundPenalty + rangePenalty + coverPenalty;

    // Build info string
    let info = `Target: ${enemy.name}\n`;
    info += `Distance: ${distance} squares\n`;
    info += `${attackSkill}: ${attackDie}`;
    if (totalModifier !== 0) {
      info += ` ${totalModifier >= 0 ? '+' : ''}${totalModifier}`;
    }

    // Show appropriate target number
    if (isRangedWeapon && !isInMeleeRange) {
      info += ` vs TN ${targetNumber}\n`;
    } else {
      info += ` vs Parry ${targetNumber}\n`;
    }

    if (rangePenalty < 0) {
      info += `Range Penalty: ${rangePenalty}\n`;
    }
    if (coverPenalty < 0) {
      const coverType = coverPenalty === -4 ? 'Cover' : 'Light Cover';
      info += `${coverType}: ${coverPenalty}\n`;
    }
    if (woundPenalty < 0) {
      info += `Wound Penalty: ${woundPenalty}\n`;
    }

    this.attackInfoText.setText(info);
    this.attackInfoText.setPosition(
      enemy.gridX * this.TILE_SIZE + this.TILE_SIZE + 4,
      enemy.gridY * this.TILE_SIZE
    );
    this.attackInfoText.setVisible(true);
  }

  private movePlayerTo(gridX: number, gridY: number) {
    if (!this.player) return;

    // Store old position for multiplayer event
    const oldGridX = this.playerGridX;
    const oldGridY = this.playerGridY;

    // Calculate distance moved
    const distanceMoved = this.getGridDistance(this.playerGridX, this.playerGridY, gridX, gridY);

    // Deduct from movement budget
    this.movementBudget = Math.max(0, this.movementBudget - distanceMoved);

    // PHASE 1: Clear aim when player moves (Savage Worlds rule)
    if (this.combatManager && this.combatManager.getPlayerAiming()) {
      this.combatManager.setPlayerAiming(false);
      const logEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        message: 'Aim cancelled by movement',
        type: 'info' as const,
      };
      const currentLog = this.combatManager.getCombatLog();
      currentLog.push(logEntry);
      this.game.events.emit('combatLogUpdate', [...currentLog]);
    }

    // Emit movement budget update to React
    this.game.events.emit('movementBudgetUpdate', {
      current: this.movementBudget,
      max: this.maxMovementBudget,
    });

    // Update grid position
    this.playerGridX = gridX;
    this.playerGridY = gridY;

    // MULTIPLAYER: Emit local token movement for WebSocket sync
    if (this.character) {
      this.game.events.emit('localTokenMoved', {
        tokenId: String(this.character.id),
        tokenType: 'PLAYER' as const,
        fromX: oldGridX,
        fromY: oldGridY,
        toX: gridX,
        toY: gridY,
      });
    }

    // Update pixel position
    const pixelX = gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
    const pixelY = gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

    // Smooth tween to new position
    this.tweens.add({
      targets: this.player,
      x: pixelX,
      y: pixelY,
      duration: 200,
      ease: 'Power2',
    });

    // Update name label
    const nameText = this.player.getData('nameText') as Phaser.GameObjects.Text;
    if (nameText) {
      this.tweens.add({
        targets: nameText,
        x: pixelX,
        y: pixelY - this.TILE_SIZE / 2 - 10,
        duration: 200,
        ease: 'Power2',
      });
    }

    // Update movement range after move
    this.time.delayedCall(250, () => {
      this.updateMovementRange();
    });
  }

  update(time: number, delta: number) {
    if (!this.player || !this.cursors || !this.combatManager) return;
    if (this.combatManager.getCurrentPhase() !== 'player') return;

    // Skip keyboard processing when user is typing in an input field
    if (this.isTypingInInput()) return;

    // Camera panning (when follow is disabled)
    if (!this.cameraFollowEnabled) {
      const camera = this.cameras.main;

      if (this.cursors.left.isDown) {
        camera.scrollX -= this.cameraPanSpeed;
      } else if (this.cursors.right.isDown) {
        camera.scrollX += this.cameraPanSpeed;
      }

      if (this.cursors.up.isDown) {
        camera.scrollY -= this.cameraPanSpeed;
      } else if (this.cursors.down.isDown) {
        camera.scrollY += this.cameraPanSpeed;
      }
    } else {
      // Keyboard movement (grid-based) - only when camera follow is enabled
      if (time - this.lastMoveTime > this.moveDelay) {
        let newX = this.playerGridX;
        let newY = this.playerGridY;

        if (this.cursors.left.isDown) {
          newX--;
        } else if (this.cursors.right.isDown) {
          newX++;
        }

        if (this.cursors.up.isDown) {
          newY--;
        } else if (this.cursors.down.isDown) {
          newY++;
        }

        // Check if movement is valid
        if ((newX !== this.playerGridX || newY !== this.playerGridY)) {
          if (newX >= 0 && newX < this.GRID_WIDTH && newY >= 0 && newY < this.GRID_HEIGHT) {
            if (this.canMoveTo(newX, newY)) {
              this.movePlayerTo(newX, newY);
              this.lastMoveTime = time;
            }
          }
        }
      }
    }

    // End turn on spacebar
    if (this.spaceKey?.isDown && time - this.lastActionTime > 500) {
      this.endPlayerTurn();
      this.lastActionTime = time;
    }

    // Attack enemy within range with A key
    if (this.attackKey?.isDown && time - this.lastActionTime > 500) {
      const targetEnemy = this.enemyData.find(enemy =>
        enemy.health > 0 && this.isWithinWeaponRange(enemy.gridX, enemy.gridY, this.selectedWeapon)
      );
      if (targetEnemy) {
        const enemyIndex = this.enemyData.indexOf(targetEnemy);
        this.attackEnemy(targetEnemy, enemyIndex);
        this.lastActionTime = time;
      }
    }
  }

  private attackEnemy(enemy: GameEnemy, enemyIndex: number) {
    if (!this.combatManager) return;

    // Calculate range penalty
    const distance = this.getGridDistance(this.playerGridX, this.playerGridY, enemy.gridX, enemy.gridY);
    const rangePenalty = this.getRangePenalty(distance, this.selectedWeapon);

    // Check line of sight and cover
    const coverPenalty = this.checkLineOfSight(this.playerGridX, this.playerGridY, enemy.gridX, enemy.gridY);

    // Check if LOS is completely blocked
    const losBlocked = coverPenalty <= -999;

    // Check if weapon has indirect fire (can shoot over obstacles)
    const hasIndirectFire = this.selectedWeapon?.indirectFire || false;

    // Prevent attack if LOS is blocked and weapon doesn't have indirect fire
    if (losBlocked && !hasIndirectFire) {
      this.combatManager.addLog('Cannot target: Line of sight is blocked!', 'miss');
      return;
    }

    // Combine all penalties (if indirect fire, ignore cover penalties)
    const totalPenalty = hasIndirectFire ? rangePenalty : rangePenalty + coverPenalty;

    // Use combat manager to perform attack with selected weapon (or fists as fallback)
    const weapon = this.selectedWeapon
      ? { name: this.selectedWeapon.name, damage: this.selectedWeapon.damage, rangePenalty: totalPenalty, range: this.selectedWeapon.range }
      : { name: 'Fists', damage: 'Str+d4', rangePenalty: totalPenalty };

    // TODO: Pass allied NPC positions when implemented (for gang-up bonuses)
    const alliesPositions: Array<{ x: number; y: number }> = [];

    const result = this.combatManager.playerAttackEnemy(enemy, weapon, distance, alliesPositions);

    // Emit health update
    this.game.events.emit('healthUpdate', {
      playerHealth: this.combatManager.getPlayerHealth(),
      playerMaxHealth: this.combatManager.getPlayerMaxHealth(),
    });

    // Update enemy sprite if defeated
    if (enemy.health <= 0) {
      const sprite = this.enemySprites[enemyIndex];
      if (sprite) {
        sprite.setAlpha(0.3); // Make defeated enemies semi-transparent
        const nameText = sprite.getData('nameText') as Phaser.GameObjects.Text;
        if (nameText) {
          nameText.setAlpha(0.3);
        }
      }

      // Check victory
      this.combatManager.checkVictory(this.enemyData);
    }

    this.updateMovementRange();
  }

  private handlePlayerAction(action: { type: string; name: string }) {
    if (!this.combatManager || this.combatManager.getCurrentPhase() !== 'player') return;

    switch (action.type) {
      case 'attack': {
        // Find the nearest enemy within weapon range and attack
        const targetEnemy = this.enemyData.find(enemy =>
          enemy.health > 0 && this.isWithinWeaponRange(enemy.gridX, enemy.gridY, this.selectedWeapon)
        );
        if (targetEnemy) {
          const enemyIndex = this.enemyData.indexOf(targetEnemy);
          this.attackEnemy(targetEnemy, enemyIndex);
        } else {
          // Add combat log message if no enemy in range
          this.combatManager.getCombatLog();
          console.log('No enemy within weapon range to attack');
        }
        break;
      }
      case 'defend':
        console.log('Full Defense action - not yet implemented');
        break;
      case 'aim': {
        // PHASE 1: Aim action - gives +2 to next ranged attack
        if (this.combatManager) {
          this.combatManager.setPlayerAiming(true);
          this.game.events.emit('combatLogUpdate', [...this.combatManager.getCombatLog()]);
        }
        console.log('Aim action: +2 to next ranged attack');
        break;
      }
      case 'run': {
        // Sprint action: Pace + d6 movement
        // Roll a d6 for extra movement
        const sprintRoll = Math.floor(Math.random() * 6) + 1;
        const pace = this.character?.pace || 6;
        const totalMovement = pace + sprintRoll;

        // Update movement budget
        this.movementBudget = totalMovement;
        this.maxMovementBudget = totalMovement;

        // PHASE 1: Mark player as having run this turn (for enemy attacks)
        if (this.combatManager) {
          this.combatManager.setPlayerHasRun(true);
        }

        // Log the sprint
        const logEntry = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          message: `Sprint! Rolling d6 for extra movement: ${sprintRoll}. Total movement: ${totalMovement} squares`,
          type: 'info' as const,
        };

        if (this.combatManager) {
          const currentLog = this.combatManager.getCombatLog();
          currentLog.push(logEntry);
          this.game.events.emit('combatLogUpdate', [...currentLog]);
        }

        // Emit movement budget update
        this.game.events.emit('movementBudgetUpdate', {
          current: this.movementBudget,
          max: this.maxMovementBudget,
        });

        // Update movement range display
        this.updateMovementRange();

        console.log(`Sprint action: Pace (${pace}) + d6 (${sprintRoll}) = ${totalMovement} squares`);
        break;
      }
      case 'other':
        console.log('Test of Wills - not yet implemented');
        break;
      default:
        console.log('Unknown action:', action.type);
    }
  }

  private endPlayerTurn() {
    if (!this.combatManager) return;

    if (this.movementRangeGraphics) {
      this.movementRangeGraphics.clear();
    }
    if (this.attackRangeGraphics) {
      this.attackRangeGraphics.clear();
    }

    this.combatManager.endPlayerTurn();
  }

  private executeEnemyTurn() {
    if (!this.combatManager) return;

    // Simple AI: Each alive enemy moves toward player and attacks if adjacent
    this.enemyData.forEach((enemy, index) => {
      if (enemy.health <= 0) return;

      // Check if already adjacent to player
      if (this.isAdjacentToPlayer(enemy.gridX, enemy.gridY)) {
        // Calculate gang-up: other enemies adjacent to player
        const playerPos = { x: this.playerGridX, y: this.playerGridY };
        const otherEnemies = this.enemyData
          .filter(e => e.id !== enemy.id && e.health > 0 && this.isAdjacentToPlayer(e.gridX, e.gridY))
          .map(e => ({ x: e.gridX, y: e.gridY }));

        // Attack player
        this.combatManager!.enemyAttackPlayer(enemy, playerPos, otherEnemies);

        // Emit wounds and shaken status updates
        this.game.events.emit('woundsUpdate', {
          wounds: this.combatManager!.getPlayerWounds(),
          maxWounds: 3,
        });
        this.game.events.emit('shakenUpdate', {
          isShaken: this.combatManager!.getPlayerShaken(),
        });

        // Emit health update
        this.game.events.emit('healthUpdate', {
          playerHealth: this.combatManager!.getPlayerHealth(),
          playerMaxHealth: this.combatManager!.getPlayerMaxHealth(),
        });
      } else {
        // Move toward player (simple pathfinding - move closer on X or Y)
        const dx = this.playerGridX - enemy.gridX;
        const dy = this.playerGridY - enemy.gridY;

        let newX = enemy.gridX;
        let newY = enemy.gridY;

        if (Math.abs(dx) > Math.abs(dy)) {
          // Move horizontally
          newX += dx > 0 ? 1 : -1;
        } else {
          // Move vertically
          newY += dy > 0 ? 1 : -1;
        }

        // Check if new position is valid (not occupied by another enemy or player)
        const isOccupied = this.enemyData.some(e => e.gridX === newX && e.gridY === newY);
        const isPlayerPos = newX === this.playerGridX && newY === this.playerGridY;

        if (!isOccupied && !isPlayerPos) {
          // Move enemy
          enemy.gridX = newX;
          enemy.gridY = newY;

          // Update sprite position
          const sprite = this.enemySprites[index];
          if (sprite) {
            const pixelX = newX * this.TILE_SIZE + this.TILE_SIZE / 2;
            const pixelY = newY * this.TILE_SIZE + this.TILE_SIZE / 2;
            this.tweens.add({
              targets: sprite,
              x: pixelX,
              y: pixelY,
              duration: 300,
              ease: 'Power2',
            });

            const nameText = sprite.getData('nameText') as Phaser.GameObjects.Text;
            if (nameText) {
              this.tweens.add({
                targets: nameText,
                x: pixelX,
                y: pixelY - this.TILE_SIZE / 2 - 10,
                duration: 300,
                ease: 'Power2',
              });
            }
          }

          // Attack if now adjacent
          if (this.isAdjacentToPlayer(newX, newY)) {
            this.time.delayedCall(400, () => {
              // Calculate gang-up: other enemies adjacent to player
              const playerPos = { x: this.playerGridX, y: this.playerGridY };
              const otherEnemies = this.enemyData
                .filter(e => e.id !== enemy.id && e.health > 0 && this.isAdjacentToPlayer(e.gridX, e.gridY))
                .map(e => ({ x: e.gridX, y: e.gridY }));

              this.combatManager!.enemyAttackPlayer(enemy, playerPos, otherEnemies);

              // Emit wounds and shaken status updates
              this.game.events.emit('woundsUpdate', {
                wounds: this.combatManager!.getPlayerWounds(),
                maxWounds: 3,
              });
              this.game.events.emit('shakenUpdate', {
                isShaken: this.combatManager!.getPlayerShaken(),
              });

              // Emit health update
              this.game.events.emit('healthUpdate', {
                playerHealth: this.combatManager!.getPlayerHealth(),
                playerMaxHealth: this.combatManager!.getPlayerMaxHealth(),
              });
            });
          }
        }
      }
    });

    // End enemy turn after a delay
    this.time.delayedCall(2000, () => {
      if (this.combatManager && this.combatManager.getCurrentPhase() !== 'defeat') {
        // PHASE 1: Pass enemies array to clear running flags
        this.combatManager.endEnemyTurn(this.enemyData);
        this.updateMovementRange();
      }
    });
  }

  /**
   * MULTIPLAYER: Handle remote player token movement
   * Creates or updates sprites for other players in the game
   */
  private handleRemoteTokenMoved(event: { tokenId: string; tokenType: string; gridX: number; gridY: number; movedBy: string }) {
    // Only handle player tokens (not enemies)
    if (event.tokenType !== 'PLAYER') return;

    // Don't render our own character (it's already rendered as this.player)
    if (this.character && String(this.character.id) === event.tokenId) {
      return;
    }

    const pixelX = event.gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
    const pixelY = event.gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

    // Check if we already have a sprite for this remote player
    let remoteSprite = this.remotePlayerSprites.get(event.tokenId);

    if (!remoteSprite) {
      // Create new sprite for this remote player
      remoteSprite = this.add.rectangle(
        pixelX,
        pixelY,
        this.TILE_SIZE - 4,
        this.TILE_SIZE - 4,
        0x00bfff // Light blue for remote players (distinct from local player)
      );
      remoteSprite.setStrokeStyle(2, 0xffffff);
      remoteSprite.setDepth(10);
      remoteSprite.setAlpha(0.7); // Slightly transparent

      // Add player name label
      const nameText = this.add.text(
        pixelX,
        pixelY - this.TILE_SIZE / 2 - 10,
        event.movedBy,
        {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#0066cc',
          padding: { x: 3, y: 1 },
        }
      );
      nameText.setOrigin(0.5);
      nameText.setDepth(11);
      nameText.setAlpha(0.7);
      remoteSprite.setData('nameText', nameText);

      // Store the sprite
      this.remotePlayerSprites.set(event.tokenId, remoteSprite);

      console.log(`[ArenaScene] Created remote player sprite for ${event.movedBy} (token ${event.tokenId})`);
    } else {
      // Update existing sprite position with smooth tween
      this.tweens.add({
        targets: remoteSprite,
        x: pixelX,
        y: pixelY,
        duration: 200,
        ease: 'Power2',
      });

      // Update name label position
      const nameText = remoteSprite.getData('nameText') as Phaser.GameObjects.Text;
      if (nameText) {
        this.tweens.add({
          targets: nameText,
          x: pixelX,
          y: pixelY - this.TILE_SIZE / 2 - 10,
          duration: 200,
          ease: 'Power2',
        });
      }
    }
  }

  /**
   * Create cover objects on the battlefield
   */
  private createCoverObjects() {
    // Building 1 (northeast) - with door and window
    this.addCoverArea(105, 95, 8, 6, Cover.TOTAL, true, 'building1'); // Solid walls
    this.addCoverTile(107, 100, Cover.MEDIUM, false, 'building1', false, true); // Door
    this.addCoverTile(110, 97, Cover.HEAVY, false, 'building1', true, false); // Window

    // Building 2 (south) - with door
    this.addCoverArea(108, 105, 6, 5, Cover.TOTAL, true, 'building2'); // Solid walls
    this.addCoverTile(110, 109, Cover.MEDIUM, false, 'building2', false, true); // Door

    // Building 3 (west) - solid structure
    this.addCoverArea(92, 98, 5, 4, Cover.TOTAL, true, 'building3'); // Solid walls

    // Heavy cover - Thick walls, armored vehicles (-6)
    this.addCoverArea(110, 100, 3, 1, Cover.HEAVY, false); // Thick wall
    this.addCoverArea(95, 95, 1, 5, Cover.HEAVY, false); // Thick wall

    // Medium cover - Barrels, thick trees (-4)
    this.addCoverArea(103, 108, 4, 1, Cover.MEDIUM, false); // Barrels
    this.addCoverArea(118, 102, 2, 2, Cover.MEDIUM, false); // Tree cluster

    // Light cover - Furniture, low walls (-2)
    this.addCoverArea(87, 95, 2, 1, Cover.LIGHT, false); // Low wall
    this.addCoverArea(112, 108, 1, 3, Cover.LIGHT, false); // Fence

    // Draw all cover visuals
    this.drawCoverVisuals();
  }

  /**
   * Add a rectangular area of cover tiles to the battlefield
   */
  private addCoverArea(
    startX: number,
    startY: number,
    width: number,
    height: number,
    coverLevel: Cover,
    blocksLOS: boolean,
    buildingId?: string
  ) {
    for (let x = startX; x < startX + width; x++) {
      for (let y = startY; y < startY + height; y++) {
        this.coverTiles.push({
          gridX: x,
          gridY: y,
          coverLevel,
          blocksLOS,
          buildingId,
        });
      }
    }
  }

  /**
   * Add a single cover tile (for doors, windows, etc.)
   */
  private addCoverTile(
    gridX: number,
    gridY: number,
    coverLevel: Cover,
    blocksLOS: boolean,
    buildingId?: string,
    isWindow?: boolean,
    isDoor?: boolean
  ) {
    // Remove any existing tile at this position
    this.coverTiles = this.coverTiles.filter((t) => !(t.gridX === gridX && t.gridY === gridY));

    // Add the new tile
    this.coverTiles.push({
      gridX,
      gridY,
      coverLevel,
      blocksLOS,
      buildingId,
      isWindow,
      isDoor,
    });
  }

  /**
   * Draw visual representations of all cover tiles
   * Only draws borders on the outside edges (perimeter) of each cover group
   */
  private drawCoverVisuals() {
    if (!this.coverGraphics) return;

    this.coverGraphics.clear();

    // Get cover color and alpha based on type
    const getCoverColor = (coverLevel: Cover): { color: number; alpha: number } => {
      switch (coverLevel) {
        case Cover.TOTAL:
          return { color: 0x4a3728, alpha: 0.9 }; // Dark brown (buildings)
        case Cover.HEAVY:
          return { color: 0x696969, alpha: 0.75 }; // Dark gray (thick walls)
        case Cover.MEDIUM:
          return { color: 0x8b6f47, alpha: 0.6 }; // Brown (barrels/trees)
        case Cover.LIGHT:
          return { color: 0xa0826d, alpha: 0.4 }; // Light brown (furniture)
        default:
          return { color: 0xffffff, alpha: 0.0 };
      }
    };

    // Helper to check if a tile exists at position
    const hasCoverAt = (x: number, y: number): boolean => {
      return this.coverTiles.some((t) => t.gridX === x && t.gridY === y);
    };

    // Draw each cover tile
    this.coverTiles.forEach((tile) => {
      const { color, alpha } = getCoverColor(tile.coverLevel);
      const pixelX = tile.gridX * this.TILE_SIZE;
      const pixelY = tile.gridY * this.TILE_SIZE;

      // Draw filled rectangle
      this.coverGraphics!.fillStyle(color, alpha);
      this.coverGraphics!.fillRect(pixelX, pixelY, this.TILE_SIZE, this.TILE_SIZE);

      // Determine border color and width
      const borderColor = tile.blocksLOS ? 0xff0000 : 0x000000;
      const borderWidth = tile.blocksLOS ? 3 : 2;
      const borderAlpha = tile.blocksLOS ? 0.9 : 0.5;

      // Check each direction for edges (draw border only on perimeter)
      const hasNorth = hasCoverAt(tile.gridX, tile.gridY - 1);
      const hasSouth = hasCoverAt(tile.gridX, tile.gridY + 1);
      const hasEast = hasCoverAt(tile.gridX + 1, tile.gridY);
      const hasWest = hasCoverAt(tile.gridX - 1, tile.gridY);

      this.coverGraphics!.lineStyle(borderWidth, borderColor, borderAlpha);

      // Draw top edge if no neighbor above
      if (!hasNorth) {
        this.coverGraphics!.beginPath();
        this.coverGraphics!.moveTo(pixelX, pixelY);
        this.coverGraphics!.lineTo(pixelX + this.TILE_SIZE, pixelY);
        this.coverGraphics!.strokePath();
      }

      // Draw bottom edge if no neighbor below
      if (!hasSouth) {
        this.coverGraphics!.beginPath();
        this.coverGraphics!.moveTo(pixelX, pixelY + this.TILE_SIZE);
        this.coverGraphics!.lineTo(pixelX + this.TILE_SIZE, pixelY + this.TILE_SIZE);
        this.coverGraphics!.strokePath();
      }

      // Draw left edge if no neighbor to the left
      if (!hasWest) {
        this.coverGraphics!.beginPath();
        this.coverGraphics!.moveTo(pixelX, pixelY);
        this.coverGraphics!.lineTo(pixelX, pixelY + this.TILE_SIZE);
        this.coverGraphics!.strokePath();
      }

      // Draw right edge if no neighbor to the right
      if (!hasEast) {
        this.coverGraphics!.beginPath();
        this.coverGraphics!.moveTo(pixelX + this.TILE_SIZE, pixelY);
        this.coverGraphics!.lineTo(pixelX + this.TILE_SIZE, pixelY + this.TILE_SIZE);
        this.coverGraphics!.strokePath();
      }
    });
  }

  /**
   * Update cover tooltip when hovering over tiles with 2-second delay
   */
  private updateCoverTooltip(gridX: number, gridY: number, screenX: number, screenY: number) {
    if (!this.coverTooltip) return;

    // Check if this tile has cover
    const coverTile = this.coverTiles.find((c) => c.gridX === gridX && c.gridY === gridY);

    // If not hovering over cover, or if hovering over a different cover tile
    if (!coverTile || this.hoveredCoverTile?.gridX !== gridX || this.hoveredCoverTile?.gridY !== gridY) {
      // Cancel existing timer
      if (this.coverTooltipTimer) {
        this.coverTooltipTimer.remove();
        this.coverTooltipTimer = undefined;
      }

      // Hide tooltip immediately
      this.coverTooltip.setVisible(false);

      // If no cover tile, clear hover state and return
      if (!coverTile) {
        this.hoveredCoverTile = undefined;
        return;
      }

      // Start hovering over new cover tile
      this.hoveredCoverTile = { gridX, gridY };

      // Start 2-second timer to show tooltip
      this.coverTooltipTimer = this.time.delayedCall(2000, () => {
        if (!this.coverTooltip) return;

        // Build tooltip text
        const coverName = this.getCoverName(coverTile.coverLevel);
        const coverPenalty = this.getCoverPenalty(coverTile.coverLevel);
        const blocksText = coverTile.blocksLOS ? 'Blocks Line of Sight' : 'Provides Cover';

        let tooltipText = `${coverName}\n`;
        if (coverTile.blocksLOS) {
          tooltipText += `${blocksText}\nCannot be targeted`;
        } else {
          tooltipText += `${blocksText}\nPenalty: ${coverPenalty}`;
        }

        this.coverTooltip.setText(tooltipText);
        this.coverTooltip.setPosition(screenX + 15, screenY + 15);
        this.coverTooltip.setVisible(true);
      });
    } else if (this.coverTooltip.visible) {
      // Update position if tooltip is already visible and we're still hovering over same tile
      this.coverTooltip.setPosition(screenX + 15, screenY + 15);
    }
  }

  /**
   * Get cover type name for display
   */
  private getCoverName(coverLevel: Cover): string {
    switch (coverLevel) {
      case Cover.TOTAL:
        return 'Solid Wall';
      case Cover.HEAVY:
        return 'Heavy Cover';
      case Cover.MEDIUM:
        return 'Medium Cover';
      case Cover.LIGHT:
        return 'Light Cover';
      default:
        return 'No Cover';
    }
  }

  /**
   * Check line of sight from attacker to target
   * Returns the best cover penalty (-2 or -4) that applies, or 0 if no cover
   */
  /**
   * Draw a line of sight from the player to a target
   * Color-coded based on total penalties and LOS blocking:
   * - Green: Good shot (0 to -2 total penalty)
   * - Yellow: Medium penalties (-3 to -5)
   * - Orange: Heavy penalties (-6 to -8)
   * - Red: No line of sight (blocked by wall)
   * Also displays all applicable modifiers on the line
   */
  private drawLineOfSight(targetGridX: number, targetGridY: number) {
    if (!this.lineOfSightGraphics) return;

    // Get cover penalty
    const coverPenalty = this.checkLineOfSight(
      this.playerGridX,
      this.playerGridY,
      targetGridX,
      targetGridY
    );

    // Check if LOS is completely blocked
    const losBlocked = coverPenalty <= -999;

    // Calculate all modifiers
    const distance = this.getGridDistance(this.playerGridX, this.playerGridY, targetGridX, targetGridY);
    const rangePenalty = this.selectedWeapon ? this.getRangePenalty(this.selectedWeapon, distance) : 0;
    const illuminationPenalty = this.combatManager?.getIlluminationPenalty() || 0;

    // Check if target is running
    const targetEnemy = this.enemyData.find((e) => e.gridX === targetGridX && e.gridY === targetGridY);
    const runningPenalty = targetEnemy && targetEnemy.hasRun ? -2 : 0;

    // Total penalty (excluding cover if LOS is blocked)
    const totalPenalty = losBlocked
      ? -999
      : coverPenalty + rangePenalty + illuminationPenalty + runningPenalty;

    // Determine line color based on total penalty
    let lineColor: number;
    let lineAlpha = 0.8;
    if (losBlocked) {
      lineColor = 0xff0000; // Red for blocked LOS
    } else if (totalPenalty >= -2) {
      lineColor = 0x44ff44; // Green for good shot
    } else if (totalPenalty >= -5) {
      lineColor = 0xffff00; // Yellow for medium penalties
    } else {
      lineColor = 0xffaa44; // Orange for heavy penalties
    }

    // Calculate pixel positions (center of tiles)
    const fromPixelX = this.playerGridX * this.TILE_SIZE + this.TILE_SIZE / 2;
    const fromPixelY = this.playerGridY * this.TILE_SIZE + this.TILE_SIZE / 2;
    const toPixelX = targetGridX * this.TILE_SIZE + this.TILE_SIZE / 2;
    const toPixelY = targetGridY * this.TILE_SIZE + this.TILE_SIZE / 2;

    // Draw the line
    this.lineOfSightGraphics.lineStyle(3, lineColor, lineAlpha);
    this.lineOfSightGraphics.beginPath();
    this.lineOfSightGraphics.moveTo(fromPixelX, fromPixelY);
    this.lineOfSightGraphics.lineTo(toPixelX, toPixelY);
    this.lineOfSightGraphics.strokePath();

    // Draw endpoint circles for clarity
    this.lineOfSightGraphics.fillStyle(lineColor, lineAlpha);
    this.lineOfSightGraphics.fillCircle(fromPixelX, fromPixelY, 4);
    this.lineOfSightGraphics.fillCircle(toPixelX, toPixelY, 4);

    // Build modifier text
    const modifiers: string[] = [];
    if (losBlocked) {
      modifiers.push('NO LOS');
    } else {
      if (rangePenalty !== 0) modifiers.push(`Range: ${rangePenalty}`);
      if (coverPenalty !== 0) modifiers.push(`Cover: ${coverPenalty}`);
      if (illuminationPenalty !== 0) modifiers.push(`Light: ${illuminationPenalty}`);
      if (runningPenalty !== 0) modifiers.push(`Running: ${runningPenalty}`);
      if (modifiers.length === 0) modifiers.push('No penalties');
    }

    // Draw modifier text at midpoint of line
    const midX = (fromPixelX + toPixelX) / 2;
    const midY = (fromPixelY + toPixelY) / 2;

    const text = losBlocked
      ? 'NO LINE OF SIGHT'
      : `Total: ${totalPenalty}\n${modifiers.join(' | ')}`;

    const modifierText = this.add.text(midX, midY - 20, text, {
      fontSize: losBlocked ? '12px' : '11px',
      color: '#ffffff',
      backgroundColor: losBlocked ? '#cc0000' : '#000000',
      padding: { x: 4, y: 2 },
      align: 'center',
    });
    modifierText.setOrigin(0.5);
    modifierText.setDepth(11);

    // Auto-destroy text after a frame (will be redrawn next frame if still hovering)
    this.time.delayedCall(100, () => {
      modifierText.destroy();
    });
  }

  private checkLineOfSight(fromGridX: number, fromGridY: number, toGridX: number, toGridY: number): number {
    // Check if shooter is inside a building
    const shooterTile = this.coverTiles.find((c) => c.gridX === fromGridX && c.gridY === fromGridY);
    const shooterBuildingId = shooterTile?.buildingId;

    // Check if target is inside a building
    const targetTile = this.coverTiles.find((c) => c.gridX === toGridX && c.gridY === toGridY);
    const targetBuildingId = targetTile?.buildingId;

    // If both are in the same building, allow interior LOS
    const sameBuilding = shooterBuildingId && targetBuildingId && shooterBuildingId === targetBuildingId;

    // Use Bresenham's line algorithm to raycast through grid
    const tilesInLine = this.getGridLine(fromGridX, fromGridY, toGridX, toGridY);

    let bestCoverPenalty = 0;

    // Check each tile in the line for cover
    for (const { x, y } of tilesInLine) {
      // Skip the start and end tiles
      if ((x === fromGridX && y === fromGridY) || (x === toGridX && y === toGridY)) {
        continue;
      }

      // Find cover at this tile
      const coverTile = this.coverTiles.find((c) => c.gridX === x && c.gridY === y);

      if (coverTile) {
        // If in same building, walls don't block LOS (interior building sight)
        if (sameBuilding && coverTile.buildingId === shooterBuildingId) {
          // Interior walls/cover within same building don't block LOS
          // But still apply cover penalties for non-wall cover (furniture, etc.)
          if (!coverTile.blocksLOS) {
            const penalty = this.getCoverPenalty(coverTile.coverLevel);
            if (penalty < bestCoverPenalty) {
              bestCoverPenalty = penalty;
            }
          }
          continue; // Don't block LOS for same building walls
        }

        // Check for windows or doors (allow LOS through them with penalties)
        if (coverTile.isWindow || coverTile.isDoor) {
          const penalty = this.getCoverPenalty(coverTile.coverLevel);
          if (penalty < bestCoverPenalty) {
            bestCoverPenalty = penalty;
          }
          continue; // Windows and doors don't completely block LOS
        }

        // If cover blocks LOS completely, return total cover modifier
        if (coverTile.blocksLOS) {
          return -999; // Total cover - cannot target
        }

        // Otherwise, track the best (worst) cover penalty
        const penalty = this.getCoverPenalty(coverTile.coverLevel);
        if (penalty < bestCoverPenalty) {
          bestCoverPenalty = penalty;
        }
      }
    }

    return bestCoverPenalty;
  }

  /**
   * Get cover penalty for a cover level
   */
  private getCoverPenalty(coverLevel: Cover): number {
    switch (coverLevel) {
      case Cover.LIGHT:
        return -2;
      case Cover.MEDIUM:
        return -4;
      case Cover.HEAVY:
        return -6;
      case Cover.TOTAL:
        return -999;
      default:
        return 0;
    }
  }

  /**
   * Get all grid tiles along a line using Bresenham's algorithm
   */
  private getGridLine(x0: number, y0: number, x1: number, y1: number): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;

    while (true) {
      tiles.push({ x, y });

      if (x === x1 && y === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return tiles;
  }

  /**
   * Check if a line intersects with a rectangle (cover object)
   * Using line-rectangle intersection algorithm
   */
  private lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    // Check if either endpoint is inside the rectangle
    if (this.pointInRect(x1, y1, rect) || this.pointInRect(x2, y2, rect)) {
      return true;
    }

    // Check if line intersects any of the four sides of the rectangle
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    // Check intersection with each side
    if (
      this.lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||     // Top
      this.lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) || // Right
      this.lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) || // Bottom
      this.lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom)      // Left
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if a point is inside a rectangle
   */
  private pointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  /**
   * Check if two line segments intersect
   */
  private lineIntersectsLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false; // Parallel lines

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}
