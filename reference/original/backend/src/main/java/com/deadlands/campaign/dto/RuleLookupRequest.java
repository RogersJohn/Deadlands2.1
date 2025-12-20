package com.deadlands.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RuleLookupRequest {
    @NotBlank(message = "Rule question is required")
    private String ruleQuestion;
}
