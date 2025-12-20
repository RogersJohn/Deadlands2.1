package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Lightweight DTO for battle map list views
 * Excludes large image data and full map JSON for performance
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BattleMapDTO {

    private Long id;
    private String name;
    private String description;
    private Integer widthTiles;
    private Integer heightTiles;
    private String thumbnailUrl; // Small preview image (if available)
    private String visibility;
    private String tags;
    private String type;
    private String theme;
    private String createdByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
