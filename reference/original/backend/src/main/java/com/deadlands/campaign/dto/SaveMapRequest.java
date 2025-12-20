package com.deadlands.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request DTO for saving a generated battle map to database
 */
@Data
public class SaveMapRequest {

    @NotBlank(message = "Map name is required")
    private String name;

    private String description;

    @NotNull(message = "Width is required")
    private Integer widthTiles;

    @NotNull(message = "Height is required")
    private Integer heightTiles;

    // Either imageData (base64) or imageUrl should be provided
    private String imageData; // Base64 encoded image

    private String imageUrl; // External URL

    private String generationPrompt; // Prompt used to generate

    @NotBlank(message = "Map data is required")
    private String mapData; // Serialized GeneratedMap JSON

    private String wallsData; // JSON array of wall coordinates

    private String coverData; // JSON array of cover positions

    private String spawnPointsData; // JSON array of spawn points

    @NotBlank(message = "Visibility is required")
    private String visibility; // "PRIVATE", "CAMPAIGN", "PUBLIC"

    private String tags; // Comma-separated tags

    @NotBlank(message = "Map type is required")
    private String type; // "TOWN_STREET", "WILDERNESS", "INTERIOR", "MINE", "FORT"

    private String theme; // "COMBAT", "CHASE", "AMBUSH", "SIEGE", "EXPLORATION"
}
