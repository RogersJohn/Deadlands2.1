package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for starting combat.
 *
 * Contains the list of character IDs that will participate in combat.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartCombatRequest {

    /**
     * List of player character IDs to include in combat
     */
    private List<Long> playerCharacterIds;

    /**
     * List of NPC/enemy names to include in combat
     * (NPCs don't have character IDs, so we use names)
     */
    private List<String> npcNames;
}
