# Common Patterns

**Last Updated:** 2025-11-22
**Purpose:** Quick reference for implementing common features in the Deadlands Campaign Manager

---

## Table of Contents
1. [Adding New WebSocket Events](#adding-new-websocket-events)
2. [Adding New Game State Properties](#adding-new-game-state-properties)
3. [Connecting React → Phaser](#connecting-react--phaser)
4. [Adding New API Endpoints](#adding-new-api-endpoints)
5. [Adding New Character Properties](#adding-new-character-properties)

---

## Adding New WebSocket Events

Follow this pattern to add real-time features (e.g., dice rolls, chat messages, GM broadcasts).

### Step 1: Define DTO (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/dto/DiceRollEvent.java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class DiceRollEvent {
    private String characterId;
    private String characterName;
    private String rollType; // "attack", "damage", "skill_check"
    private int result;
    private long timestamp;
}
```

### Step 2: Add Controller Endpoint (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/controller/GameController.java

@MessageMapping("/game/dice-roll")
@SendTo("/topic/game/dice-rolls")
public DiceRollEvent handleDiceRoll(DiceRollEvent event, Principal principal) {
    String username = principal.getName();

    logger.info("[GameController] Dice roll from {}: {} rolled {}",
                username, event.getRollType(), event.getResult());

    // Validate if needed
    // Persist to database if needed

    event.setTimestamp(System.currentTimeMillis());
    return event;
}
```

### Step 3: Update WebSocket Service (Frontend)

```typescript
// frontend/src/services/websocketService.ts

// Add subscription in subscribeToGameEvents()
this.client.subscribe('/topic/game/dice-rolls', (message: IMessage) => {
  try {
    const event = JSON.parse(message.body);
    console.log('[WebSocket] Received dice roll:', event);

    // Dispatch to window for React components to listen
    window.dispatchEvent(
      new CustomEvent('diceRollReceived', { detail: event })
    );
  } catch (error) {
    console.error('[WebSocket] Failed to parse dice roll:', error);
  }
});

// Add send method
sendDiceRoll(characterId: string, characterName: string, rollType: string, result: number) {
  if (!this.client || !this.connected) {
    console.warn('[WebSocket] Cannot send dice roll - not connected');
    return;
  }

  this.client.publish({
    destination: '/app/game/dice-roll',
    body: JSON.stringify({ characterId, characterName, rollType, result }),
  });
}
```

### Step 4: Listen in React Component (Frontend)

```typescript
// frontend/src/game/GameArena.tsx

useEffect(() => {
  const handleDiceRoll = (event: Event) => {
    const customEvent = event as CustomEvent;
    const rollData = customEvent.detail;

    console.log('Remote dice roll:', rollData);
    // Update UI, show notification, etc.
  };

  window.addEventListener('diceRollReceived', handleDiceRoll);

  return () => {
    window.removeEventListener('diceRollReceived', handleDiceRoll);
  };
}, []);
```

---

## Adding New Game State Properties

Follow this pattern to add persistent global state (e.g., weather, time of day, active scenario).

### Step 1: Update Entity (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/model/GameState.java

@Entity
@Table(name = "game_state")
@Data
@Builder
public class GameState {
    // ... existing fields ...

    @Column(name = "weather")
    private String weather; // "clear", "rain", "storm", "fog"

    @Column(name = "time_of_day")
    private String timeOfDay; // "dawn", "day", "dusk", "night"
}
```

### Step 2: Add Service Method (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/service/GameStateService.java

@Transactional
public void updateWeather(String weather) {
    GameState gameState = getOrCreateGameState();
    gameState.setWeather(weather);
    gameState.setLastActivity(LocalDateTime.now());
    gameStateRepository.save(gameState);

    logger.info("[GameStateService] Weather changed to: {}", weather);
}

public Optional<String> getCurrentWeather() {
    GameState gameState = getOrCreateGameState();
    return Optional.ofNullable(gameState.getWeather());
}
```

### Step 3: Add REST Endpoint (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/controller/GameStateController.java

@PostMapping("/weather/change")
@PreAuthorize("hasRole('GAME_MASTER')")
public ResponseEntity<Map<String, String>> changeWeather(@RequestBody Map<String, String> request) {
    String newWeather = request.get("weather");

    if (newWeather == null) {
        return ResponseEntity.badRequest().build();
    }

    gameStateService.updateWeather(newWeather);

    return ResponseEntity.ok(Map.of("weather", newWeather));
}
```

### Step 4: Update DTO to Include New Field (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/dto/GameStateResponse.java

@Data
@Builder
public class GameStateResponse {
    // ... existing fields ...

    private String weather;
    private String timeOfDay;
}
```

### Step 5: Use in Frontend (Frontend)

```typescript
// frontend/src/game/components/GMControlPanel.tsx

const handleWeatherChange = async (newWeather: string) => {
  const response = await fetch(`${apiUrl}/game/weather/change`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ weather: newWeather }),
  });

  if (response.ok) {
    console.log('Weather changed to:', newWeather);
  }
};
```

---

## Connecting React → Phaser

Use the **type-safe event system** to send data from React components to Phaser game engine.

### Step 1: Define Event Type (Frontend)

```typescript
// frontend/src/game/events/GameEvents.ts

export interface GameEventMap {
  // ... existing events ...

  illuminationChange: { level: Illumination };
  weatherChange: { weather: string };
}
```

### Step 2: Emit from React (Frontend)

```typescript
// frontend/src/game/GameArena.tsx

const [weather, setWeather] = useState<string>('clear');

useEffect(() => {
  if (gameEvents) {
    console.log('Emitting weather to Phaser:', weather);
    gameEvents.emit('weatherChange', { weather });
  }
}, [gameEvents, weather]);
```

### Step 3: Listen in Phaser (Frontend)

```typescript
// frontend/src/game/scenes/ArenaScene.ts

create() {
  // ... existing setup ...

  this.events.on('weatherChange', (data: { weather: string }) => {
    this.applyWeatherEffect(data.weather);
  });
}

private applyWeatherEffect(weather: string) {
  // Update fog overlay, lighting, particle effects, etc.
  console.log('Applying weather effect:', weather);
}
```

### Connecting Phaser → React

```typescript
// Phaser Scene
this.events.emit('playerHealthChanged', { health: 50, maxHealth: 100 });

// React Component
useEffect(() => {
  const handleHealthChange = (data: any) => {
    setPlayerHealth(data.health);
    setPlayerMaxHealth(data.maxHealth);
  };

  gameEvents?.on('playerHealthChanged', handleHealthChange);

  return () => {
    gameEvents?.off('playerHealthChanged', handleHealthChange);
  };
}, [gameEvents]);
```

---

## Adding New API Endpoints

Follow Spring Boot REST conventions.

### Step 1: Create DTO (if needed)

```java
// backend/src/main/java/com/deadlands/campaign/dto/SpawnEnemyRequest.java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SpawnEnemyRequest {
    private String enemyType;
    private Integer gridX;
    private Integer gridY;
    private Integer difficulty; // 1-10
}
```

### Step 2: Add Service Method

```java
// backend/src/main/java/com/deadlands/campaign/service/GameStateService.java

@Transactional
public TokenPosition spawnEnemy(String enemyType, Integer gridX, Integer gridY, Integer difficulty) {
    String enemyId = "enemy_" + UUID.randomUUID().toString();

    return updateTokenPosition(enemyId, "ENEMY", gridX, gridY, "GM");
}
```

### Step 3: Add Controller Endpoint

```java
// backend/src/main/java/com/deadlands/campaign/controller/GameStateController.java

@PostMapping("/enemy/spawn")
@PreAuthorize("hasRole('GAME_MASTER')")
public ResponseEntity<TokenPositionDTO> spawnEnemy(@RequestBody SpawnEnemyRequest request) {
    TokenPosition enemy = gameStateService.spawnEnemy(
        request.getEnemyType(),
        request.getGridX(),
        request.getGridY(),
        request.getDifficulty()
    );

    TokenPositionDTO dto = convertToDTO(enemy);

    return ResponseEntity.ok(dto);
}
```

### Step 4: Call from Frontend

```typescript
// frontend/src/services/gameStateService.ts (NEW FILE - create if needed)

export const spawnEnemy = async (
  enemyType: string,
  gridX: number,
  gridY: number,
  difficulty: number,
  token: string
): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

  const response = await fetch(`${apiUrl}/game/enemy/spawn`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ enemyType, gridX, gridY, difficulty }),
  });

  if (!response.ok) {
    throw new Error('Failed to spawn enemy');
  }
};
```

---

## Adding New Character Properties

Follow this pattern to add new character data (e.g., ammo count, fate chips).

### Step 1: Update Entity (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/model/Character.java

@Entity
@Table(name = "characters")
@Data
public class Character {
    // ... existing fields ...

    @Column(name = "fate_chips")
    private Integer fateChips = 0;

    @Column(name = "ammo_count")
    private Integer ammoCount = 0;
}
```

### Step 2: Update DTO (Backend)

```java
// backend/src/main/java/com/deadlands/campaign/dto/CharacterDTO.java (if exists)
// OR just return the entity directly if no DTO

@Data
public class CharacterDTO {
    // ... existing fields ...

    private Integer fateChips;
    private Integer ammoCount;
}
```

### Step 3: Update Frontend Type (Frontend)

```typescript
// frontend/src/game/types/GameTypes.ts

export interface GameCharacter {
  // ... existing fields ...

  fateChips?: number;
  ammoCount?: number;
}
```

### Step 4: Display in UI (Frontend)

```typescript
// frontend/src/game/components/ActionBar.tsx

<Box>
  <Typography>Fate Chips: {character.fateChips || 0}</Typography>
  <Typography>Ammo: {character.ammoCount || 0}</Typography>
</Box>
```

### Step 5: Update via API (Frontend)

```typescript
// frontend/src/services/characterService.ts

export const updateFateChips = async (
  characterId: number,
  fateChips: number,
  token: string
): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

  await fetch(`${apiUrl}/characters/${characterId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fateChips }),
  });
};
```

---

## Quick Reference: File Locations

### Backend
- **Controllers:** `backend/src/main/java/com/deadlands/campaign/controller/`
- **Services:** `backend/src/main/java/com/deadlands/campaign/service/`
- **Models (Entities):** `backend/src/main/java/com/deadlands/campaign/model/`
- **DTOs:** `backend/src/main/java/com/deadlands/campaign/dto/`
- **Repositories:** `backend/src/main/java/com/deadlands/campaign/repository/`

### Frontend
- **React Components:** `frontend/src/components/`
- **Game Components:** `frontend/src/game/components/`
- **Phaser Scenes:** `frontend/src/game/scenes/`
- **Services:** `frontend/src/services/`
- **Hooks:** `frontend/src/hooks/`
- **Stores (Zustand):** `frontend/src/store/`
- **Types:** `frontend/src/game/types/` or `frontend/src/types/`

---

## Common Gotchas

### 1. WebSocket Not Connecting
- Check if JWT token is valid
- Verify `/ws` endpoint is correct (no `/api` prefix)
- Check browser console for CORS errors
- Ensure Spring Security allows WebSocket connections

### 2. Phaser Events Not Firing
- Ensure `gameEvents` is not null before emitting
- Check event names match exactly (case-sensitive)
- Verify event is defined in `GameEventMap` interface
- Check Phaser scene is created before emitting

### 3. Game State Not Persisting
- Verify `@Transactional` annotation on service method
- Check database constraints (foreign keys, not null)
- Ensure entity has `@Entity` and `@Table` annotations
- Check JPA repository extends `JpaRepository`

### 4. API Endpoint Returns 403
- Check `@PreAuthorize` annotation (may require GAME_MASTER role)
- Verify JWT token is included in `Authorization` header
- Check SecurityConfig allows the endpoint
- Ensure user has correct role in database

---

## See Also
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) - Why we made these design choices
- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - When to use Zustand vs React state
- [NEXT_SESSION.md](./NEXT_SESSION.md) - Current development status
