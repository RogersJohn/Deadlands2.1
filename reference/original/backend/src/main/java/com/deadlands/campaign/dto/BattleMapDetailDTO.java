package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Full DTO for battle map including all data for game loading
 * Includes large image data and full map JSON
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BattleMapDetailDTO {

    private Long id;
    private String name;
    private String description;
    private Integer widthTiles;
    private Integer heightTiles;
    private String imageData; // Full base64 image
    private String imageUrl;
    private String generationPrompt;
    private String mapData; // Full GeneratedMap JSON
    private String wallsData;
    private String coverData;
    private String spawnPointsData;
    private String visibility;
    private String tags;
    private String type;
    private String theme;
    private String createdByUsername;
    private Long createdByUserId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
