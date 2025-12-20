import { useEffect } from 'react';
import { getWebSocketService } from '../services/websocketService';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { TypedGameEvents } from '../game/events/GameEvents';

/**
 * Custom hook to manage WebSocket connection for real-time game synchronization.
 *
 * Handles:
 * - Connecting to WebSocket with JWT authentication
 * - Subscribing to game events (token moves, player join/leave)
 * - Sending local token moves to server
 * - Receiving remote token moves and forwarding to Phaser
 * - Cleanup on unmount
 *
 * @param gameEvents Type-safe Phaser game events wrapper
 */
export const useGameWebSocket = (gameEvents: TypedGameEvents | null) => {
  const { token } = useAuthStore();
  const { selectedCharacter } = useGameStore();

  useEffect(() => {
    if (!token || !selectedCharacter || !gameEvents) {
      console.log('[useGameWebSocket] Not ready:', {
        hasToken: !!token,
        hasCharacter: !!selectedCharacter,
        hasGameEvents: !!gameEvents
      });
      return;
    }

    const wsService = getWebSocketService();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

    console.log('[useGameWebSocket] Connecting to WebSocket...');

    wsService.connect(apiUrl, token)
      .then(() => {
        console.log('[useGameWebSocket] Connected successfully');

        // Handler for LOCAL token movements from Phaser
        const handleLocalTokenMove = (data: any) => {
          console.log('[useGameWebSocket] Sending local token move to server:', data);
          wsService.sendTokenMove(
            data.tokenId,
            data.tokenType,
            data.fromX,
            data.fromY,
            data.toX,
            data.toY
          );
        };

        // Handler for REMOTE token movements from server
        const handleRemoteTokenMove = (event: Event) => {
          const customEvent = event as CustomEvent;
          const moveData = customEvent.detail;

          // Don't echo back our own movements
          if (moveData.tokenId !== String(selectedCharacter.id)) {
            console.log('[useGameWebSocket] Received remote token move:', moveData);
            gameEvents.emit('remoteTokenMoved', moveData);
          }
        };

        // Handler for player join events
        const handlePlayerJoin = (event: Event) => {
          const customEvent = event as CustomEvent;
          console.log('[useGameWebSocket] Player joined:', customEvent.detail);
          // Could show notification: "{username} joined the game"
        };

        // Handler for player leave events
        const handlePlayerLeave = (event: Event) => {
          const customEvent = event as CustomEvent;
          console.log('[useGameWebSocket] Player left:', customEvent.detail);
          // Could show notification: "{username} left the game"
        };

        // Subscribe to Phaser game events
        gameEvents.on('localTokenMoved', handleLocalTokenMove);

        // Subscribe to window events from WebSocket service
        window.addEventListener('remoteTokenMoved', handleRemoteTokenMove);
        window.addEventListener('playerJoined', handlePlayerJoin);
        window.addEventListener('playerLeft', handlePlayerLeave);

        // Cleanup function
        return () => {
          console.log('[useGameWebSocket] Cleaning up...');
          gameEvents.off('localTokenMoved', handleLocalTokenMove);
          window.removeEventListener('remoteTokenMoved', handleRemoteTokenMove);
          window.removeEventListener('playerJoined', handlePlayerJoin);
          window.removeEventListener('playerLeft', handlePlayerLeave);
          wsService.disconnect();
          console.log('[useGameWebSocket] Disconnected');
        };
      })
      .catch((error) => {
        console.error('[useGameWebSocket] Failed to connect to WebSocket:', error);
        // Could dispatch error event for UI to show notification
      });

    // Cleanup function (in case connection fails)
    return () => {
      if (wsService.isConnected()) {
        wsService.disconnect();
      }
    };
  }, [token, selectedCharacter, gameEvents]);
};
