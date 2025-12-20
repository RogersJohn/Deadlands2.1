package com.deadlands.campaign.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LocationRequest {
    @NotBlank(message = "Location type is required")
    private String locationType;

    @Pattern(regexp = "Small|Medium|Large", message = "Size must be Small, Medium, or Large")
    private String size = "Medium";
}
