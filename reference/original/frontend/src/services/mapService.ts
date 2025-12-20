import api from './api';

/**
 * Service for Battle Map API
 * Handles saving, loading, and managing reusable battle maps
 */

export interface SaveMapRequest {
  name: string;
  description?: string;
  widthTiles: number;
  heightTiles: number;
  imageData?: string;
  imageUrl?: string;
  generationPrompt?: string;
  mapData: string; // JSON string
  wallsData?: string; // JSON string
  coverData?: string; // JSON string
  spawnPointsData?: string; // JSON string
  visibility: 'PRIVATE' | 'CAMPAIGN' | 'PUBLIC';
  tags?: string;
  type: 'TOWN_STREET' | 'WILDERNESS' | 'INTERIOR' | 'MINE' | 'FORT' | 'CUSTOM';
  theme?: 'COMBAT' | 'CHASE' | 'AMBUSH' | 'SIEGE' | 'EXPLORATION';
}

export interface BattleMapDTO {
  id: number;
  name: string;
  description?: string;
  widthTiles: number;
  heightTiles: number;
  thumbnailUrl?: string;
  visibility: string;
  tags?: string;
  type: string;
  theme?: string;
  createdByUsername?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BattleMapDetailDTO extends BattleMapDTO {
  imageData?: string;
  imageUrl?: string;
  generationPrompt?: string;
  mapData: string;
  wallsData?: string;
  coverData?: string;
  spawnPointsData?: string;
  createdByUserId?: number;
}

const mapService = {
  /**
   * Save a generated map to database
   * @param request Map data to save
   * @returns Saved map with ID
   */
  saveMap: async (request: SaveMapRequest): Promise<BattleMapDetailDTO> => {
    const response = await api.post('/ai-gm/maps/save', request);
    return response.data;
  },

  /**
   * Get current user's saved maps
   * @returns List of lightweight map DTOs
   */
  getMyMaps: async (): Promise<BattleMapDTO[]> => {
    const response = await api.get('/ai-gm/maps/my-maps');
    return response.data;
  },

  /**
   * Get public map library
   * @param tag Optional tag filter
   * @returns List of public maps
   */
  getPublicMaps: async (tag?: string): Promise<BattleMapDTO[]> => {
    const params = tag ? { tag } : {};
    const response = await api.get('/ai-gm/maps/library', { params });
    return response.data;
  },

  /**
   * Get specific map with full data
   * @param id Map ID
   * @returns Full map with image data
   */
  getMap: async (id: number): Promise<BattleMapDetailDTO> => {
    const response = await api.get(`/ai-gm/maps/${id}`);
    return response.data;
  },

  /**
   * Delete a map (owner only)
   * @param id Map ID
   */
  deleteMap: async (id: number): Promise<void> => {
    await api.delete(`/ai-gm/maps/${id}`);
  },
};

export default mapService;
