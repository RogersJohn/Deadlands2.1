import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameCharacter } from '../game/types/GameTypes';

interface GameState {
  // Selected character for arena
  selectedCharacter: GameCharacter | null;
  setSelectedCharacter: (character: GameCharacter | null) => void;

  // UI preferences
  showCoordinates: boolean;
  toggleCoordinates: () => void;

  cameraFollow: boolean;
  setCameraFollow: (enabled: boolean) => void;

  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  volume: number;
  setVolume: (volume: number) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      // Selected character (not persisted - user must re-select on each page visit)
      selectedCharacter: null,
      setSelectedCharacter: (character) => set({ selectedCharacter: character }),

      // UI preferences (persisted to localStorage)
      showCoordinates: true,
      toggleCoordinates: () => set((state) => ({ showCoordinates: !state.showCoordinates })),

      cameraFollow: true,
      setCameraFollow: (enabled) => set({ cameraFollow: enabled }),

      soundEnabled: true,
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

      volume: 50,
      setVolume: (volume) => set({ volume }),
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        // Only persist UI preferences, not selectedCharacter
        showCoordinates: state.showCoordinates,
        cameraFollow: state.cameraFollow,
        soundEnabled: state.soundEnabled,
        volume: state.volume,
      }),
    }
  )
);
