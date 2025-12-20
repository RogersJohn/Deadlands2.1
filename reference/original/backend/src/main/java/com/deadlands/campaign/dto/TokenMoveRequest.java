package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request to move a token on the battlefield.
 * Sent from client to server via WebSocket.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TokenMoveRequest {
    /**
     * ID of the token being moved (player character ID or enemy ID)
     */
    private String tokenId;

    /**
     * Type of token (PLAYER or ENEMY)
     */
    private String tokenType; // PLAYER, ENEMY

    /**
     * Grid X coordinate (from)
     */
    private Integer fromX;

    /**
     * Grid Y coordinate (from)
     */
    private Integer fromY;

    /**
     * Grid X coordinate (to)
     */
    private Integer toX;

    /**
     * Grid Y coordinate (to)
     */
    private Integer toY;
}
