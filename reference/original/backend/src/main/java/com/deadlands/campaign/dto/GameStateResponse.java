package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for game state queries.
 *
 * Returns the current map, turn information, and all token positions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameStateResponse {
    private Integer turnNumber;
    private String turnPhase;
    private String currentMap;
    private List<TokenPositionDTO> tokenPositions;
    private LocalDateTime lastActivity;
}
