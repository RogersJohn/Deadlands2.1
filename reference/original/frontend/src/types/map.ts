/**
 * TypeScript types for AI-generated battle maps
 */

export interface MapGenerationRequest {
  locationType: string; // "wilderness", "town", "interior", "mine", "fort"
  size: string; // "small", "medium", "large"
  theme?: string; // "combat", "chase", "ambush", "siege", "exploration"
  features?: string[]; // ["water", "buildings", "cover", "elevation"]
  description?: string; // Additional GM requirements
  generateImage?: boolean; // Whether to generate background artwork (default: true)
}

export interface GeneratedMap {
  name: string;
  description: string;
  size: MapSize;
  terrain: TerrainGroup[];
  buildings: Building[];
  npcs: NPC[];
  cover: CoverObject[];
  imageUrl?: string; // Base64 or external URL to background image
  imagePrompt?: string; // The prompt used to generate the image
}

export interface MapSize {
  width: number;
  height: number;
}

export interface TerrainGroup {
  type: string; // "dirt", "rocks", "water", "grass", "wood_floor", etc.
  area: TerrainArea; // Rectangular area
}

export interface TerrainArea {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Building {
  name: string;
  type: string; // "saloon", "house", "barn", "mine", "fort"
  position: Position;
  size: Size;
  wallTerrain: string;
  floorTerrain: string;
  entrances: Entrance[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Entrance {
  x: number;
  y: number;
  direction: string; // "north", "south", "east", "west"
}

export interface NPC {
  name: string;
  position: Position;
  personality: string;
}

export interface CoverObject {
  type: string; // "barrel", "crate", "wagon", "fence"
  position: Position;
  coverBonus: number; // 2, 4, 6
  size: string; // "small", "medium", "large"
}
