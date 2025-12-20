import api from './api';

/**
 * Initiative entry from the backend
 */
export interface InitiativeEntry {
  characterId: number | null;
  characterName: string;
  isPlayer: boolean;
  cardSuit: string | null;
  cardValue: string;
  isJoker: boolean;
  isRedJoker: boolean;
  sortValue: number;
  hasActed: boolean;
  isActive: boolean;
}

/**
 * Combat state response from the backend
 */
export interface CombatState {
  roundNumber: number;
  combatActive: boolean;
  activeCharacterId: number | null;
  activeCharacterName: string | null;
  initiativeOrder: InitiativeEntry[];
  jokerDealt: boolean;
  message: string | null;
}

/**
 * Request to start combat
 */
export interface StartCombatRequest {
  playerCharacterIds: number[];
  npcNames: string[];
}

/**
 * Combat service for managing Savage Worlds initiative and turn order
 */
export const combatService = {
  /**
   * Get the current combat state including initiative order
   */
  async getCombatState(): Promise<CombatState> {
    const response = await api.get<CombatState>('/game/combat/state');
    return response.data;
  },

  /**
   * Start combat with specified characters (GM only)
   */
  async startCombat(playerCharacterIds: number[], npcNames: string[] = []): Promise<CombatState> {
    const response = await api.post<CombatState>('/game/combat/start', {
      playerCharacterIds,
      npcNames,
    });
    return response.data;
  },

  /**
   * End combat entirely (GM only)
   */
  async endCombat(): Promise<CombatState> {
    const response = await api.post<CombatState>('/game/combat/end');
    return response.data;
  },

  /**
   * End the current character's turn
   */
  async endTurn(characterId?: number): Promise<CombatState> {
    const response = await api.post<CombatState>('/game/combat/end-turn', {
      characterId,
    });
    return response.data;
  },

  /**
   * Force start a new round (GM only, normally auto-advances)
   */
  async newRound(): Promise<CombatState> {
    const response = await api.post<CombatState>('/game/combat/new-round');
    return response.data;
  },

  /**
   * Add a combatant mid-combat (GM only)
   */
  async addCombatant(characterId?: number, npcName?: string): Promise<CombatState> {
    const response = await api.post<CombatState>('/game/combat/add-combatant', {
      characterId,
      npcName,
    });
    return response.data;
  },

  /**
   * Remove a combatant from combat (GM only)
   */
  async removeCombatant(characterId?: number, npcName?: string): Promise<CombatState> {
    const response = await api.post<CombatState>('/game/combat/remove-combatant', {
      characterId,
      npcName,
    });
    return response.data;
  },
};

export default combatService;
