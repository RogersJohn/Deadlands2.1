package com.deadlands.campaign.model;

/**
 * Type of battle map location
 */
public enum MapType {
    TOWN_STREET,  // Main street, saloon exterior, sheriff's office
    WILDERNESS,   // Desert, prairie, canyon, mountain pass
    INTERIOR,     // Saloon interior, hotel room, train car
    MINE,         // Mine shaft, underground cave, tunnel
    FORT,         // Fort exterior, military compound
    CUSTOM        // User-defined
}
