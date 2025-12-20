package com.deadlands.campaign.model;

/**
 * Visibility level for battle maps
 */
public enum MapVisibility {
    PRIVATE,  // Only creator can see
    CAMPAIGN, // All players in campaign can see
    PUBLIC    // All GMs can see
}
