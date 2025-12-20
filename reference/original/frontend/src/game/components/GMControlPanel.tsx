import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';
import { Illumination } from '../types/GameTypes';
import { combatService, CombatState } from '../../services/combatService';

interface GameState {
  turnNumber: number;
  turnPhase: string;
  currentMap: string | null;
  tokenPositions: any[];
  lastActivity: string;
}

interface GMControlPanelProps {
  onMapChange?: () => void;
  onGameReset?: () => void;
  currentIllumination?: Illumination;
  onIlluminationChange?: (level: Illumination) => void;
}

const GMControlPanel: React.FC<GMControlPanelProps> = ({
  onMapChange,
  onGameReset,
  currentIllumination = Illumination.BRIGHT,
  onIlluminationChange
}) => {
  const { user, token } = useAuthStore();
  const { selectedCharacter } = useGameStore();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newMapId, setNewMapId] = useState('');
  const [showMapInput, setShowMapInput] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Combat state
  const [combatState, setCombatState] = useState<CombatState | null>(null);
  const [showCombatSetup, setShowCombatSetup] = useState(false);
  const [npcInput, setNpcInput] = useState('Bandit 1, Bandit 2, Bandit 3');
  const [showEndCombatConfirm, setShowEndCombatConfirm] = useState(false);

  // Draggable panel state
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

  // Check if user is GM
  const isGM = user?.role === 'GAME_MASTER';

  // Load game state and combat state
  useEffect(() => {
    if (!token || !isGM) return;

    loadGameState();
    loadCombatState();
  }, [token, isGM]);

  // Listen for combat state changes via WebSocket
  useEffect(() => {
    const handleCombatChanged = (event: CustomEvent<CombatState>) => {
      setCombatState(event.detail);
    };

    window.addEventListener('combatChanged', handleCombatChanged as EventListener);
    return () => {
      window.removeEventListener('combatChanged', handleCombatChanged as EventListener);
    };
  }, []);

  const loadCombatState = async () => {
    try {
      const state = await combatService.getCombatState();
      setCombatState(state);
    } catch (error) {
      console.error('Failed to load combat state:', error);
    }
  };

  const loadGameState = async () => {
    try {
      const response = await fetch(`${API_URL}/game/state`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGameState(data);
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  };

  const handleChangeMap = async () => {
    if (!newMapId.trim()) {
      showNotification('Please enter a map name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/game/map/change`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mapId: newMapId }),
      });

      if (response.ok) {
        showNotification(`Map changed to: ${newMapId}. All tokens cleared!`);
        setNewMapId('');
        setShowMapInput(false);
        await loadGameState();
        if (onMapChange) onMapChange();
      } else {
        const error = await response.text();
        showNotification(`Failed to change map: ${error}`);
      }
    } catch (error) {
      console.error('Failed to change map:', error);
      showNotification('Error changing map');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetGame = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/game/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showNotification('Game reset! All tokens cleared, turn reset to 1.');
        setShowResetConfirm(false);
        await loadGameState();
        if (onGameReset) onGameReset();
      } else {
        const error = await response.text();
        showNotification(`Failed to reset game: ${error}`);
      }
    } catch (error) {
      console.error('Failed to reset game:', error);
      showNotification('Error resetting game');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleIlluminationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLevel = event.target.value as Illumination;
    if (onIlluminationChange) {
      onIlluminationChange(newLevel);
      const levelNames: Record<Illumination, string> = {
        [Illumination.BRIGHT]: 'Bright',
        [Illumination.DIM]: 'Dim',
        [Illumination.DARK]: 'Dark',
        [Illumination.PITCH_BLACK]: 'Pitch Black'
      };
      showNotification(`Illumination changed to: ${levelNames[newLevel]}`);
    }
  };

  const handleAdvanceTurn = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/game/turn/advance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const updatedState = await response.json();
        setGameState(updatedState);
        showNotification(`Turn advanced! Now: Turn ${updatedState.turnNumber} (${updatedState.turnPhase} phase)`);
      } else {
        const error = await response.text();
        showNotification(`Failed to advance turn: ${error}`);
      }
    } catch (error) {
      console.error('Failed to advance turn:', error);
      showNotification('Error advancing turn');
    } finally {
      setIsLoading(false);
    }
  };

  // Start combat with NPCs
  const handleStartCombat = async () => {
    setIsLoading(true);
    try {
      // Parse NPC names from input (comma-separated)
      const npcNames = npcInput
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (npcNames.length === 0) {
        showNotification('Please enter at least one NPC name');
        setIsLoading(false);
        return;
      }

      // Get player character IDs from tokens on map (if available)
      // For now, include the selected character if it exists
      const playerCharacterIds: number[] = [];
      if (selectedCharacter?.id) {
        playerCharacterIds.push(selectedCharacter.id);
      }

      const state = await combatService.startCombat(playerCharacterIds, npcNames);
      setCombatState(state);
      setShowCombatSetup(false);
      showNotification(`Combat started! Round ${state.roundNumber} - ${state.initiativeOrder.length} combatants`);
    } catch (error) {
      console.error('Failed to start combat:', error);
      showNotification('Error starting combat');
    } finally {
      setIsLoading(false);
    }
  };

  // End combat
  const handleEndCombat = async () => {
    setIsLoading(true);
    try {
      const state = await combatService.endCombat();
      setCombatState(state);
      setShowEndCombatConfirm(false);
      showNotification('Combat ended!');
    } catch (error) {
      console.error('Failed to end combat:', error);
      showNotification('Error ending combat');
    } finally {
      setIsLoading(false);
    }
  };

  // Force new round (deals new cards)
  const handleNewRound = async () => {
    setIsLoading(true);
    try {
      const state = await combatService.newRound();
      setCombatState(state);
      showNotification(`New round started! Round ${state.roundNumber}`);
    } catch (error) {
      console.error('Failed to start new round:', error);
      showNotification('Error starting new round');
    } finally {
      setIsLoading(false);
    }
  };

  // End current character's turn (GM can end anyone's turn)
  const handleEndCurrentTurn = async () => {
    if (!combatState?.activeCharacterId) return;

    setIsLoading(true);
    try {
      const state = await combatService.endTurn(combatState.activeCharacterId);
      setCombatState(state);
      showNotification(`${combatState.activeCharacterName}'s turn ended. Now: ${state.activeCharacterName}'s turn`);
    } catch (error) {
      console.error('Failed to end turn:', error);
      showNotification('Error ending turn');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCollapsed) return; // Don't allow dragging when collapsed header is too small

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep panel within viewport bounds
      const panelWidth = 300;
      const panelHeight = 50; // Minimum draggable area
      const maxX = window.innerWidth - panelWidth;
      const maxY = window.innerHeight - panelHeight;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Don't render if not GM
  if (!isGM) return null;

  return (
    <div
      ref={panelRef}
      style={{
        ...styles.container,
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Notification Toast */}
      {notification && (
        <div style={styles.notification}>
          {notification}
        </div>
      )}

      {/* GM Control Panel */}
      <div style={styles.panel}>
        <div
          style={{
            ...styles.header,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
          onMouseDown={handleMouseDown}
        >
          <h3 style={styles.title}>🎮 GM Controls</h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={styles.collapseButton}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <>
            {/* Game State Display */}
            {gameState && (
              <div style={styles.stateDisplay}>
                <div style={styles.stateLine}>
                  <strong>Map:</strong> {gameState.currentMap || 'No map set'}
                </div>
                <div style={styles.stateLine}>
                  <strong>Turn:</strong> {gameState.turnNumber} ({gameState.turnPhase} phase)
                </div>
                <div style={styles.stateLine}>
                  <strong>Tokens:</strong> {gameState.tokenPositions.length} on map
                </div>
              </div>
            )}

            {/* Illumination Control */}
            <div style={styles.section}>
              <label style={styles.label}>
                💡 Illumination Level
              </label>
              <select
                value={currentIllumination}
                onChange={handleIlluminationChange}
                style={styles.select}
                data-testid="illumination-select"
              >
                <option value={Illumination.BRIGHT}>☀️ Bright (no penalty)</option>
                <option value={Illumination.DIM}>🌅 Dim (-1 penalty)</option>
                <option value={Illumination.DARK}>🌙 Dark (-2 penalty)</option>
                <option value={Illumination.PITCH_BLACK}>🌑 Pitch Black (-4 penalty)</option>
              </select>
              <div style={styles.helpText}>
                Affects attack and Notice rolls for all characters
              </div>
            </div>

            {/* Combat Controls Section */}
            <div style={styles.section}>
              <label style={styles.label}>
                ⚔️ Combat (Savage Worlds Initiative)
              </label>

              {/* Combat Status Display */}
              {combatState && (
                <div style={{
                  ...styles.stateDisplay,
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: combatState.combatActive ? 'rgba(100, 50, 50, 0.8)' : 'rgba(50, 50, 50, 0.8)',
                  border: combatState.combatActive ? '1px solid #ff6666' : '1px solid #666',
                }}>
                  <div style={styles.stateLine}>
                    <strong>Status:</strong>{' '}
                    <span style={{ color: combatState.combatActive ? '#ff6666' : '#88ff88' }}>
                      {combatState.combatActive ? `Round ${combatState.roundNumber}` : 'No Combat'}
                    </span>
                  </div>
                  {combatState.combatActive && combatState.activeCharacterName && (
                    <div style={styles.stateLine}>
                      <strong>Active:</strong> {combatState.activeCharacterName}
                    </div>
                  )}
                  {combatState.combatActive && (
                    <div style={styles.stateLine}>
                      <strong>Combatants:</strong> {combatState.initiativeOrder.length}
                    </div>
                  )}
                </div>
              )}

              {/* Combat Not Active - Show Start Combat */}
              {!combatState?.combatActive && !showCombatSetup && (
                <button
                  onClick={() => setShowCombatSetup(true)}
                  style={{ ...styles.button, ...styles.combatButton }}
                  disabled={isLoading}
                >
                  ⚔️ Start Combat
                </button>
              )}

              {/* Combat Setup - NPC Input */}
              {!combatState?.combatActive && showCombatSetup && (
                <div style={styles.inputGroup}>
                  <label style={{ ...styles.helpText, marginBottom: '4px', fontStyle: 'normal' }}>
                    Enter NPC names (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={npcInput}
                    onChange={(e) => setNpcInput(e.target.value)}
                    placeholder="Bandit 1, Bandit 2, Bandit Boss"
                    style={styles.input}
                    onKeyPress={(e) => e.key === 'Enter' && handleStartCombat()}
                  />
                  <div style={styles.buttonRow}>
                    <button
                      onClick={handleStartCombat}
                      style={{ ...styles.button, ...styles.confirmButton, flex: 1 }}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Starting...' : '🎴 Deal Cards'}
                    </button>
                    <button
                      onClick={() => setShowCombatSetup(false)}
                      style={{ ...styles.button, ...styles.cancelButton, flex: 1 }}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                  </div>
                  <div style={styles.helpText}>
                    Cards will be dealt to all combatants for initiative order
                  </div>
                </div>
              )}

              {/* Combat Active - Show Combat Controls */}
              {combatState?.combatActive && (
                <div style={styles.inputGroup}>
                  {/* End Current Turn Button */}
                  <button
                    onClick={handleEndCurrentTurn}
                    style={styles.button}
                    disabled={isLoading || !combatState.activeCharacterId}
                  >
                    ⏭️ {isLoading ? 'Ending...' : `End ${combatState.activeCharacterName}'s Turn`}
                  </button>

                  {/* New Round Button */}
                  <button
                    onClick={handleNewRound}
                    style={styles.button}
                    disabled={isLoading}
                  >
                    🎴 {isLoading ? 'Dealing...' : 'Force New Round'}
                  </button>

                  {/* End Combat Button */}
                  {!showEndCombatConfirm ? (
                    <button
                      onClick={() => setShowEndCombatConfirm(true)}
                      style={{ ...styles.button, ...styles.dangerButton }}
                      disabled={isLoading}
                    >
                      🏳️ End Combat
                    </button>
                  ) : (
                    <div style={styles.confirmGroup}>
                      <div style={styles.warningText}>
                        End combat and clear initiative?
                      </div>
                      <div style={styles.buttonRow}>
                        <button
                          onClick={handleEndCombat}
                          style={{ ...styles.button, ...styles.confirmButton }}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Ending...' : 'Yes, End'}
                        </button>
                        <button
                          onClick={() => setShowEndCombatConfirm(false)}
                          style={{ ...styles.button, ...styles.cancelButton }}
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* End Turn Section (Legacy) */}
            <div style={styles.section}>
              <button
                onClick={handleAdvanceTurn}
                style={styles.button}
                disabled={isLoading}
              >
                ⏭️ {isLoading ? 'Advancing...' : 'End Turn'}
              </button>
              <div style={styles.helpText}>
                Cycles: player → enemy → resolution → next turn
              </div>
            </div>

            {/* Change Map Section */}
            <div style={styles.section}>
          {!showMapInput ? (
            <button
              onClick={() => setShowMapInput(true)}
              style={styles.button}
              disabled={isLoading}
            >
              🗺️ Change Map
            </button>
          ) : (
            <div style={styles.inputGroup}>
              <input
                type="text"
                value={newMapId}
                onChange={(e) => setNewMapId(e.target.value)}
                placeholder="Enter map name..."
                style={styles.input}
                onKeyPress={(e) => e.key === 'Enter' && handleChangeMap()}
              />
              <button
                onClick={handleChangeMap}
                style={{ ...styles.button, ...styles.confirmButton }}
                disabled={isLoading || !newMapId.trim()}
              >
                {isLoading ? 'Changing...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowMapInput(false);
                  setNewMapId('');
                }}
                style={{ ...styles.button, ...styles.cancelButton }}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          )}
          <div style={styles.helpText}>
            ⚠️ Clears all player tokens (including offline players)
          </div>
        </div>

        {/* Reset Game Section */}
        <div style={styles.section}>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{ ...styles.button, ...styles.dangerButton }}
              disabled={isLoading}
            >
              🔄 Reset Game
            </button>
          ) : (
            <div style={styles.confirmGroup}>
              <div style={styles.warningText}>
                ⚠️ This will clear all tokens and reset turn to 1!
              </div>
              <div style={styles.buttonRow}>
                <button
                  onClick={handleResetGame}
                  style={{ ...styles.button, ...styles.confirmButton }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Yes, Reset'}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{ ...styles.button, ...styles.cancelButton }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div style={styles.helpText}>
            Clears tokens, resets turn to 1 (keeps current map)
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    zIndex: 1000,
    userSelect: 'none', // Prevent text selection while dragging
  },
  panel: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    border: '2px solid #FFD700',
    borderRadius: '8px',
    padding: '16px',
    minWidth: '300px',
    maxWidth: '400px',
    color: '#FFFFFF',
    fontFamily: 'Arial, sans-serif',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
  },
  header: {
    marginBottom: '12px',
    borderBottom: '1px solid #FFD700',
    paddingBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFD700',
    flex: 1,
  },
  collapseButton: {
    background: 'transparent',
    border: 'none',
    color: '#FFD700',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
    marginLeft: '8px',
  },
  stateDisplay: {
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  stateLine: {
    marginBottom: '6px',
  },
  section: {
    marginBottom: '16px',
  },
  button: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    border: '2px solid #FFD700',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#1a1a1a',
    color: '#FFD700',
    transition: 'all 0.2s',
  },
  confirmButton: {
    backgroundColor: '#2a7a2a',
    borderColor: '#4CAF50',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#7a2a2a',
    borderColor: '#CF4C4C',
    color: '#FFFFFF',
  },
  dangerButton: {
    borderColor: '#FF4444',
    color: '#FF4444',
  },
  combatButton: {
    borderColor: '#ff6666',
    color: '#ff6666',
    backgroundColor: 'rgba(100, 50, 50, 0.5)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  input: {
    padding: '8px',
    fontSize: '14px',
    border: '2px solid #FFD700',
    borderRadius: '4px',
    backgroundColor: '#2a2a2a',
    color: '#FFFFFF',
  },
  helpText: {
    fontSize: '11px',
    color: '#AAAAAA',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: '13px',
    color: '#FF6666',
    marginBottom: '8px',
    fontWeight: 'bold',
  },
  confirmGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
  },
  notification: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#2a7a2a',
    color: '#FFFFFF',
    padding: '12px 20px',
    borderRadius: '4px',
    border: '2px solid #4CAF50',
    fontSize: '14px',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    maxWidth: '400px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '2px solid #FFD700',
    borderRadius: '4px',
    backgroundColor: '#2a2a2a',
    color: '#FFFFFF',
    cursor: 'pointer',
    marginBottom: '4px',
  },
};

export default GMControlPanel;
