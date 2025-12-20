package com.deadlands.campaign.model;

/**
 * Battle theme affects map layout and tactical features
 */
public enum BattleTheme {
    COMBAT,      // Lots of cover, balanced layout
    CHASE,       // Open spaces, long sightlines
    AMBUSH,      // Asymmetric, favors one side
    SIEGE,       // Defensible positions, fortifications
    EXPLORATION  // Mixed terrain, varied features
}
