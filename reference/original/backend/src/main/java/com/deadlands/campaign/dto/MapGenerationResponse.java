package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for AI-generated battle map
 * Contains both map data (JSON) and background image URL
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MapGenerationResponse {

    private String name;
    private String description;
    private MapSize size;
    private List<TerrainGroup> terrain;
    private List<Building> buildings;
    private List<NPC> npcs;
    private List<CoverObject> cover;
    private String imageUrl; // URL to generated background image (base64 or external URL)
    private String imagePrompt; // The prompt used to generate the image

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MapSize {
        private int width;
        private int height;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TerrainGroup {
        private String type; // "dirt", "rocks", "water", "grass", "wood_floor", etc.
        private TerrainArea area; // Rectangular area {x1, y1, x2, y2}
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TerrainArea {
        private int x1;
        private int y1;
        private int x2;
        private int y2;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Building {
        private String name;
        private String type; // "saloon", "house", "barn", "mine", "fort"
        private Position position;
        private Size size;
        private String wallTerrain;
        private String floorTerrain;
        private List<Entrance> entrances;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Position {
        private int x;
        private int y;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Size {
        private int width;
        private int height;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entrance {
        private int x;
        private int y;
        private String direction; // "north", "south", "east", "west"
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NPC {
        private String name;
        private Position position;
        private String personality;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CoverObject {
        private String type; // "barrel", "crate", "wagon", "fence"
        private Position position;
        private int coverBonus; // 2, 4, etc.
        private String size; // "small", "medium", "large"
    }
}
