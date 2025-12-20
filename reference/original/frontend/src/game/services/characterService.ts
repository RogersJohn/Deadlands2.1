import api from '../../services/api';
import { GameCharacter, Equipment, Skill, Edge } from '../types/GameTypes';

interface EquipmentDTO {
  id: number;
  name: string;
  description?: string;
  type: string;
  quantity: number;
  damage?: string;
  range?: string;
  rof?: number;
  shots?: number;
  isEquipped: boolean;
}

interface SkillDTO {
  id: number;
  name: string;
  dieValue: string;
}

interface EdgeDTO {
  id: number;
  name: string;
  description?: string;
}

interface CharacterDTO {
  id: number;
  name: string;
  occupation: string;
  pace: number;
  parry: number;
  toughness: number;
  agilityDie: string;
  smartsDie: string;
  spiritDie: string;
  strengthDie: string;
  vigorDie: string;
  characterImageUrl?: string;
  isNpc: boolean;
  playerName?: string;
  equipment?: EquipmentDTO[];
  skills?: SkillDTO[];
  edges?: EdgeDTO[];
}

export const characterService = {
  async fetchCharacters(): Promise<GameCharacter[]> {
    try {
      const response = await api.get<CharacterDTO[]>('/characters');

      // Map DTO to GameCharacter
      return response.data
        .filter(char => !char.isNpc) // Only show player characters
        .map(char => {
          // Fix image URLs - ensure they point to backend static resources
          let imageUrl = char.characterImageUrl;
          if (imageUrl && !imageUrl.startsWith('http')) {
            // If relative URL, prepend backend URL (static resources are served under /api context path)
            const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8082/api';
            imageUrl = `${backendBaseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
            console.log(`[${char.name}] Original: ${char.characterImageUrl} -> Constructed: ${imageUrl}`);
          } else {
            console.log(`[${char.name}] Using original URL: ${imageUrl}`);
          }

          return {
            id: char.id,
            name: char.name,
            agilityDie: char.agilityDie || '1d4',
            smartsDie: char.smartsDie || '1d4',
            spiritDie: char.spiritDie || '1d4',
            strengthDie: char.strengthDie || '1d4',
            vigorDie: char.vigorDie || '1d4',
            parry: char.parry || 2,
            toughness: char.toughness || 2,
            pace: char.pace || 6,
            characterImageUrl: imageUrl,
            equipment: char.equipment || [],
            skills: char.skills || [],
            edges: char.edges || [],
          };
        });
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      throw error;
    }
  },
};
