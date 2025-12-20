package com.deadlands.campaign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity representing a single character's initiative card in combat.
 *
 * This is stored as part of the GameState during active combat.
 * When a new round starts, all entries are deleted and new cards are dealt.
 */
@Entity
@Table(name = "initiative_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitiativeEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Reference to the GameState this entry belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_state_id", nullable = false)
    private GameState gameState;

    /**
     * Character ID if this is a player character (nullable for NPCs)
     */
    @Column(name = "character_id")
    private Long characterId;

    /**
     * Character/NPC name for display
     */
    @Column(nullable = false, length = 100)
    private String characterName;

    /**
     * Whether this is a player character (true) or NPC/enemy (false)
     */
    @Column(nullable = false)
    private boolean isPlayer;

    /**
     * Card suit: SPADES, HEARTS, DIAMONDS, CLUBS
     * Null for Jokers
     */
    @Column(length = 10)
    private String cardSuit;

    /**
     * Card value: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2
     * For Jokers: RED or BLACK
     */
    @Column(nullable = false, length = 5)
    private String cardValue;

    /**
     * Whether this is a Joker card
     */
    @Column(nullable = false)
    private boolean isJoker;

    /**
     * For Joker cards only: true = red joker, false = black joker
     * Red Joker traditionally acts first, Black Joker acts last in some variants
     * In our implementation, both Jokers can act anytime and get +2 bonus
     */
    @Column(nullable = false)
    private boolean isRedJoker;

    /**
     * Numeric sort value for ordering (higher = acts first)
     *
     * Calculation:
     * - Red Joker = 100
     * - Black Joker = 99
     * - Regular cards: (value * 4) + suitBonus
     *   - Value: A=13, K=12, Q=11, J=10, 10=9, ..., 2=1
     *   - Suit bonus: Spades=3, Hearts=2, Diamonds=1, Clubs=0
     *
     * Examples:
     * - Ace of Spades = (13 * 4) + 3 = 55
     * - Ace of Clubs = (13 * 4) + 0 = 52
     * - 2 of Clubs = (1 * 4) + 0 = 4
     */
    @Column(nullable = false)
    private int sortValue;

    /**
     * Whether this character has already acted this round
     */
    @Column(nullable = false)
    private boolean hasActed;

    /**
     * Order in which this character acts (1 = first, 2 = second, etc.)
     * Set after sorting by sortValue
     */
    @Column(nullable = false)
    private int turnOrder;
}
