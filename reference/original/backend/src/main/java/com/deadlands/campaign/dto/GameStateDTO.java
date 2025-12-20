package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Complete game state for a session.
 * Contains all information needed to render the battlefield.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameStateDTO {

    /**
     * Map of player tokens (characterId -> TokenState)
     */
    private Map<String, TokenState> playerTokens;

    /**
     * List of enemy tokens
     */
    private List<TokenState> enemyTokens;

    /**
     * Current turn number
     */
    private Integer turn;

    /**
     * Current phase (player, enemy, animating)
     */
    private String phase;

    /**
     * Combat log entries
     */
    private List<String> combatLog;

    /**
     * Represents a single token on the battlefield
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TokenState {
        private String id;
        private String name;
        private String type; // PLAYER, ENEMY
        private Integer gridX;
        private Integer gridY;
        private Integer health;
        private Integer maxHealth;
        private Boolean isActive; // Is it this token's turn?
        private String ownedBy; // Username of player who owns this token
    }
}
