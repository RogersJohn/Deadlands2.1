package com.deadlands.v2.entity;

public enum WikiVisibility {
    PUBLIC,           // Visible to all authenticated users
    CHARACTER_SPECIFIC, // Visible to character owner and GM
    PRIVATE           // GM only, can grant access to specific users
}
