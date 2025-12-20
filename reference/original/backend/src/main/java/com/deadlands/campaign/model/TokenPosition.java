package com.deadlands.campaign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Represents the current position of a token on the game map.
 *
 * Tokens can be:
 * - PLAYER: Player-controlled characters (linked to Character entity)
 * - ENEMY: GM-controlled enemies (no Character link)
 * - NPC: GM-controlled NPCs (may or may not link to Character)
 *
 * When GM changes maps, ALL TokenPositions are deleted.
 */
@Entity
@Table(name = "token_positions", uniqueConstraints = {
        @UniqueConstraint(columnNames = "token_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class TokenPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique identifier for this token.
     * For player characters: the character ID (e.g., "123")
     * For enemies: generated ID (e.g., "enemy_1", "enemy_2")
     * For NPCs: generated ID (e.g., "npc_bartender")
     */
    @Column(name = "token_id", nullable = false, unique = true, length = 100)
    private String tokenId;

    /**
     * Type of token: 'PLAYER', 'ENEMY', 'NPC'
     */
    @Column(name = "token_type", nullable = false, length = 50)
    private String tokenType;

    /**
     * Optional link to Character entity (for PLAYER tokens and some NPCs).
     * Null for most enemies.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id")
    private Character character;

    /**
     * Current X coordinate on the grid (0-199).
     */
    @Column(name = "grid_x", nullable = false)
    private Integer gridX;

    /**
     * Current Y coordinate on the grid (0-199).
     */
    @Column(name = "grid_y", nullable = false)
    private Integer gridY;

    /**
     * Username of the player/GM who last moved this token.
     */
    @Column(name = "last_moved_by", length = 100)
    private String lastMovedBy;

    /**
     * Reference to the singleton GameState.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_state_id", nullable = false)
    private GameState gameState;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Timestamp when this token was last moved.
     */
    @Column(name = "last_moved", nullable = false)
    private LocalDateTime lastMoved = LocalDateTime.now();

    /**
     * Update position coordinates.
     */
    public void updatePosition(Integer newX, Integer newY, String movedBy) {
        this.gridX = newX;
        this.gridY = newY;
        this.lastMovedBy = movedBy;
        this.lastMoved = LocalDateTime.now();
    }
}
