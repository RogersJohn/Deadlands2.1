import Phaser from 'phaser';
import { GeneratedMap, TerrainGroup, Building, CoverObject, NPC } from '../../types/map';

/**
 * Utility for loading AI-generated maps into Phaser
 * REDESIGNED: Maps now REPLACE the entire arena (not drawn in corner)
 * Features tactical overlays: grid, walls, cover markers
 */
export class MapLoader {
  private scene: Phaser.Scene;
  private tileSize: number = 32;

  // Map layers
  private backgroundImage?: Phaser.GameObjects.Image;
  private tacticalGrid?: Phaser.GameObjects.Graphics;
  private wallHighlights?: Phaser.GameObjects.Graphics;
  private coverMarkers?: Phaser.GameObjects.Group;
  private buildingLabels?: Phaser.GameObjects.Group;
  private npcMarkers?: Phaser.GameObjects.Group;

  // Overlay visibility flags
  private gridVisible: boolean = true;
  private wallsVisible: boolean = true;
  private coverVisible: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Load map and REPLACE the entire arena (PRIMARY METHOD)
   * HYBRID APPROACH: Programmatic drawing with optional AI textures
   * @param mapData The generated map data from AI
   */
  async loadMapAsArena(mapData: GeneratedMap): Promise<void> {
    console.log('Loading map as arena (HYBRID RENDERING):', mapData.name);

    // Step 1: Clear entire arena (not just map layers)
    this.clearEntireArena();

    // Step 2: Set new world bounds to match map size
    const mapWidth = mapData.size.width * this.tileSize;
    const mapHeight = mapData.size.height * this.tileSize;
    this.scene.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    console.log(`Arena resized to: ${mapWidth}x${mapHeight} pixels`);

    // Step 3: Draw procedural background (terrain + buildings + cover)
    this.drawProceduralBackground(mapData);

    // Step 4: Create tactical grid overlay
    this.createTacticalGrid(mapData.size.width, mapData.size.height);

    // Step 5: Highlight walls/obstacles from buildings
    const walls = this.extractWallsFromBuildings(mapData.buildings);
    if (walls.length > 0) {
      this.highlightWalls(walls);
    }

    // Step 6: Mark cover positions
    if (mapData.cover && mapData.cover.length > 0) {
      this.markCover(mapData.cover);
    }

    // Step 7: Add building labels (optional)
    if (mapData.buildings && mapData.buildings.length > 0) {
      this.addBuildingLabels(mapData.buildings);
    }

    // Step 8: Move player to spawn point (center of map by default)
    this.movePlayerToSpawn(mapData.size.width, mapData.size.height);

    // Step 9: Center camera on map
    this.centerCameraOnMap(mapData.size.width, mapData.size.height);

    console.log(`Arena replaced with procedural map: ${mapWidth}x${mapHeight} pixels`);
  }

  /**
   * Legacy method: Load map without replacing arena
   * @deprecated Use loadMapAsArena() instead
   */
  async loadMap(mapData: GeneratedMap): Promise<void> {
    console.warn('loadMap() is deprecated, use loadMapAsArena() instead');
    return this.loadMapAsArena(mapData);
  }

  /**
   * HYBRID RENDERING: Draw map programmatically from tactical data
   * Renders terrain, buildings, and cover as geometric shapes
   */
  private drawProceduralBackground(mapData: GeneratedMap): void {
    console.log('Drawing procedural background from map data...');

    const graphics = this.scene.add.graphics();
    graphics.setDepth(-100); // Behind everything
    this.backgroundImage = graphics as any; // Store for later cleanup

    // Step 1: Draw base terrain (grass, dirt, etc.)
    this.drawTerrain(graphics, mapData);

    // Step 2: Draw buildings (walls, floors, entrances)
    this.drawBuildings(graphics, mapData.buildings);

    // Step 3: Draw cover objects (barrels, crates, wagons)
    this.drawCoverObjects(graphics, mapData.cover);

    console.log('Procedural background rendering complete');
  }

  /**
   * Draw terrain areas with appropriate colors/patterns
   */
  private drawTerrain(graphics: Phaser.GameObjects.Graphics, mapData: GeneratedMap): void {
    const mapWidth = mapData.size.width * this.tileSize;
    const mapHeight = mapData.size.height * this.tileSize;

    // Default base terrain (dirt/ground)
    graphics.fillStyle(0x8B7355, 1.0); // Sandy brown
    graphics.fillRect(0, 0, mapWidth, mapHeight);

    // Draw each terrain group
    mapData.terrain.forEach(terrainGroup => {
      const color = this.getTerrainColor(terrainGroup.type);
      const x1 = terrainGroup.area.x1 * this.tileSize;
      const y1 = terrainGroup.area.y1 * this.tileSize;
      const x2 = terrainGroup.area.x2 * this.tileSize;
      const y2 = terrainGroup.area.y2 * this.tileSize;

      graphics.fillStyle(color, 1.0);
      graphics.fillRect(x1, y1, x2 - x1, y2 - y1);

      // Add texture/pattern for variety
      this.addTerrainPattern(graphics, terrainGroup.type, x1, y1, x2, y2);
    });
  }

  /**
   * Get color for terrain type
   */
  private getTerrainColor(terrainType: string): number {
    const terrainColors: Record<string, number> = {
      'grass': 0x5A7F3C,      // Dark green
      'dirt': 0x8B7355,       // Sandy brown
      'sand': 0xD2B48C,       // Tan
      'stone': 0x696969,      // Dim gray
      'rocks': 0x4A4A4A,      // Dark gray
      'water': 0x4682B4,      // Steel blue
      'wood_floor': 0x8B6914, // Dark goldenrod (wood)
      'mud': 0x6B4423,        // Dark brown
      'gravel': 0x999999,     // Light gray
    };
    return terrainColors[terrainType] || 0x8B7355; // Default to dirt
  }

  /**
   * Add simple pattern/texture to terrain for visual variety
   */
  private addTerrainPattern(graphics: Phaser.GameObjects.Graphics, type: string, x1: number, y1: number, x2: number, y2: number): void {
    // Add subtle noise/dots for texture
    if (type === 'grass') {
      // Random dark spots for grass texture
      graphics.fillStyle(0x4A6B2F, 0.3);
      for (let i = 0; i < 20; i++) {
        const x = x1 + Math.random() * (x2 - x1);
        const y = y1 + Math.random() * (y2 - y1);
        graphics.fillCircle(x, y, 2);
      }
    } else if (type === 'rocks' || type === 'stone') {
      // Random lighter spots for rock texture
      graphics.fillStyle(0x808080, 0.5);
      for (let i = 0; i < 15; i++) {
        const x = x1 + Math.random() * (x2 - x1);
        const y = y1 + Math.random() * (y2 - y1);
        graphics.fillCircle(x, y, 3);
      }
    } else if (type === 'water') {
      // Wavy lines for water
      graphics.lineStyle(1, 0x5A9BD5, 0.3);
      for (let i = 0; i < 5; i++) {
        const y = y1 + (i / 5) * (y2 - y1);
        graphics.beginPath();
        graphics.moveTo(x1, y);
        graphics.lineTo(x2, y);
        graphics.strokePath();
      }
    }
  }

  /**
   * Draw buildings as solid geometric shapes
   */
  private drawBuildings(graphics: Phaser.GameObjects.Graphics, buildings: Building[]): void {
    buildings.forEach(building => {
      const x = building.position.x * this.tileSize;
      const y = building.position.y * this.tileSize;
      const width = building.size.width * this.tileSize;
      const height = building.size.height * this.tileSize;

      // Draw floor
      const floorColor = this.getBuildingFloorColor(building.floorTerrain);
      graphics.fillStyle(floorColor, 1.0);
      graphics.fillRect(x, y, width, height);

      // Draw walls (darker outline)
      const wallColor = this.getBuildingWallColor(building.wallTerrain);
      graphics.lineStyle(4, wallColor, 1.0);
      graphics.strokeRect(x, y, width, height);

      // Draw entrances (gaps in walls)
      building.entrances.forEach(entrance => {
        const entranceSize = this.tileSize * 0.8;
        let entranceX = x;
        let entranceY = y;

        // Position entrance based on direction
        if (entrance.direction === 'north') {
          entranceX = x + (entrance.x * this.tileSize);
          entranceY = y;
        } else if (entrance.direction === 'south') {
          entranceX = x + (entrance.x * this.tileSize);
          entranceY = y + height - entranceSize;
        } else if (entrance.direction === 'east') {
          entranceX = x + width - entranceSize;
          entranceY = y + (entrance.y * this.tileSize);
        } else if (entrance.direction === 'west') {
          entranceX = x;
          entranceY = y + (entrance.y * this.tileSize);
        }

        // Draw entrance as gap (draw floor color over wall)
        graphics.fillStyle(floorColor, 1.0);
        graphics.fillRect(entranceX, entranceY, entranceSize, entranceSize);
      });
    });
  }

  /**
   * Get floor color for building
   */
  private getBuildingFloorColor(floorTerrain: string): number {
    const floorColors: Record<string, number> = {
      'wood': 0x8B6914,       // Dark goldenrod
      'stone': 0x696969,      // Dim gray
      'dirt': 0x8B7355,       // Sandy brown
      'tile': 0xB8B8B8,       // Light gray
    };
    return floorColors[floorTerrain] || 0x8B6914; // Default to wood
  }

  /**
   * Get wall color for building
   */
  private getBuildingWallColor(wallTerrain: string): number {
    const wallColors: Record<string, number> = {
      'wood': 0x654321,       // Dark brown
      'stone': 0x4A4A4A,      // Dark gray
      'brick': 0x8B4513,      // Saddle brown
      'adobe': 0xC19A6B,      // Camel (tan/beige)
    };
    return wallColors[wallTerrain] || 0x654321; // Default to wood
  }

  /**
   * Draw cover objects (barrels, crates, wagons, etc.)
   */
  private drawCoverObjects(graphics: Phaser.GameObjects.Graphics, coverObjects: CoverObject[]): void {
    coverObjects.forEach(cover => {
      const x = cover.position.x * this.tileSize + (this.tileSize / 2);
      const y = cover.position.y * this.tileSize + (this.tileSize / 2);
      const size = this.getCoverSize(cover.size);

      if (cover.type === 'barrel') {
        // Draw barrel as brown circle
        graphics.fillStyle(0x8B4513, 1.0);
        graphics.fillCircle(x, y, size);
        graphics.lineStyle(2, 0x654321, 1.0);
        graphics.strokeCircle(x, y, size);
      } else if (cover.type === 'crate' || cover.type === 'box') {
        // Draw crate as brown square
        graphics.fillStyle(0xA0522D, 1.0);
        graphics.fillRect(x - size, y - size, size * 2, size * 2);
        graphics.lineStyle(2, 0x654321, 1.0);
        graphics.strokeRect(x - size, y - size, size * 2, size * 2);
      } else if (cover.type === 'wagon') {
        // Draw wagon as larger brown rectangle
        const wagonWidth = size * 2;
        const wagonHeight = size * 1.5;
        graphics.fillStyle(0x8B6914, 1.0);
        graphics.fillRect(x - wagonWidth / 2, y - wagonHeight / 2, wagonWidth, wagonHeight);
        graphics.lineStyle(2, 0x654321, 1.0);
        graphics.strokeRect(x - wagonWidth / 2, y - wagonHeight / 2, wagonWidth, wagonHeight);

        // Draw wheels
        graphics.fillStyle(0x3E2723, 1.0);
        graphics.fillCircle(x - wagonWidth / 3, y + wagonHeight / 2, size / 2);
        graphics.fillCircle(x + wagonWidth / 3, y + wagonHeight / 2, size / 2);
      } else if (cover.type === 'fence') {
        // Draw fence as thin brown rectangle
        graphics.fillStyle(0x8B6914, 1.0);
        graphics.fillRect(x - size * 1.5, y - size / 3, size * 3, size / 1.5);
        graphics.lineStyle(2, 0x654321, 1.0);
        graphics.strokeRect(x - size * 1.5, y - size / 3, size * 3, size / 1.5);
      } else {
        // Default: draw as gray circle
        graphics.fillStyle(0x808080, 1.0);
        graphics.fillCircle(x, y, size);
        graphics.lineStyle(2, 0x404040, 1.0);
        graphics.strokeCircle(x, y, size);
      }
    });
  }

  /**
   * Get pixel size for cover object size descriptor
   */
  private getCoverSize(size: string): number {
    const sizes: Record<string, number> = {
      'small': this.tileSize * 0.3,
      'medium': this.tileSize * 0.5,
      'large': this.tileSize * 0.7,
    };
    return sizes[size] || this.tileSize * 0.4;
  }

  /**
   * Clear entire arena (not just map layers)
   */
  private clearEntireArena(): void {
    // Destroy all existing map layers
    this.backgroundImage?.destroy();
    this.tacticalGrid?.destroy();
    this.wallHighlights?.destroy();
    this.coverMarkers?.clear(true, true);
    this.buildingLabels?.clear(true, true);
    this.npcMarkers?.clear(true, true);

    // Clear references
    this.backgroundImage = undefined;
    this.tacticalGrid = undefined;
    this.wallHighlights = undefined;
    this.coverMarkers = undefined;
    this.buildingLabels = undefined;
    this.npcMarkers = undefined;

    // CRITICAL: Destroy the original ArenaScene background and grid
    const arenaScene = this.scene as any;

    // Destroy original brown background
    if (arenaScene.arenaBackground) {
      arenaScene.arenaBackground.destroy();
      arenaScene.arenaBackground = undefined;
      console.log('Original arena background destroyed');
    }

    // Destroy original grid
    if (arenaScene.gridGraphics) {
      arenaScene.gridGraphics.destroy();
      arenaScene.gridGraphics = undefined;
      console.log('Original grid graphics destroyed');
    }

    // Also destroy any remaining Graphics or Image objects at background depths
    const allChildren = this.scene.children.getChildren();
    allChildren.forEach(child => {
      const gameObject = child as Phaser.GameObjects.GameObject & { depth?: number };

      // Destroy objects at background depth (-100 to 0)
      if ((child instanceof Phaser.GameObjects.Graphics ||
           child instanceof Phaser.GameObjects.Image ||
           child instanceof Phaser.GameObjects.Rectangle) &&
          gameObject.depth !== undefined &&
          gameObject.depth < 1) {
        child.destroy();
      }
    });

    console.log('Arena cleared completely - ready for new map');
  }

  /**
   * Load and display hand-drawn illustrated background image
   */
  private async loadBackgroundImage(imageUrl: string, width: number, height: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const textureKey = `map_bg_${Date.now()}`;

      this.scene.textures.once('addtexture', () => {
        // Create background image
        this.backgroundImage = this.scene.add.image(0, 0, textureKey);
        this.backgroundImage.setOrigin(0, 0);
        this.backgroundImage.setDepth(-100); // Behind everything

        // Scale to fit map size
        const targetWidth = width * this.tileSize;
        const targetHeight = height * this.tileSize;
        this.backgroundImage.setDisplaySize(targetWidth, targetHeight);

        // Full opacity for hand-drawn illustrated images
        this.backgroundImage.setAlpha(1.0);

        console.log('Hand-drawn background image loaded successfully');
        console.log(`Image scaled to: ${targetWidth}x${targetHeight} px`);
        resolve();
      });

      this.scene.textures.once('onerror', (key: string) => {
        console.error('Failed to load background image texture:', key);
        reject(new Error('Failed to load background image'));
      });

      try {
        this.scene.textures.addBase64(textureKey, imageUrl);
      } catch (error) {
        console.error('Error adding base64 texture:', error);
        reject(error);
      }
    });
  }

  /**
   * Create tactical grid overlay on top of realistic image
   */
  private createTacticalGrid(width: number, height: number): void {
    this.tacticalGrid = this.scene.add.graphics();
    this.tacticalGrid.setDepth(100); // Above background, below UI

    // Draw subtle grid lines
    this.tacticalGrid.lineStyle(1, 0xffffff, 0.15);

    // Vertical lines
    for (let x = 0; x <= width; x++) {
      const worldX = x * this.tileSize;
      this.tacticalGrid.lineBetween(worldX, 0, worldX, height * this.tileSize);
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      const worldY = y * this.tileSize;
      this.tacticalGrid.lineBetween(0, worldY, width * this.tileSize, worldY);
    }

    // Highlight every 5th line for easier counting
    this.tacticalGrid.lineStyle(2, 0xffffff, 0.3);
    for (let x = 0; x <= width; x += 5) {
      const worldX = x * this.tileSize;
      this.tacticalGrid.lineBetween(worldX, 0, worldX, height * this.tileSize);
    }
    for (let y = 0; y <= height; y += 5) {
      const worldY = y * this.tileSize;
      this.tacticalGrid.lineBetween(0, worldY, width * this.tileSize, worldY);
    }

    this.tacticalGrid.setVisible(this.gridVisible);
    console.log('Tactical grid overlay created');
  }

  /**
   * Extract wall data from buildings
   */
  private extractWallsFromBuildings(buildings: Building[]): Array<{x: number, y: number, width: number, height: number}> {
    return buildings.map(building => ({
      x: building.position.x,
      y: building.position.y,
      width: building.size.width,
      height: building.size.height
    }));
  }

  /**
   * Highlight walls and obstacles with colored overlay
   */
  private highlightWalls(walls: Array<{x: number, y: number, width: number, height: number}>): void {
    this.wallHighlights = this.scene.add.graphics();
    this.wallHighlights.setDepth(101);

    walls.forEach(wall => {
      // Draw red semi-transparent overlay over walls
      this.wallHighlights!.fillStyle(0xff0000, 0.2);
      this.wallHighlights!.fillRect(
        wall.x * this.tileSize,
        wall.y * this.tileSize,
        wall.width * this.tileSize,
        wall.height * this.tileSize
      );

      // Add red border
      this.wallHighlights!.lineStyle(2, 0xff0000, 0.6);
      this.wallHighlights!.strokeRect(
        wall.x * this.tileSize,
        wall.y * this.tileSize,
        wall.width * this.tileSize,
        wall.height * this.tileSize
      );
    });

    this.wallHighlights.setVisible(this.wallsVisible);
    console.log(`Wall highlights created for ${walls.length} walls`);
  }

  /**
   * Mark cover positions with defense bonus indicators
   */
  private markCover(coverPositions: CoverObject[]): void {
    this.coverMarkers = this.scene.add.group();

    coverPositions.forEach(cover => {
      const worldX = cover.position.x * this.tileSize;
      const worldY = cover.position.y * this.tileSize;

      // Green semi-transparent marker
      const marker = this.scene.add.graphics();
      marker.fillStyle(0x00ff00, 0.3);
      marker.fillCircle(
        worldX + this.tileSize/2,
        worldY + this.tileSize/2,
        this.tileSize/2
      );
      marker.lineStyle(2, 0x00ff00, 0.8);
      marker.strokeCircle(
        worldX + this.tileSize/2,
        worldY + this.tileSize/2,
        this.tileSize/2
      );
      marker.setDepth(102);

      // Defense bonus label
      const label = this.scene.add.text(
        worldX + this.tileSize/2,
        worldY + this.tileSize/2,
        `+${cover.coverBonus}`,
        {
          fontSize: '14px',
          color: '#00ff00',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3
        }
      );
      label.setOrigin(0.5);
      label.setDepth(103);

      this.coverMarkers.add(marker);
      this.coverMarkers.add(label);
    });

    this.coverMarkers.setVisible(this.coverVisible);
    console.log(`Cover markers created for ${coverPositions.length} positions`);
  }

  /**
   * Add building labels (optional)
   */
  private addBuildingLabels(buildings: Building[]): void {
    this.buildingLabels = this.scene.add.group();

    buildings.forEach(building => {
      const worldX = building.position.x * this.tileSize;
      const worldY = building.position.y * this.tileSize;
      const width = building.size.width * this.tileSize;
      const height = building.size.height * this.tileSize;

      const label = this.scene.add.text(
        worldX + width / 2,
        worldY + height / 2,
        building.name,
        {
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 },
        }
      );
      label.setOrigin(0.5);
      label.setDepth(104);
      this.buildingLabels.add(label);
    });

    console.log(`Building labels added for ${buildings.length} buildings`);
  }

  /**
   * Add NPC markers (optional)
   */
  private addNPCMarkers(npcs: NPC[]): void {
    this.npcMarkers = this.scene.add.group();

    npcs.forEach(npc => {
      const worldX = npc.position.x * this.tileSize;
      const worldY = npc.position.y * this.tileSize;

      // Gold triangle marker
      const marker = this.scene.add.graphics();
      marker.fillStyle(0xFFD700, 1);
      marker.fillTriangle(
        worldX + this.tileSize / 2, worldY,
        worldX, worldY + this.tileSize,
        worldX + this.tileSize, worldY + this.tileSize
      );
      marker.lineStyle(2, 0x000000, 1);
      marker.strokeTriangle(
        worldX + this.tileSize / 2, worldY,
        worldX, worldY + this.tileSize,
        worldX + this.tileSize, worldY + this.tileSize
      );
      marker.setDepth(105);

      // NPC name label
      const label = this.scene.add.text(
        worldX + this.tileSize / 2,
        worldY - 10,
        npc.name,
        {
          fontSize: '10px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 2, y: 1 },
        }
      );
      label.setOrigin(0.5, 1);
      label.setDepth(106);

      this.npcMarkers.add(marker);
      this.npcMarkers.add(label);
    });

    console.log(`NPC markers added for ${npcs.length} NPCs`);
  }

  /**
   * Move player to spawn point (center of map by default)
   */
  private movePlayerToSpawn(mapWidth: number, mapHeight: number): void {
    const spawnX = (mapWidth * this.tileSize) / 2;
    const spawnY = (mapHeight * this.tileSize) / 2;

    // Try to access player object if it exists
    const player = (this.scene as any).player;
    if (player && player.setPosition) {
      player.setPosition(spawnX, spawnY);
      console.log(`Player moved to spawn: (${spawnX}, ${spawnY})`);
    } else {
      console.warn('Player object not found, skipping spawn placement');
    }
  }

  /**
   * Center camera on the loaded map and adjust zoom
   */
  private centerCameraOnMap(mapWidth: number, mapHeight: number): void {
    const centerX = (mapWidth * this.tileSize) / 2;
    const centerY = (mapHeight * this.tileSize) / 2;
    const mapPixelWidth = mapWidth * this.tileSize;
    const mapPixelHeight = mapHeight * this.tileSize;

    // Update camera bounds to match new map size
    const camera = this.scene.cameras.main;
    camera.setBounds(0, 0, mapPixelWidth, mapPixelHeight);
    console.log(`Camera bounds updated to ${mapPixelWidth}x${mapPixelHeight} pixels`);

    // Move camera to center
    camera.centerOn(centerX, centerY);

    // Adjust zoom to fit map on screen
    const zoomX = (camera.width * 0.9) / mapPixelWidth;
    const zoomY = (camera.height * 0.9) / mapPixelHeight;
    const zoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 1x

    camera.setZoom(zoom);

    console.log(`Camera centered at (${centerX}, ${centerY}) with zoom ${zoom.toFixed(2)}`);
  }

  /**
   * Toggle tactical grid visibility
   */
  toggleGrid(visible: boolean): void {
    this.gridVisible = visible;
    if (this.tacticalGrid) {
      this.tacticalGrid.setVisible(visible);
      console.log(`Tactical grid ${visible ? 'shown' : 'hidden'}`);
    }
  }

  /**
   * Toggle wall highlights visibility
   */
  toggleWalls(visible: boolean): void {
    this.wallsVisible = visible;
    if (this.wallHighlights) {
      this.wallHighlights.setVisible(visible);
      console.log(`Wall highlights ${visible ? 'shown' : 'hidden'}`);
    }
  }

  /**
   * Toggle cover markers visibility
   */
  toggleCover(visible: boolean): void {
    this.coverVisible = visible;
    if (this.coverMarkers) {
      this.coverMarkers.setVisible(visible);
      console.log(`Cover markers ${visible ? 'shown' : 'hidden'}`);
    }
  }

  /**
   * Clear all map layers (legacy method)
   * @deprecated Use clearEntireArena() instead
   */
  clearMap(): void {
    this.clearEntireArena();
  }

  /**
   * Download map as JSON file
   */
  static downloadMapJSON(mapData: GeneratedMap): void {
    const dataStr = JSON.stringify(mapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mapData.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Initialize map loader event listener
 * Call this in your Phaser scene's create() method
 * Returns the MapLoader instance so you can access toggle methods
 */
export function initializeMapLoaderListener(scene: Phaser.Scene): MapLoader {
  const mapLoader = new MapLoader(scene);

  window.addEventListener('loadGeneratedMap', ((event: CustomEvent) => {
    const mapData = event.detail as GeneratedMap;
    mapLoader.loadMapAsArena(mapData); // Use new method
  }) as EventListener);

  console.log('Map loader listener initialized');

  return mapLoader;
}
