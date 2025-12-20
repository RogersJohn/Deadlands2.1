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
import java.util.ArrayList;
import java.util.List;

/**
 * Singleton entity representing the global game state.
 *
 * There is only ONE game state record (id = 1) for the entire shared world.
 * This tracks the current map, combat state, initiative order, and all token positions.
 *
 * When the GM changes maps, all token positions are cleared.
 */
@Entity
@Table(name = "game_state")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class GameState {

    /**
     * Always 1 - singleton pattern for single shared world.
     */
    @Id
    private Long id = 1L;

    /**
     * Current combat round number (1-based).
     * Reset to 1 when combat starts, increments when all characters have acted.
     * Note: nullable=true allows Hibernate migration without breaking existing rows
     */
    @Column(nullable = true)
    private Integer roundNumber = 1;

    /**
     * Legacy field - keeping for backwards compatibility during transition.
     * Will be removed once new initiative system is fully implemented.
     * @deprecated Use roundNumber and activeCharacterId instead
     */
    @Deprecated
    @Column(nullable = false)
    private Integer turnNumber = 1;

    /**
     * Legacy field - keeping for backwards compatibility during transition.
     * @deprecated Use combatActive and initiative order instead
     */
    @Deprecated
    @Column(nullable = false, length = 50)
    private String turnPhase = "player";

    /**
     * Whether combat is currently active.
     * When true, initiative order is in effect.
     * Note: nullable=true allows Hibernate migration without breaking existing rows
     */
    @Column(nullable = true)
    private Boolean combatActive = false;

    /**
     * Character ID of whoever's turn it currently is.
     * Null if combat is not active or between rounds.
     */
    @Column(name = "active_character_id")
    private Long activeCharacterId;

    /**
     * Whether a Joker was dealt this round.
     * If true, the deck should be shuffled at the start of next round.
     * Note: nullable=true allows Hibernate migration without breaking existing rows
     */
    @Column(nullable = true)
    private Boolean jokerDealtThisRound = false;

    /**
     * Current map identifier (e.g., "saloon_interior", "desert_canyon")
     * When this changes, all token positions should be cleared.
     */
    @Column(length = 255)
    private String currentMap;

    /**
     * All token positions on the current map.
     * Cascade DELETE: When game state is reset, positions are cleared.
     */
    @OneToMany(mappedBy = "gameState", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TokenPosition> tokenPositions = new ArrayList<>();

    /**
     * Initiative order for current combat round.
     * Sorted by card value (highest first).
     * Cleared when combat ends or new round starts (new cards dealt).
     */
    @OneToMany(mappedBy = "gameState", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @OrderBy("sortValue DESC")
    private List<InitiativeEntry> initiativeOrder = new ArrayList<>();

    /**
     * Last time any game action occurred (move, combat, etc.)
     */
    @Column(nullable = false)
    private LocalDateTime lastActivity = LocalDateTime.now();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Clear all token positions.
     * Used when GM changes the map.
     */
    public void clearAllTokenPositions() {
        this.tokenPositions.clear();
    }

    /**
     * Add or update a token position.
     * If token already exists, updates its position.
     * If token is new, adds it to the list.
     */
    public void updateTokenPosition(TokenPosition position) {
        // Remove existing position for this token if present
        this.tokenPositions.removeIf(p -> p.getTokenId().equals(position.getTokenId()));

        // Add the new/updated position
        position.setGameState(this);
        this.tokenPositions.add(position);

        // Update last activity
        this.lastActivity = LocalDateTime.now();
    }

    /**
     * Clear all initiative entries.
     * Used when combat ends or a new round starts.
     */
    public void clearInitiativeOrder() {
        this.initiativeOrder.clear();
    }

    /**
     * Add an initiative entry.
     */
    public void addInitiativeEntry(InitiativeEntry entry) {
        entry.setGameState(this);
        this.initiativeOrder.add(entry);
    }

    /**
     * Get the next character to act (first one who hasn't acted yet).
     * Returns null if all characters have acted.
     */
    public InitiativeEntry getNextToAct() {
        return this.initiativeOrder.stream()
                .filter(e -> !e.isHasActed())
                .findFirst()
                .orElse(null);
    }

    /**
     * Check if all characters have acted this round.
     */
    public boolean allCharactersActed() {
        return this.initiativeOrder.stream().allMatch(InitiativeEntry::isHasActed);
    }

    /**
     * Start combat - set active and reset round.
     */
    public void startCombat() {
        this.combatActive = true;
        this.roundNumber = 1;
        this.jokerDealtThisRound = false;
        this.lastActivity = LocalDateTime.now();
    }

    /**
     * End combat - clear initiative and deactivate.
     */
    public void endCombat() {
        this.combatActive = false;
        this.activeCharacterId = null;
        this.jokerDealtThisRound = false;
        clearInitiativeOrder();
        this.lastActivity = LocalDateTime.now();
    }

    /**
     * Advance to next round.
     */
    public void nextRound() {
        this.roundNumber = (this.roundNumber != null ? this.roundNumber : 1) + 1;
        this.jokerDealtThisRound = false;
        clearInitiativeOrder();
        this.lastActivity = LocalDateTime.now();
    }

    /**
     * Remove a specific token from the map.
     * Used when character is deleted or leaves.
     */
    public void removeToken(String tokenId) {
        this.tokenPositions.removeIf(p -> p.getTokenId().equals(tokenId));
        this.lastActivity = LocalDateTime.now();
    }
}
