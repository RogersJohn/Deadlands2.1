# Architecture Decisions

**Last Updated:** 2025-11-22
**Purpose:** Document key architectural decisions to reduce repeated explanations in future sessions

---

## Table of Contents
1. [Singleton Game State Pattern](#singleton-game-state-pattern)
2. [WebSocket + STOMP Protocol](#websocket--stomp-protocol)
3. [Phaser + React Separation](#phaser--react-separation)
4. [JWT Authentication in WebSocket](#jwt-authentication-in-websocket)
5. [No Multi-Tenancy (Session Removal)](#no-multi-tenancy-session-removal)

---

## Singleton Game State Pattern

### Decision
Use a **single, persistent GameState entity** (ID=1) shared by all players instead of multiple game sessions.

### Rationale
- **Use Case:** Single campaign with one GM and multiple players (not a platform like Roll20)
- **Simplicity:** One game world eliminates session join/leave complexity
- **Persistence:** State survives server restarts via database
- **Industry Standard:** Common pattern for MMO instances, shared game worlds

### Implementation
```java
// backend/src/main/java/com/deadlands/campaign/service/GameStateService.java
private static final Long GAME_STATE_ID = 1L; // Singleton ID

@Transactional
public GameState getOrCreateGameState() {
    Optional<GameState> existing = gameStateRepository.findById(GAME_STATE_ID);
    return existing.orElseGet(() -> createInitialGameState());
}
```

### When to Use This Pattern
✅ Single shared game world
✅ Persistent state needed across server restarts
✅ All players see the same game state

### When NOT to Use This Pattern
❌ Multi-tenant platforms (multiple independent games)
❌ Temporary/ephemeral game sessions
❌ Player-hosted games

---

## WebSocket + STOMP Protocol

### Decision
Use **STOMP over SockJS** for real-time multiplayer synchronization.

### Rationale
- **Industry Standard:** Used by Discord, Slack, trading platforms
- **Spring Integration:** First-class support in Spring Boot
- **Reliability:** SockJS provides fallback mechanisms (polling, XHR streaming)
- **Security:** Supports JWT authentication in headers
- **Pub/Sub Model:** Topic-based subscriptions match game event patterns

### Implementation
```typescript
// Frontend: frontend/src/services/websocketService.ts
this.client = new Client({
  webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
  connectHeaders: { Authorization: `Bearer ${token}` },
  // ...
});

// Subscribe to game events
this.client.subscribe('/topic/game/moves', (message) => { /* ... */ });
```

```java
// Backend: backend/src/main/java/com/deadlands/campaign/controller/GameController.java
@MessageMapping("/game/move")
@SendTo("/topic/game/moves")
public TokenMovedEvent handleTokenMove(TokenMoveRequest request, Principal principal) {
    // Validate, persist, broadcast
}
```

### Message Flow
1. **Client → Server:** `/app/game/move` (STOMP destination)
2. **Server validates:** Ownership, bounds, turn order
3. **Server persists:** Database update (survives restart)
4. **Server → All Clients:** `/topic/game/moves` (broadcast)

### Why Not Alternatives?
- **Socket.io:** Not needed (no custom transports, STOMP is sufficient)
- **Raw WebSocket:** No message framing, no topic routing
- **Server-Sent Events (SSE):** Unidirectional, no client → server messages
- **Polling:** Inefficient, high latency

### References
- [STOMP Protocol Specification](https://stomp.github.io/)
- [Spring WebSocket Documentation](https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#websocket)

---

## Phaser + React Separation

### Decision
Use **Phaser for game engine** (canvas rendering, physics) and **React for UI** (HUD, menus, dialogs).

### Rationale
- **Separation of Concerns:** Game logic separate from UI framework
- **Performance:** Phaser uses WebGL/Canvas (60 FPS), React handles DOM
- **Specialization:** Phaser optimized for 2D games, React optimized for UI
- **Interoperability:** Custom events bridge the two systems

### Architecture
```
┌─────────────────────────────────────┐
│          React Layer                │
│  - GameArena.tsx (container)        │
│  - ActionBar, CombatLog, etc.       │
│  - MUI components                   │
└──────────────┬──────────────────────┘
               │ Custom Events
               │ (window.dispatchEvent)
               ↓
┌─────────────────────────────────────┐
│          Phaser Layer               │
│  - ArenaScene.ts (game logic)       │
│  - Token rendering                  │
│  - Map loading, camera control      │
└─────────────────────────────────────┘
```

### Communication Patterns

#### React → Phaser (TYPE-SAFE)
```typescript
// GameArena.tsx
const gameEvents = wrapGameEvents(phaserGame); // Type-safe wrapper
gameEvents.emit('weaponSelected', { weapon: selectedWeapon });
```

```typescript
// ArenaScene.ts
this.events.on('weaponSelected', (data: { weapon: Equipment }) => {
  this.currentWeapon = data.weapon;
});
```

#### Phaser → React
```typescript
// ArenaScene.ts
this.events.emit('localTokenMoved', { tokenId, toX, toY });

// GameArena.tsx
gameEvents.on('localTokenMoved', (data) => {
  wsService.sendTokenMove(data.tokenId, data.toX, data.toY);
});
```

### Why Not Alternatives?
- **React-based game engine:** Poor performance for 60 FPS rendering
- **Phaser-only UI:** No component library, harder to style
- **Unity WebGL:** Overkill for 2D, larger bundle size

---

## JWT Authentication in WebSocket

### Decision
Pass **JWT token in WebSocket connection headers** for authentication.

### Rationale
- **Security:** No token in URL (prevents logging in proxies)
- **Spring Security Integration:** Seamless with existing auth system
- **Standard Practice:** Used by AWS API Gateway, Auth0, etc.

### Implementation
```typescript
// Frontend
this.client = new Client({
  connectHeaders: {
    Authorization: `Bearer ${token}`,
  },
});
```

```java
// Backend: WebSocketConfig.java
@Override
public void configureClientInboundChannel(ChannelRegistration registration) {
    registration.interceptors(new ChannelInterceptor() {
        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String authToken = accessor.getFirstNativeHeader("Authorization");
                // Validate JWT and set Principal
            }
            return message;
        }
    });
}
```

### Security Benefits
✅ Token not in URL (no accidental logging)
✅ Same token used for REST + WebSocket
✅ Automatic expiration (JWT exp claim)
✅ Role-based access (GM vs Player)

### Why Not Alternatives?
- **Query parameter:** Logged by proxies/servers (security risk)
- **Cookie:** CSRF concerns, harder to manage in WebSocket
- **Custom handshake:** Reinventing the wheel

---

## No Multi-Tenancy (Session Removal)

### Decision
**Removed all session management code** - no session join/leave, no session lobbies.

### Rationale
- **Use Case Mismatch:** Single campaign, not a multi-game platform
- **User Confusion:** "Join session" step adds unnecessary friction
- **Code Complexity:** 2000+ lines removed (23% bundle size reduction)
- **Performance:** Fewer database queries, simpler state management

### Before vs After

#### Before (Overcomplicated)
```
Login → Dashboard → Session Lobby → Select Session → Join Session → Session Room → Arena
```

#### After (Simple)
```
Login → Dashboard → Select Character → Arena
```

### What Was Removed
- ❌ `GameSession` entity (session instances)
- ❌ `SessionPlayer` entity (join table)
- ❌ `GameSessionService` (session lifecycle)
- ❌ `SessionLobby.tsx` (UI for browsing sessions)
- ❌ `SessionRoom.tsx` (waiting room before game)
- ❌ `/sessions` API endpoints

### What Replaced It
- ✅ **Single GameState** (singleton pattern)
- ✅ **Direct arena access** (no joining step)
- ✅ **Session notes** (wiki entries for historical records)

### Migration Notes
- Old session data remains in database (harmless, unused)
- No breaking changes for existing users
- Future: Add session notes as wiki feature (historical journal entries, NOT game instances)

### References
- [SIMPLIFIED_ARCHITECTURE.md](./SIMPLIFIED_ARCHITECTURE.md) - Full migration details
- [NEXT_SESSION.md](./NEXT_SESSION.md) - Current development status

---

## Summary: Why These Decisions?

All architectural choices optimize for:
1. **Single-campaign use case** (not multi-tenant platform)
2. **Industry-standard patterns** (Spring WebSocket, STOMP, JWT)
3. **Separation of concerns** (Phaser for game, React for UI)
4. **Simplicity and maintainability** (fewer abstractions, less code)
5. **Performance** (WebSocket for real-time, database for persistence)

**Rule of Thumb:** If adding a feature requires "session management" or "multi-tenancy", you're probably overcomplicating it. Keep it simple.

---

## References & Further Reading

- **Spring WebSocket:** https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#websocket
- **STOMP Protocol:** https://stomp.github.io/
- **Phaser 3:** https://photonstorm.github.io/phaser3-docs/
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725
- **Game Server Architecture:** https://www.gabrielgambetta.com/client-server-game-architecture.html