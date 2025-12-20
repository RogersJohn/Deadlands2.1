package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Battle Map entity for persisting AI-generated maps
 * Maps can be saved, reused across sessions, and shared between users
 */
@Entity
@Table(name = "battle_maps")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@lombok.EqualsAndHashCode(exclude = {"createdBy"})
@lombok.ToString(exclude = {"createdBy", "imageData", "mapData"})
public class BattleMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String description;

    // Map dimensions (in tiles)
    @Column(nullable = false)
    private Integer widthTiles;

    @Column(nullable = false)
    private Integer heightTiles;

    // Generated map image (base64 or URL)
    @Column(length = 5000000) // ~5MB for base64 image
    private String imageData;

    @Column(length = 500)
    private String imageUrl; // Alternative: external storage URL

    // AI prompt used to generate
    @Column(length = 2000)
    private String generationPrompt;

    // Map metadata (JSON)
    @Column(length = 50000, columnDefinition = "TEXT")
    private String mapData; // Serialized GeneratedMap JSON

    // Tactical data
    @Column(length = 10000, columnDefinition = "TEXT")
    private String wallsData; // JSON array of wall coordinates

    @Column(length = 10000, columnDefinition = "TEXT")
    private String coverData; // JSON array of cover positions with bonuses

    @Column(length = 5000, columnDefinition = "TEXT")
    private String spawnPointsData; // JSON array of player/NPC spawn points

    // Ownership
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "characters", "password"})
    private User createdBy;

    // Visibility
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MapVisibility visibility = MapVisibility.PRIVATE;

    // Categories/Tags
    @Column(length = 500)
    private String tags; // Comma-separated: "town,combat,outdoor,medium"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MapType type; // TOWN_STREET, WILDERNESS, INTERIOR, MINE, FORT, CUSTOM

    @Enumerated(EnumType.STRING)
    private BattleTheme theme; // COMBAT, CHASE, AMBUSH, SIEGE, EXPLORATION

    // Timestamps
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
