import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, Box, Button, CircularProgress, Alert, Grid, Card, CardContent, CardMedia, CardActionArea, Radio, RadioGroup, FormControlLabel, IconButton, Tooltip, Drawer, Snackbar } from '@mui/material';
import { WbSunny as SunIcon, WbTwilight as TwilightIcon, Brightness3 as MoonIcon, Brightness1 as DarkIcon, Psychology as AIIcon } from '@mui/icons-material';
import { GameCanvas } from './components/GameCanvas';
import { WeaponSelection } from './components/WeaponSelection';
import { ActionMenu } from './components/ActionMenu';
import { StatusEffects } from './components/StatusEffects';
import { CalledShotDialog } from './components/CalledShotDialog';
import { SettingsMenu } from './components/SettingsMenu';
import { ActionBar } from './components/ActionBar';
import InitiativeTracker from './components/InitiativeTracker';
import { CombatLog } from './components/CombatLog';
import { DiceRollPopup } from './components/DiceRollPopup';
// CombatHUD removed - turn indication is in InitiativeTracker (green pulsing dot), combat log is in right panel
import AIAssistantPanel from '../components/ai/AIAssistantPanel';
import GMControlPanel from './components/GMControlPanel';
import { PowersPanel } from './components/PowersPanel';
import { GameCharacter, CombatLogEntry, DiceRollEvent, Equipment, CombatAction, CalledShotTarget, Illumination } from './types/GameTypes';
import { GeneratedMap } from '../types/map';
import { TurnPhase } from './engine/CombatManager';
import { characterService } from './services/characterService';
import { combatService, CombatState as CombatStateAPI, InitiativeEntry } from '../services/combatService';
import { wrapGameEvents, TypedGameEvents } from './events/GameEvents';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useGameWebSocket } from '../hooks/useGameWebSocket';
import { getWebSocketService } from '../services/websocketService';

interface CombatState {
  playerHealth: number;
  playerMaxHealth: number;
  turnNumber: number;
  phase: TurnPhase;
  combatLog: CombatLogEntry[];
}

export function GameArena() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { selectedCharacter, setSelectedCharacter } = useGameStore();
  const isGameMaster = user?.role === 'GAME_MASTER';

  // ARENA PROTECTION: Redirect to character selection if no character selected
  useEffect(() => {
    if (!selectedCharacter && !isGameMaster) {
      console.warn('[GameArena] No character selected, redirecting to character selection');
      navigate('/character-select', { replace: true });
    }
  }, [selectedCharacter, isGameMaster, navigate]);

  const [gameStarted, setGameStarted] = useState(false);
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [combatState, setCombatState] = useState<CombatState>({
    playerHealth: 0,
    playerMaxHealth: 0,
    turnNumber: 1,
    phase: 'player',
    combatLog: [],
  });
  const [diceRolls, setDiceRolls] = useState<DiceRollEvent[]>([]);
  const [currentDiceRoll, setCurrentDiceRoll] = useState<DiceRollEvent | null>(null);
  const [playerWounds, setPlayerWounds] = useState(0);
  const [playerShaken, setPlayerShaken] = useState(false);
  const [selectedWeapon, setSelectedWeapon] = useState<Equipment | undefined>();
  const [remainingActions, setRemainingActions] = useState(1);
  const [phaserGameRef, setPhaserGameRef] = useState<any>(null);
  const [gameEvents, setGameEvents] = useState<TypedGameEvents | null>(null);
  const [cameraFollowEnabled, setCameraFollowEnabled] = useState(true);
  const [showWeaponRanges, setShowWeaponRanges] = useState(true);
  const [showMovementRanges, setShowMovementRanges] = useState(true);
  const [movementBudget, setMovementBudget] = useState({ current: 0, max: 0 });
  const [illumination, setIllumination] = useState<Illumination>(Illumination.BRIGHT);

  // Map overlay settings
  const [showMapGrid, setShowMapGrid] = useState(true);
  const [showMapWalls, setShowMapWalls] = useState(true);
  const [showMapCover, setShowMapCover] = useState(true);

  // PHASE 1: Called shot dialog state
  const [calledShotDialogOpen, setCalledShotDialogOpen] = useState(false);

  // AI Assistant drawer state
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  // Powers Panel drawer state (Phase 3)
  const [powersOpen, setPowersOpen] = useState(false);
  const [castingPower, setCastingPower] = useState<{
    powerId: number;
    powerName: string;
    powerCost: number;
    needsTarget: boolean;
  } | null>(null);

  // Initiative/Combat state (Savage Worlds card-based initiative)
  const [initiativeState, setInitiativeState] = useState<CombatStateAPI>({
    roundNumber: 1,
    combatActive: false,
    activeCharacterId: null,
    activeCharacterName: null,
    initiativeOrder: [],
    jokerDealt: false,
    message: null,
  });

  // Snackbar for turn notifications
  const [turnNotification, setTurnNotification] = useState<string | null>(null);

  // Check if it's the current player's turn
  const isMyTurn = useMemo(() => {
    if (!initiativeState.combatActive) return true; // No combat = can act freely
    if (!selectedCharacter?.id) return false;
    return initiativeState.activeCharacterId === selectedCharacter.id;
  }, [initiativeState.combatActive, initiativeState.activeCharacterId, selectedCharacter?.id]);

  const handleCombatStateUpdate = useCallback((state: CombatState) => {
    setCombatState(state);
  }, []);

  const handleDiceRoll = useCallback((roll: DiceRollEvent) => {
    setDiceRolls(prev => [...prev, roll]);
    setCurrentDiceRoll(roll); // Show animated popup
  }, []);

  const handleWoundsUpdate = useCallback((wounds: number, maxWounds: number) => {
    setPlayerWounds(wounds);
  }, []);

  const handleShakenUpdate = useCallback((isShaken: boolean) => {
    setPlayerShaken(isShaken);
  }, []);

  const handleMovementBudgetUpdate = useCallback((current: number, max: number) => {
    setMovementBudget({ current, max });
  }, []);

  const handlePhaserGameReady = useCallback((game: any) => {
    console.log('Phaser game ready');
    setPhaserGameRef(game);
    // Wrap game events with type-safe wrapper
    setGameEvents(wrapGameEvents(game));
  }, []);

  // WebSocket connection for real-time multiplayer (custom hook)
  useGameWebSocket(gameEvents);

  // Emit weapon changes to Phaser when weapon or game ref changes (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents && selectedWeapon) {
      console.log('Emitting weapon to Phaser:', selectedWeapon.name);
      gameEvents.emit('weaponSelected', { weapon: selectedWeapon });
    }
  }, [gameEvents, selectedWeapon]);

  // Emit camera follow changes to Phaser (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents) {
      console.log('Emitting camera follow to Phaser:', cameraFollowEnabled);
      gameEvents.emit('cameraFollowToggle', { enabled: cameraFollowEnabled });
    }
  }, [gameEvents, cameraFollowEnabled]);

  // Emit weapon ranges toggle changes to Phaser (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents) {
      console.log('Emitting weapon ranges toggle to Phaser:', showWeaponRanges);
      gameEvents.emit('weaponRangesToggle', { enabled: showWeaponRanges });
    }
  }, [gameEvents, showWeaponRanges]);

  // Emit movement ranges toggle changes to Phaser (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents) {
      console.log('Emitting movement ranges toggle to Phaser:', showMovementRanges);
      gameEvents.emit('movementRangesToggle', { enabled: showMovementRanges });
    }
  }, [gameEvents, showMovementRanges]);

  // Emit illumination changes to Phaser (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents) {
      console.log('Emitting illumination to Phaser:', illumination);
      gameEvents.emit('illuminationChange', { level: illumination });
    }
  }, [gameEvents, illumination]);

  // Emit map grid toggle to Phaser (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents) {
      console.log('Emitting map grid toggle to Phaser:', showMapGrid);
      gameEvents.emit('mapGridToggle', { enabled: showMapGrid });
    }
  }, [gameEvents, showMapGrid]);

  // Emit map walls toggle to Phaser (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents) {
      console.log('Emitting map walls toggle to Phaser:', showMapWalls);
      gameEvents.emit('mapWallsToggle', { enabled: showMapWalls });
    }
  }, [gameEvents, showMapWalls]);

  // Emit map cover toggle to Phaser (TYPE-SAFE)
  useEffect(() => {
    if (gameEvents) {
      console.log('Emitting map cover toggle to Phaser:', showMapCover);
      gameEvents.emit('mapCoverToggle', { enabled: showMapCover });
    }
  }, [gameEvents, showMapCover]);

  // Listen for AI-generated map loading
  useEffect(() => {
    const handleLoadGeneratedMap = (event: CustomEvent<GeneratedMap>) => {
      console.log('Received loadGeneratedMap event:', event.detail);

      if (gameEvents) {
        // Emit to Phaser game to load the map
        gameEvents.emit('loadGeneratedMap', { mapData: event.detail });
        console.log('Sent map data to Phaser game');
      } else {
        console.warn('Game not ready to receive map data');
      }
    };

    // Listen for custom event from AI Assistant
    window.addEventListener('loadGeneratedMap', handleLoadGeneratedMap as EventListener);

    return () => {
      window.removeEventListener('loadGeneratedMap', handleLoadGeneratedMap as EventListener);
    };
  }, [gameEvents]);

  // Listen for turn changes from WebSocket (legacy support)
  useEffect(() => {
    const handleTurnChanged = (event: CustomEvent) => {
      const gameState = event.detail;
      console.log('[GameArena] Received turn change via WebSocket:', gameState);

      // Update combat state with new turn information
      setCombatState(prev => ({
        ...prev,
        turnNumber: gameState.turnNumber,
        phase: gameState.turnPhase,
      }));

      // CRITICAL FIX: Reset actions when turn changes
      // This prevents the bug where players could take unlimited actions
      setRemainingActions(1);

      console.log(`[GameArena] Turn updated to ${gameState.turnNumber} (${gameState.turnPhase} phase) - Actions reset to 1`);
    };

    // Listen for turn change events from WebSocket
    window.addEventListener('turnChanged', handleTurnChanged as EventListener);

    return () => {
      window.removeEventListener('turnChanged', handleTurnChanged as EventListener);
    };
  }, []);

  // Load initial combat state and listen for combat updates
  useEffect(() => {
    // Load initial combat state
    const loadCombatState = async () => {
      try {
        const state = await combatService.getCombatState();
        setInitiativeState(state);
        console.log('[GameArena] Loaded combat state:', state);
      } catch (error) {
        console.error('[GameArena] Failed to load combat state:', error);
      }
    };

    loadCombatState();

    // Listen for combat state changes via WebSocket
    const handleCombatChanged = (event: CustomEvent<CombatStateAPI>) => {
      const newState = event.detail;
      console.log('[GameArena] Received combat update via WebSocket:', newState);
      setInitiativeState(newState);

      // Show notification if there's a message
      if (newState.message) {
        setTurnNotification(newState.message);
      }

      // Reset actions when it becomes this player's turn
      if (selectedCharacter?.id && newState.activeCharacterId === selectedCharacter.id) {
        setRemainingActions(1);
        setTurnNotification("It's your turn!");
      }
    };

    // Listen for combat change events from WebSocket
    window.addEventListener('combatChanged', handleCombatChanged as EventListener);

    return () => {
      window.removeEventListener('combatChanged', handleCombatChanged as EventListener);
    };
  }, [selectedCharacter?.id]);

  // Handler for ending turn
  const handleEndTurn = useCallback(async () => {
    if (!selectedCharacter?.id) return;

    try {
      const newState = await combatService.endTurn(selectedCharacter.id);
      setInitiativeState(newState);
      setRemainingActions(0); // Can't act anymore this turn
      console.log('[GameArena] Turn ended, new active:', newState.activeCharacterName);
    } catch (error) {
      console.error('[GameArena] Failed to end turn:', error);
    }
  }, [selectedCharacter?.id]);

  // WebSocket connection is now handled by useGameWebSocket hook

  // Handle power casting (Phase 3)
  const handleCastPower = useCallback(async (
    powerId: number,
    powerName: string,
    powerCost: number,
    needsTarget: boolean
  ) => {
    if (!selectedCharacter) return;

    if (needsTarget) {
      // Enter target selection mode
      setCastingPower({ powerId, powerName, powerCost, needsTarget });
      setPowersOpen(false);
      console.log(`[GameArena] Selecting target for power: ${powerName}`);
      // TODO: Integrate with Phaser scene for target selection
      return;
    }

    // Self-targeting or no-target power - cast immediately
    try {
      const result = await characterService.castPower(selectedCharacter.id!, powerId);

      // Update character's power points
      setSelectedCharacter({
        ...selectedCharacter,
        currentPowerPoints: result.currentPowerPoints
      });

      // Add to combat log
      const newLog: CombatLogEntry = {
        id: `${Date.now()}`,
        timestamp: Date.now(),
        message: `${selectedCharacter.name} casts ${result.powerCast}! (${powerCost} PP)`,
        type: 'success'
      };
      setCombatState(prev => ({
        ...prev,
        combatLog: [...prev.combatLog, newLog]
      }));

      console.log(`[GameArena] Power cast successful: ${powerName}`);
    } catch (error: any) {
      console.error('[GameArena] Failed to cast power:', error);
      const errorLog: CombatLogEntry = {
        id: `${Date.now()}`,
        timestamp: Date.now(),
        message: error.response?.data?.error || 'Power casting failed!',
        type: 'damage'
      };
      setCombatState(prev => ({
        ...prev,
        combatLog: [...prev.combatLog, errorLog]
      }));
    }
  }, [selectedCharacter, setSelectedCharacter]);

  // Load existing game state when entering arena (positions of players already on map)
  useEffect(() => {
    if (!token || !selectedCharacter || !gameEvents) {
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

    console.log('[GameArena] Loading existing game state...');

    // Fetch current game state from server
    fetch(`${apiUrl}/game/state`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load game state: ${response.status}`);
        }
        return response.json();
      })
      .then((gameState) => {
        console.log('[GameArena] Game state loaded:', gameState);
        console.log(`[GameArena] Current map: ${gameState.currentMap}`);
        console.log(`[GameArena] Turn ${gameState.turnNumber} (${gameState.turnPhase} phase)`);
        console.log(`[GameArena] ${gameState.tokenPositions.length} token(s) on map`);

        // Render all existing token positions (excluding our own character)
        gameState.tokenPositions.forEach((position: any) => {
          // Don't render our own character (it's already placed by Phaser)
          if (position.tokenId !== String(selectedCharacter.id)) {
            console.log(`[GameArena] Rendering existing token: ${position.tokenId} at (${position.gridX}, ${position.gridY})`);

            // Emit to Phaser to render remote token
            // Must match RemoteTokenMovedEvent interface: gridX, gridY, movedBy
            gameEvents.emit('remoteTokenMoved', {
              tokenId: position.tokenId,
              tokenType: position.tokenType,
              gridX: position.gridX,
              gridY: position.gridY,
              movedBy: position.lastMovedBy,
            });
          }
        });
      })
      .catch((error) => {
        console.error('[GameArena] Failed to load game state:', error);
        // Non-critical error - game can still start without seeing other players
      });
  }, [token, selectedCharacter, gameEvents]);

  // Fetch characters on component mount
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        setLoading(true);
        const fetchedCharacters = await characterService.fetchCharacters();
        setCharacters(fetchedCharacters);
        setError(null);
      } catch (err) {
        setError('Failed to load characters. Please try again.');
        console.error('Error loading characters:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCharacters();
  }, []);

  const handleSelectCharacter = (character: GameCharacter) => {
    setSelectedCharacter(character);
    setGameStarted(true);

    // Auto-select first weapon if available
    const weapons = character.equipment?.filter(eq =>
      eq.type === 'WEAPON_MELEE' || eq.type === 'WEAPON_RANGED'
    );
    if (weapons && weapons.length > 0) {
      setSelectedWeapon(weapons[0]);
      // The useEffect will handle emitting to Phaser
    }

    // Reset combat state
    setPlayerWounds(0);
    setPlayerShaken(false);
    setRemainingActions(1);
  };

  const handleSelectWeapon = (weapon: Equipment) => {
    console.log('handleSelectWeapon called with:', weapon.name);
    setSelectedWeapon(weapon);
    // The useEffect will handle emitting to Phaser
  };

  const handleSelectAction = (action: CombatAction, power?: string) => {
    console.log('Action selected:', action.name, power ? `Power: ${power}` : '');

    // TURN ENFORCEMENT: Check if combat is active and it's the player's turn
    if (initiativeState.combatActive && !isMyTurn) {
      setTurnNotification("It's not your turn!");
      console.log('[GameArena] Action blocked - not player\'s turn');
      return;
    }

    // Check if player has actions remaining
    if (remainingActions <= 0) {
      setTurnNotification("No actions remaining this turn!");
      console.log('[GameArena] Action blocked - no actions remaining');
      return;
    }

    // PHASE 1: Handle called shot - open dialog for target selection
    if (action.type === 'called_shot') {
      setCalledShotDialogOpen(true);
      return;
    }

    // Emit action event to Phaser game (TYPE-SAFE)
    if (gameEvents) {
      gameEvents.emit('playerActionSelected', { action, power });
      setRemainingActions(prev => prev - 1);
    }
  };

  // PHASE 1: Handle called shot target selection (TYPE-SAFE)
  const handleCalledShotSelect = (target: CalledShotTarget) => {
    setCalledShotDialogOpen(false);

    // Send target to Phaser game via CombatManager
    if (gameEvents) {
      gameEvents.emit('calledShotSelected', { target });
    }

    console.log('Called shot target selected:', target);
  };

  const handleCalledShotCancel = () => {
    setCalledShotDialogOpen(false);
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {!gameStarted ? (
        /* Character Selection Screen */
        <Paper sx={{ p: 4, backgroundColor: '#2d1b0e' }}>
          <Typography variant="h5" sx={{ color: '#f5e6d3', mb: 2, textAlign: 'center' }}>
            Select Your Character
          </Typography>
          <Typography sx={{ color: '#d4b896', mb: 4, textAlign: 'center' }}>
            Choose a character to test in the combat arena
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress sx={{ color: '#8b4513' }} />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && characters.length === 0 && (
            <Alert severity="info" sx={{ textAlign: 'center' }}>
              No characters found. Please create a character first from the main character sheet page.
            </Alert>
          )}

          {!loading && !error && characters.length > 0 && (
            <Grid container spacing={3}>
              {characters.map((character) => (
                <Grid item xs={12} sm={6} md={4} key={character.id}>
                  <Card
                    sx={{
                      backgroundColor: '#1a0f08',
                      border: '2px solid #8b4513',
                      '&:hover': {
                        border: '2px solid #a0522d',
                        transform: 'scale(1.02)',
                        transition: 'all 0.2s',
                      },
                    }}
                  >
                    <CardActionArea onClick={() => handleSelectCharacter(character)}>
                      {character.characterImageUrl ? (
                        <CardMedia
                          component="img"
                          height="200"
                          image={character.characterImageUrl}
                          alt={character.name}
                          sx={{
                            objectFit: 'cover',
                            objectPosition: 'top',
                            backgroundColor: '#1a0f08',
                          }}
                          onError={(e: any) => {
                            // Hide broken image on error
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 200,
                            backgroundColor: '#1a0f08',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '48px',
                          }}
                        >
                          🤠
                        </Box>
                      )}
                      <CardContent>
                        <Typography
                          variant="h6"
                          sx={{
                            color: '#f5e6d3',
                            fontFamily: 'Rye, serif',
                            mb: 1,
                          }}
                        >
                          {character.name}
                        </Typography>
                        <Box sx={{ color: '#d4b896', fontSize: '0.875rem' }}>
                          <Typography sx={{ fontSize: '0.75rem' }}>
                            Pace: {character.pace} | Parry: {character.parry} | Toughness: {character.toughness}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                            Str: {character.strengthDie} | Agi: {character.agilityDie} | Vig: {character.vigorDie}
                          </Typography>
                          {(character.maxPowerPoints && character.maxPowerPoints > 0) && (
                            <Typography sx={{ fontSize: '0.75rem', mt: 0.5, color: '#87CEEB' }}>
                              ⚡ PP: {character.currentPowerPoints || 0}/{character.maxPowerPoints}
                            </Typography>
                          )}
                          {character.fateChips !== undefined && (
                            <Typography sx={{ fontSize: '0.75rem', mt: 0.5, color: '#FFD700' }}>
                              🎲 Fate Chips: {character.fateChips}
                            </Typography>
                          )}
                          {(character.woundCount !== undefined && character.woundCount > 0) && (
                            <Typography sx={{
                              fontSize: '0.75rem',
                              mt: 0.5,
                              color: character.woundCount >= 3 ? '#FF6B6B' : '#FFA500'
                            }}>
                              ❤️ Wounds: {character.woundCount}/3
                            </Typography>
                          )}
                          {character.isShaken && (
                            <Typography sx={{ fontSize: '0.75rem', mt: 0.5, color: '#FFA500' }}>
                              💫 SHAKEN
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      ) : (
        <>
          {/* GM Control Panel - Only visible to Game Masters */}
          <GMControlPanel
            onMapChange={() => {
              // Optionally reload game state or refresh arena
              console.log('Map changed by GM');
            }}
            onGameReset={() => {
              // Optionally reset local game state
              console.log('Game reset by GM');
            }}
            currentIllumination={illumination}
            onIlluminationChange={setIllumination}
          />

          {/* ARENA LAYOUT: 15% Initiative | 65% Map | 15% Combat Log | 5% Spacing */}
          <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
          {/* Main Content Area - Initiative Tracker + Map + Combat Log */}
          <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', gap: '2.5%' }}>
            {/* Left: Initiative Tracker (15% of screen width) */}
            <Box sx={{ width: '15%', minWidth: 150, p: 2 }}>
              <InitiativeTracker
                entries={initiativeState.initiativeOrder}
                roundNumber={initiativeState.roundNumber}
                combatActive={initiativeState.combatActive}
                currentCharacterId={selectedCharacter?.id}
              />
            </Box>

            {/* Center: Game Canvas (65% of screen width) */}
            <Box sx={{ width: '65%', position: 'relative', overflow: 'hidden', p: 1 }}>
              <GameCanvas
                character={selectedCharacter}
                selectedWeapon={selectedWeapon}
                onCombatStateUpdate={handleCombatStateUpdate}
                onDiceRoll={handleDiceRoll}
                onWoundsUpdate={handleWoundsUpdate}
                onShakenUpdate={handleShakenUpdate}
                onMovementBudgetUpdate={handleMovementBudgetUpdate}
                onPhaserGameReady={handlePhaserGameReady}
              />
              {/* Dice Roll Popup - Positioned absolutely over the canvas */}
              <DiceRollPopup
                roll={currentDiceRoll}
                onComplete={() => setCurrentDiceRoll(null)}
              />
            </Box>

            {/* Right: Combat Log (15% of screen width) */}
            <Box sx={{ width: '15%', minWidth: 150, p: 2 }}>
              <CombatLog logs={combatState.combatLog} />
            </Box>
          </Box>

          {/* Bottom Action Bar */}
          {selectedCharacter && (
            <ActionBar
              character={selectedCharacter}
              playerHealth={combatState.playerHealth}
              playerMaxHealth={combatState.playerMaxHealth}
              playerWounds={playerWounds}
              movementBudget={movementBudget}
              selectedWeapon={selectedWeapon}
              weapons={selectedCharacter.equipment?.filter(
                (eq) => eq.type === 'WEAPON_MELEE' || eq.type === 'WEAPON_RANGED'
              ) || []}
              onSelectWeapon={handleSelectWeapon}
              onSelectAction={handleSelectAction}
              remainingActions={remainingActions}
              cameraFollowEnabled={cameraFollowEnabled}
              setCameraFollowEnabled={setCameraFollowEnabled}
              showWeaponRanges={showWeaponRanges}
              setShowWeaponRanges={setShowWeaponRanges}
              showMovementRanges={showMovementRanges}
              setShowMovementRanges={setShowMovementRanges}
              illumination={illumination}
              setIllumination={setIllumination}
              showMapGrid={showMapGrid}
              setShowMapGrid={setShowMapGrid}
              showMapWalls={showMapWalls}
              setShowMapWalls={setShowMapWalls}
              showMapCover={showMapCover}
              setShowMapCover={setShowMapCover}
              onOpenAIAssistant={() => setAiAssistantOpen(true)}
              onOpenPowers={() => setPowersOpen(true)}
              hasPowers={selectedCharacter.powers && selectedCharacter.powers.length > 0}
              isGM={isGameMaster}
              isMyTurn={isMyTurn}
              combatActive={initiativeState.combatActive}
              onEndTurn={handleEndTurn}
            />
          )}
        </Box>
        </>
      )}

      {/* AI Assistant Drawer */}
      <Drawer
        anchor="right"
        open={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        PaperProps={{
          sx: {
            width: 500,
            maxWidth: '90vw',
          },
        }}
      >
        <AIAssistantPanel onClose={() => setAiAssistantOpen(false)} />
      </Drawer>

      {/* PHASE 3: Powers Drawer */}
      {selectedCharacter && selectedCharacter.powers && selectedCharacter.powers.length > 0 && (
        <Drawer
          anchor="right"
          open={powersOpen}
          onClose={() => setPowersOpen(false)}
          PaperProps={{
            sx: {
              width: 600,
              maxWidth: '95vw',
              bgcolor: 'background.default'
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Button
              onClick={() => setPowersOpen(false)}
              variant="outlined"
              fullWidth
              sx={{ mb: 2 }}
            >
              Close
            </Button>
            <PowersPanel
              character={selectedCharacter}
              onCastPower={handleCastPower}
              disabled={false}
            />
          </Box>
        </Drawer>
      )}

      {/* PHASE 1: Called Shot Dialog */}
      <CalledShotDialog
        open={calledShotDialogOpen}
        onSelect={handleCalledShotSelect}
        onCancel={handleCalledShotCancel}
      />

      {/* Turn Notification Snackbar */}
      <Snackbar
        open={!!turnNotification}
        autoHideDuration={3000}
        onClose={() => setTurnNotification(null)}
        message={turnNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: '#2d1b0e',
            border: '2px solid #8b4513',
            color: '#f5e6d3',
            fontFamily: 'Rye, serif',
            fontSize: '16px',
          },
        }}
      />
    </Box>
  );
}
