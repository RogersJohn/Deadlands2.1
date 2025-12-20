package com.deadlands.campaign.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for changing the current map.
 *
 * When GM changes maps, all token positions are cleared.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangeMapRequest {
    private String mapId;
}
