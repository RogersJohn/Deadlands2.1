package com.deadlands.campaign.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class EncounterRequest {
    @NotBlank(message = "Location is required")
    private String location;

    @Min(value = 1, message = "Party size must be at least 1")
    private int partySize = 4;

    @Pattern(regexp = "Novice|Seasoned|Veteran|Heroic|Legendary", message = "Invalid rank")
    private String averageLevel = "Seasoned";
}
