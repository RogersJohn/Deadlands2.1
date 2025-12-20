import api from './api';
import {
  NPCDialogueRequest,
  EncounterRequest,
  RuleLookupRequest,
  LocationRequest,
  AIResponse,
} from '../types/ai';
import { MapGenerationRequest, GeneratedMap } from '../types/map';

/**
 * Service for AI Game Master Assistant API
 */
const aiService = {
  /**
   * Generate NPC dialogue
   */
  generateNPCDialogue: async (request: NPCDialogueRequest): Promise<AIResponse> => {
    const response = await api.post('/ai-gm/npc-dialogue', request);
    return response.data;
  },

  /**
   * Generate random encounter (GM only)
   */
  generateEncounter: async (request: EncounterRequest): Promise<AIResponse> => {
    const response = await api.post('/ai-gm/generate-encounter', request);
    return response.data;
  },

  /**
   * Look up game rule
   */
  lookupRule: async (request: RuleLookupRequest): Promise<AIResponse> => {
    const response = await api.post('/ai-gm/rule-lookup', request);
    return response.data;
  },

  /**
   * Generate location (GM only)
   */
  generateLocation: async (request: LocationRequest): Promise<AIResponse> => {
    const response = await api.post('/ai-gm/generate-location', request);
    return response.data;
  },

  /**
   * Get GM suggestion (GM only)
   */
  getGMSuggestion: async (situation: string): Promise<AIResponse> => {
    const response = await api.post('/ai-gm/gm-suggestion', situation, {
      headers: { 'Content-Type': 'text/plain' },
    });
    return response.data;
  },

  /**
   * Generate tactical battle map (GM only)
   */
  generateMap: async (request: MapGenerationRequest): Promise<GeneratedMap> => {
    const response = await api.post('/ai-gm/generate-map', request);
    // Parse the JSON response from AIResponse wrapper
    const mapData = JSON.parse(response.data.content);
    return mapData;
  },

  /**
   * Health check
   */
  healthCheck: async (): Promise<boolean> => {
    try {
      await api.get('/ai-gm/health');
      return true;
    } catch (error) {
      return false;
    }
  },
};

export default aiService;
