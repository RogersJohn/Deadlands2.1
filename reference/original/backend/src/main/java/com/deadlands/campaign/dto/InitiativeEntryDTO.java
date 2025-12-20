package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing a single character's initiative card in combat.
 *
 * Savage Worlds uses playing cards for initiative:
 * - Ace is highest, 2 is lowest
 * - Suit order: Spades > Hearts > Diamonds > Clubs
 * - Jokers can act anytime and get +2 to all rolls
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InitiativeEntryDTO {

    /**
     * Character ID (matches Character entity ID)
     */
    private Long characterId;

    /**
     * Character name for display
     */
    private String characterName;

    /**
     * Whether this is a player character or NPC/enemy
     */
    private boolean isPlayer;

    /**
     * Card suit: SPADES, HEARTS, DIAMONDS, CLUBS, or JOKER
     */
    private String cardSuit;

    /**
     * Card value: A, K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2
     * For Joker: RED or BLACK
     */
    private String cardValue;

    /**
     * Whether this is a Joker card
     */
    private boolean isJoker;

    /**
     * For Joker cards: true = red joker (acts first), false = black joker
     */
    private boolean isRedJoker;

    /**
     * Numeric sort value for ordering (higher = acts first)
     * Red Joker = 100, Ace of Spades = 52, 2 of Clubs = 1
     */
    private int sortValue;

    /**
     * Whether this character has already acted this round
     */
    private boolean hasActed;

    /**
     * Whether this character is currently the active turn
     */
    private boolean isActive;
}
