# State Management Guide

**Last Updated:** 2025-11-22
**Purpose:** Decision tree for choosing the right state management approach

---

## Table of Contents
1. [State Management Overview](#state-management-overview)
2. [When to Use Zustand](#when-to-use-zustand)
3. [When to Use React Query](#when-to-use-react-query)
4. [When to Use React State (useState)](#when-to-use-react-state-usestate)
5. [When to Use WebSocket State](#when-to-use-websocket-state)
6. [Current Stores](#current-stores)
7. [Migration Guide](#migration-guide)

---

## State Management Overview

We use **four state management approaches** depending on the data type:

| Approach | Use Case | Example |
|----------|----------|---------|
| **Zustand** | Global app state shared across components | Auth, selected character, game settings |
| **React Query** | Server data with caching (REST API) | Character lists, game state, wiki entries |
| **React State** | Local component-only state | Form inputs, dialog open/closed, UI toggles |
| **WebSocket** | Real-time multiplayer events | Token movements, player join/leave |

---

## When to Use Zustand

**Use Case:** Global application state that **doesn't come from a server** or needs to persist across component unmounts.

### ✅ Use Zustand For:
- **Authentication state** (`token`, `user`, `isAuthenticated`)
- **Selected character** (chosen in CharacterSelect, used in GameArena)
- **UI preferences** (`darkMode`, `soundEnabled`, `volumeLevel`)
- **Game settings** (`showCoordinates`, `cameraFollow`, `gridSize`)
- **Active WebSocket connection** (connection status, reconnect attempts)

### ❌ Don't Use Zustand For:
- ❌ Server data (use React Query instead)
- ❌ Component-only state (use useState instead)
- ❌ Real-time updates from WebSocket (use custom events instead)

### Example: Selected Character Store

```typescript
// frontend/src/store/gameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameCharacter } from '../game/types/GameTypes';

interface GameStore {
  selectedCharacter: GameCharacter | null;
  setSelectedCharacter: (character: GameCharacter | null) => void;

  showCoordinates: boolean;
  toggleCoordinates: () => void;

  cameraFollow: boolean;
  setCameraFollow: (enabled: boolean) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      // Selected character
      selectedCharacter: null,
      setSelectedCharacter: (character) => set({ selectedCharacter: character }),

      // UI settings
      showCoordinates: true,
      toggleCoordinates: () => set((state) => ({ showCoordinates: !state.showCoordinates })),

      cameraFollow: true,
      setCameraFollow: (enabled) => set({ cameraFollow: enabled }),
    }),
    {
      name: 'game-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        showCoordinates: state.showCoordinates,
        cameraFollow: state.cameraFollow,
        // Don't persist selectedCharacter (user should re-select)
      }),
    }
  )
);
```

### Usage in Components

```typescript
// Read state
const { selectedCharacter, showCoordinates } = useGameStore();

// Update state
const { setSelectedCharacter, toggleCoordinates } = useGameStore();

setSelectedCharacter(character);
toggleCoordinates();
```

---

## When to Use React Query

**Use Case:** Data that comes from a **REST API** and benefits from caching, automatic refetching, and loading states.

### ✅ Use React Query For:
- **Fetching character lists** (`GET /api/characters`)
- **Loading game state** (`GET /api/game/state`)
- **Wiki entries** (`GET /api/wiki`)
- **Reference data** (`GET /api/reference/skills`)
- **Any GET request** that should be cached

### ❌ Don't Use React Query For:
- ❌ Global UI state (use Zustand)
- ❌ Real-time updates (use WebSocket)
- ❌ Mutations without refetching (use fetch directly)

### Example: Characters Query

```typescript
// frontend/src/hooks/useCharacters.ts
import { useQuery } from '@tanstack/react-query';
import { characterService } from '../services/characterService';

export const useCharacters = () => {
  return useQuery({
    queryKey: ['characters'],
    queryFn: () => characterService.fetchCharacters(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
};
```

### Usage in Components

```typescript
// frontend/src/components/CharacterSelect.tsx
const { data: characters, isLoading, error } = useCharacters();

if (isLoading) return <CircularProgress />;
if (error) return <Alert severity="error">Failed to load characters</Alert>;

return (
  <Grid container>
    {characters?.map((character) => (
      <CharacterCard key={character.id} character={character} />
    ))}
  </Grid>
);
```

### Mutations with Refetching

```typescript
// frontend/src/hooks/useCreateCharacter.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreateCharacter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (characterData) => characterService.createCharacter(characterData),
    onSuccess: () => {
      // Invalidate and refetch characters list
      queryClient.invalidateQueries({ queryKey: ['characters'] });
    },
  });
};

// Usage
const createCharacter = useCreateCharacter();

await createCharacter.mutateAsync(newCharacterData);
```

---

## When to Use React State (useState)

**Use Case:** State that is **local to a single component** and doesn't need to be shared.

### ✅ Use React State For:
- **Form inputs** (`name`, `email`, `password`)
- **Dialog open/closed** (`open`, `setOpen`)
- **Accordion expanded/collapsed** (`expanded`, `setExpanded`)
- **Temporary UI state** (hover, focus, selected tab index)
- **Component-specific flags** (`isEditing`, `showDetails`)

### ❌ Don't Use React State For:
- ❌ Data shared across multiple components (use Zustand)
- ❌ Server data (use React Query)
- ❌ Complex state logic (consider useReducer)

### Example: Dialog Component

```typescript
const [dialogOpen, setDialogOpen] = useState(false);
const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

return (
  <>
    <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>

    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
      <DialogTitle>Select Target</DialogTitle>
      <DialogContent>
        {/* Dialog content */}
      </DialogContent>
    </Dialog>
  </>
);
```

---

## When to Use WebSocket State

**Use Case:** Real-time updates that are **pushed from the server** to all connected clients.

### ✅ Use WebSocket For:
- **Token movements** (player/enemy position changes)
- **Player join/leave** events
- **Dice rolls** (broadcast to all players)
- **GM announcements** (broadcast messages)
- **Turn changes** (combat round progression)

### ❌ Don't Use WebSocket For:
- ❌ Initial data loading (use React Query)
- ❌ UI state (use Zustand or useState)
- ❌ One-time requests (use fetch/axios)

### WebSocket Flow

1. **Connect on mount** (pass JWT token in headers)
2. **Subscribe to topics** (`/topic/game/moves`, `/topic/game/players`)
3. **Dispatch custom events** to window (for React to listen)
4. **Cleanup on unmount** (unsubscribe, disconnect)

### Example: WebSocket Hook

```typescript
// frontend/src/hooks/useGameWebSocket.ts
import { useEffect } from 'react';
import { getWebSocketService } from '../services/websocketService';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

export const useGameWebSocket = (gameEvents: TypedGameEvents | null) => {
  const { token } = useAuthStore();
  const { selectedCharacter } = useGameStore();

  useEffect(() => {
    if (!token || !selectedCharacter || !gameEvents) {
      return;
    }

    const wsService = getWebSocketService();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

    console.log('[useGameWebSocket] Connecting...');

    wsService.connect(apiUrl, token)
      .then(() => {
        console.log('[useGameWebSocket] Connected');

        // Listen for LOCAL moves from Phaser
        const handleLocalMove = (data: any) => {
          wsService.sendTokenMove(
            data.tokenId,
            data.tokenType,
            data.fromX,
            data.fromY,
            data.toX,
            data.toY
          );
        };

        // Listen for REMOTE moves from server
        const handleRemoteMove = (event: Event) => {
          const customEvent = event as CustomEvent;
          const moveData = customEvent.detail;

          // Don't echo our own moves
          if (moveData.tokenId !== String(selectedCharacter.id)) {
            gameEvents.emit('remoteTokenMoved', moveData);
          }
        };

        gameEvents.on('localTokenMoved', handleLocalMove);
        window.addEventListener('remoteTokenMoved', handleRemoteMove);

        // Cleanup
        return () => {
          gameEvents.off('localTokenMoved', handleLocalMove);
          window.removeEventListener('remoteTokenMoved', handleRemoteMove);
          wsService.disconnect();
        };
      })
      .catch((error) => {
        console.error('[useGameWebSocket] Connection failed:', error);
      });
  }, [token, selectedCharacter, gameEvents]);
};
```

---

## Current Stores

### `authStore.ts`
**Purpose:** User authentication and authorization

**State:**
- `token: string | null` - JWT token
- `user: User | null` - Current user object
- `isAuthenticated: boolean` - Computed from token

**Actions:**
- `login(token, user)` - Set auth state
- `logout()` - Clear auth state

### `gameStore.ts` (NEW - to be created)
**Purpose:** Game-specific global state

**State:**
- `selectedCharacter: GameCharacter | null` - Character selected in CharacterSelect
- `showCoordinates: boolean` - Show grid coordinates on map
- `cameraFollow: boolean` - Camera follows player token
- `soundEnabled: boolean` - Sound effects enabled
- `volume: number` - Sound volume (0-100)

**Actions:**
- `setSelectedCharacter(character)` - Set selected character
- `toggleCoordinates()` - Toggle coordinate display
- `setCameraFollow(enabled)` - Enable/disable camera follow
- `setVolume(volume)` - Set sound volume

---

## Migration Guide

### Before: Multiple useState Calls

```typescript
// ❌ Bad: Too much component state
const [selectedCharacter, setSelectedCharacter] = useState<GameCharacter | null>(null);
const [showCoordinates, setShowCoordinates] = useState(true);
const [cameraFollow, setCameraFollow] = useState(true);
const [loading, setLoading] = useState(true);
const [characters, setCharacters] = useState<GameCharacter[]>([]);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const loadCharacters = async () => {
    try {
      setLoading(true);
      const data = await characterService.fetchCharacters();
      setCharacters(data);
    } catch (err) {
      setError('Failed to load characters');
    } finally {
      setLoading(false);
    }
  };
  loadCharacters();
}, []);
```

### After: Zustand + React Query

```typescript
// ✅ Good: Global state in Zustand, server data in React Query
const { selectedCharacter, setSelectedCharacter, showCoordinates, cameraFollow } = useGameStore();
const { data: characters, isLoading, error } = useCharacters();

// No useEffect needed - React Query handles fetching
```

### Benefits
- **Less code** (50% fewer lines)
- **Automatic caching** (no redundant fetches)
- **Better UX** (loading/error states built-in)
- **Easier testing** (mock React Query, mock Zustand stores)

---

## Decision Tree

```
┌─ Does this data come from a REST API?
│
├─ YES → Use React Query
│   └─ Example: Character list, wiki entries, game state
│
└─ NO
    │
    ├─ Is it shared across multiple components?
    │  │
    │  ├─ YES → Use Zustand
    │  │   └─ Example: Selected character, auth state, UI preferences
    │  │
    │  └─ NO → Use React State (useState)
    │      └─ Example: Form inputs, dialog open/closed
    │
    └─ Is it real-time from server?
        │
        └─ YES → Use WebSocket + Custom Events
            └─ Example: Token movements, player join/leave
```

---

## Quick Reference

| State Type | Tool | Persists? | Shared? | Example |
|------------|------|-----------|---------|---------|
| **Auth** | Zustand | Yes (localStorage) | Global | `token`, `user` |
| **Selected Character** | Zustand | No | Global | `selectedCharacter` |
| **Server Data** | React Query | Yes (cache) | Per-query | `characters`, `gameState` |
| **Form Input** | useState | No | Local | `name`, `email` |
| **Dialog State** | useState | No | Local | `open`, `expanded` |
| **Real-time Events** | WebSocket | No | Global | Token moves, dice rolls |

---

## See Also
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) - Why we chose these patterns
- [COMMON_PATTERNS.md](./COMMON_PATTERNS.md) - How to implement features
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)
