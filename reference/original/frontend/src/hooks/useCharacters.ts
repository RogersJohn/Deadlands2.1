import { useQuery } from '@tanstack/react-query';
import { characterService } from '../game/services/characterService';
import { GameCharacter } from '../game/types/GameTypes';

/**
 * React Query hook to fetch all characters for the current user.
 *
 * Features:
 * - Automatic caching (stale for 5 minutes)
 * - Automatic refetching on window focus
 * - Loading and error states
 * - Type-safe return value
 *
 * @returns Query result with characters data, loading state, and error
 */
export const useCharacters = () => {
  return useQuery<GameCharacter[], Error>({
    queryKey: ['characters'],
    queryFn: () => characterService.fetchCharacters(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
};

/**
 * React Query hook to fetch a single character by ID.
 *
 * @param characterId The character ID to fetch
 * @returns Query result with character data, loading state, and error
 */
export const useCharacter = (characterId: number | null) => {
  return useQuery<GameCharacter, Error>({
    queryKey: ['character', characterId],
    queryFn: () => characterService.fetchCharacterById(characterId!),
    enabled: characterId !== null, // Only run query if characterId is provided
    staleTime: 5 * 60 * 1000,
  });
};
