package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for token position information.
 *
 * Used in API responses to send token positions to clients.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenPositionDTO {
    private String tokenId;
    private String tokenType;
    private Integer gridX;
    private Integer gridY;
    private String lastMovedBy;
    private LocalDateTime lastMoved;
    private Long characterId; // Nullable - only for PLAYER tokens
}
