package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for combat state queries.
 *
 * Returns the full initiative order, current round, and active character.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CombatStateResponse {

    /**
     * Current combat round number (1-based)
     */
    private int roundNumber;

    /**
     * Whether combat is currently active
     */
    private boolean combatActive;

    /**
     * ID of the character whose turn it currently is
     */
    private Long activeCharacterId;

    /**
     * Name of active character (for display)
     */
    private String activeCharacterName;

    /**
     * Full initiative order for this round, sorted by card value (highest first)
     */
    private List<InitiativeEntryDTO> initiativeOrder;

    /**
     * Whether a Joker was dealt this round (deck should be shuffled next round)
     */
    private boolean jokerDealt;

    /**
     * Message for combat log
     */
    private String message;
}
