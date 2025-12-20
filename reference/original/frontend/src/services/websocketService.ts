import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * WebSocket Service for real-time game synchronization.
 *
 * Handles connection to the backend WebSocket endpoint and
 * manages subscriptions to game events (token movements, player join/leave).
 *
 * Architecture: Single Shared World
 * - All players subscribe to the same /topic/game/* topics
 * - No session-specific topics - everyone sees everyone
 */
export class WebSocketService {
  private client: Client | null = null;
  private token: string | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to the WebSocket endpoint.
   *
   * @param apiUrl Base API URL (e.g., 'http://localhost:8080/api' or Railway URL)
   * @param token JWT authentication token
   * @returns Promise that resolves when connection is established
   */
  connect(apiUrl: string, token: string): Promise<void> {
    this.token = token;

    // WebSocket endpoint is under the same context path as the API
    // If apiUrl is 'http://localhost:8080/api', WebSocket is at 'http://localhost:8080/api/ws'
    const wsUrl = apiUrl.endsWith('/') ? `${apiUrl}ws` : `${apiUrl}/ws`;

    return new Promise((resolve, reject) => {
      this.client = new Client({
        webSocketFactory: () => new SockJS(wsUrl),

        // Send JWT token in connection headers
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },

        debug: (str) => {
          console.log('[WebSocket Debug]', str);
        },

        onConnect: () => {
          console.log('[WebSocket] Connected successfully');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.subscribeToGameEvents();
          resolve();
        },

        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame.headers['message']);
          console.error('[WebSocket] Error details:', frame.body);
          this.connected = false;
          reject(new Error(frame.headers['message'] || 'STOMP error'));
        },

        onWebSocketClose: () => {
          console.warn('[WebSocket] Connection closed');
          this.connected = false;
          this.handleReconnect(apiUrl, token);
        },

        onWebSocketError: (error) => {
          console.error('[WebSocket] WebSocket error:', error);
          this.connected = false;
        },

        // Heartbeat to keep connection alive
        heartbeatIncoming: 10000, // 10 seconds
        heartbeatOutgoing: 10000,

        // Reconnect automatically
        reconnectDelay: 5000, // 5 seconds
      });

      this.client.activate();
    });
  }

  /**
   * Subscribe to all game events.
   * Dispatches events to the window object for React components to listen.
   */
  private subscribeToGameEvents() {
    if (!this.client) {
      console.error('[WebSocket] Cannot subscribe - client not initialized');
      return;
    }

    // Subscribe to token movement events
    this.client.subscribe('/topic/game/moves', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('[WebSocket] Received token move:', event);

        // Dispatch to window for Phaser to listen
        window.dispatchEvent(
          new CustomEvent('remoteTokenMoved', { detail: event })
        );
      } catch (error) {
        console.error('[WebSocket] Failed to parse token move:', error);
      }
    });

    // Subscribe to player join/leave events
    this.client.subscribe('/topic/game/players', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('[WebSocket] Received player event:', event);

        // Dispatch player events
        if (event.event === 'player_joined') {
          window.dispatchEvent(
            new CustomEvent('playerJoined', { detail: event })
          );
        } else if (event.event === 'player_left') {
          window.dispatchEvent(
            new CustomEvent('playerLeft', { detail: event })
          );
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse player event:', error);
      }
    });

    // Subscribe to turn change events (legacy)
    this.client.subscribe('/topic/game/turn', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('[WebSocket] Received turn change:', event);

        // Dispatch turn change event for UI components
        window.dispatchEvent(
          new CustomEvent('turnChanged', { detail: event })
        );
      } catch (error) {
        console.error('[WebSocket] Failed to parse turn change:', error);
      }
    });

    // Subscribe to combat/initiative events (Savage Worlds card-based initiative)
    this.client.subscribe('/topic/game/combat', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('[WebSocket] Received combat state update:', event);

        // Dispatch combat change event for UI components
        window.dispatchEvent(
          new CustomEvent('combatChanged', { detail: event })
        );
      } catch (error) {
        console.error('[WebSocket] Failed to parse combat event:', error);
      }
    });

    // Subscribe to personal pong messages
    this.client.subscribe('/user/queue/pong', (message: IMessage) => {
      try {
        const event = JSON.parse(message.body);
        console.log('[WebSocket] Pong received:', event);
      } catch (error) {
        console.error('[WebSocket] Failed to parse pong:', error);
      }
    });

    console.log('[WebSocket] Subscribed to all game events');

    // Notify server that we've joined
    this.sendPlayerJoin();
  }

  /**
   * Send token movement to server.
   *
   * @param tokenId Character/token ID
   * @param tokenType 'PLAYER' or 'ENEMY'
   * @param fromX Starting grid X coordinate
   * @param fromY Starting grid Y coordinate
   * @param toX Ending grid X coordinate
   * @param toY Ending grid Y coordinate
   */
  sendTokenMove(
    tokenId: string,
    tokenType: 'PLAYER' | 'ENEMY',
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) {
    if (!this.client || !this.connected) {
      console.warn('[WebSocket] Cannot send move - not connected');
      return;
    }

    const moveRequest = {
      tokenId,
      tokenType,
      fromX,
      fromY,
      toX,
      toY,
    };

    console.log('[WebSocket] Sending token move:', moveRequest);

    this.client.publish({
      destination: '/app/game/move',
      body: JSON.stringify(moveRequest),
    });
  }

  /**
   * Notify server that player has joined the game.
   */
  sendPlayerJoin() {
    if (!this.client || !this.connected) {
      console.warn('[WebSocket] Cannot send join - not connected');
      return;
    }

    console.log('[WebSocket] Sending player join notification');

    this.client.publish({
      destination: '/app/game/join',
      body: JSON.stringify({}),
    });
  }

  /**
   * Notify server that player is leaving the game.
   */
  sendPlayerLeave() {
    if (!this.client || !this.connected) {
      return;
    }

    console.log('[WebSocket] Sending player leave notification');

    this.client.publish({
      destination: '/app/game/leave',
      body: JSON.stringify({}),
    });
  }

  /**
   * Send ping to test connection.
   */
  sendPing() {
    if (!this.client || !this.connected) {
      console.warn('[WebSocket] Cannot send ping - not connected');
      return;
    }

    this.client.publish({
      destination: '/app/game/ping',
      body: JSON.stringify({}),
    });
  }

  /**
   * Handle reconnection logic.
   */
  private handleReconnect(apiUrl: string, token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      window.dispatchEvent(
        new CustomEvent('websocketDisconnected', {
          detail: { reason: 'max_reconnect_attempts' },
        })
      );
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    setTimeout(() => {
      this.connect(apiUrl, token).catch((error) => {
        console.error('[WebSocket] Reconnect failed:', error);
      });
    }, 5000);
  }

  /**
   * Disconnect from WebSocket.
   */
  disconnect() {
    if (this.client) {
      console.log('[WebSocket] Disconnecting...');
      this.sendPlayerLeave();
      this.client.deactivate();
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Check if WebSocket is connected.
   */
  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton instance
let websocketServiceInstance: WebSocketService | null = null;

/**
 * Get the global WebSocketService instance.
 * Creates a new instance if one doesn't exist.
 */
export const getWebSocketService = (): WebSocketService => {
  if (!websocketServiceInstance) {
    websocketServiceInstance = new WebSocketService();
  }
  return websocketServiceInstance;
};
