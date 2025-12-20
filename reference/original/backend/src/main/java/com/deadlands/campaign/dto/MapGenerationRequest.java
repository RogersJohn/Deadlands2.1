package com.deadlands.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

/**
 * Request DTO for AI-powered battle map generation
 */
@Data
public class MapGenerationRequest {

    @NotBlank(message = "Location type is required")
    private String locationType; // "wilderness", "town", "interior", "mine", "fort"

    @NotBlank(message = "Size is required")
    private String size; // "small" (15x10), "medium" (30x20), "large" (50x30)

    private String theme; // "combat", "chase", "ambush", "siege", "exploration"

    private List<String> features; // ["water", "buildings", "cover", "elevation"]

    private String description; // Optional: Additional details from GM

    private boolean generateImage; // Whether to generate background artwork (default: true)
}
