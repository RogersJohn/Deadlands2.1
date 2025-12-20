package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Event broadcast when a token has moved.
 * Sent from server to all connected clients in the shared game world.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenMovedEvent {
    /**
     * ID of the token that moved
     */
    private String tokenId;

    /**
     * Type of token (PLAYER or ENEMY)
     */
    private String tokenType;

    /**
     * Player who moved the token (username)
     */
    private String movedBy;

    /**
     * New grid X coordinate
     */
    private Integer gridX;

    /**
     * New grid Y coordinate
     */
    private Integer gridY;

    /**
     * Timestamp of the move
     */
    private Long timestamp;
}
