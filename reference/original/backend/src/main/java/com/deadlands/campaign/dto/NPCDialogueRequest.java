package com.deadlands.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class NPCDialogueRequest {
    @NotBlank(message = "NPC name is required")
    private String npcName;

    private String npcPersonality;

    private String context;

    @NotBlank(message = "Player question is required")
    private String playerQuestion;
}
