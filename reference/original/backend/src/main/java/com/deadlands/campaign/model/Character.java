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
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "characters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@lombok.EqualsAndHashCode(exclude = {"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds", "player", "deletedBy"})
@lombok.ToString(exclude = {"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds", "player", "deletedBy"})
public class Character {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 1000)
    private String occupation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "characters", "password"})
    private User player;

    // Core Stats
    @Column(nullable = false)
    private Integer pace = 6;

    @Column(nullable = false)
    private Integer size = 0;

    @Column(nullable = false)
    private Integer wind = 0;

    @Column(nullable = false)
    private Integer grit = 1;

    // Derived Stats (Savage Worlds)
    @Column(nullable = false)
    private Integer parry = 2; // Base 2 + Fighting/2

    @Column(nullable = false)
    private Integer toughness = 2; // Base 2 + Vigor/2 + Armor

    @Column(nullable = false)
    private Integer charisma = 0; // Modifiers from edges/hindrances

    // XP Tracking
    @Column(name = "total_xp", nullable = false)
    private Integer totalXp = 0; // Total XP earned by character

    @Column(name = "spent_xp", nullable = false)
    private Integer spentXp = 0; // XP spent on improvements

    // Power Points (Savage Worlds - for arcane background characters)
    @Column(name = "current_power_points", nullable = false)
    private Integer currentPowerPoints = 0; // Current PP available for casting

    @Column(name = "max_power_points", nullable = false)
    private Integer maxPowerPoints = 10; // Maximum PP (base 10 + Power Points edge)

    // Fate Chips (Bennies) - Savage Worlds core mechanic
    @Column(name = "fate_chips", nullable = false)
    private Integer fateChips = 3; // Wild Cards start with 3, NPCs with 1

    // Combat State (Savage Worlds)
    @Column(name = "wound_count", nullable = false)
    private Integer woundCount = 0; // 0-3 wounds (each = -1 penalty), 4 = incapacitated

    @Column(name = "is_shaken", nullable = false)
    private Boolean isShaken = false; // Shaken (stunned) - can only take free actions

    // Savage Worlds Attributes - stored as dice notation (e.g., "3d6")
    @Column(name = "agility_die")
    private String agilityDie = "1d6";

    @Column(name = "smarts_die")
    private String smartsDie = "1d6";

    @Column(name = "spirit_die")
    private String spiritDie = "1d6";

    @Column(name = "strength_die")
    private String strengthDie = "1d6";

    @Column(name = "vigor_die")
    private String vigorDie = "1d6";

    // Legacy Deadlands Classic Attributes (deprecated - use Savage Worlds attributes above)
    @Column(name = "cognition_die")
    private String cognitionDie = "1d6";

    @Column(name = "deftness_die")
    private String deftnessDie = "1d6";

    @Column(name = "nimbleness_die")
    private String nimblenessDie = "1d6";

    @Column(name = "quickness_die")
    private String quicknessDie = "1d6";

    // Derived Stats
    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("character")
    private Set<Skill> skills = new HashSet<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("character")
    private Set<Edge> edges = new HashSet<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("character")
    private Set<Hindrance> hindrances = new HashSet<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("character")
    private Set<Equipment> equipment = new HashSet<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("character")
    private Set<ArcanePower> arcanePowers = new HashSet<>();

    @OneToMany(mappedBy = "character", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("character")
    private Set<Wound> wounds = new HashSet<>();

    @Column(length = 2000)
    private String notes;

    @Column(name = "character_image_url")
    private String characterImageUrl;

    @Column(name = "is_npc")
    private Boolean isNpc = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Soft Delete Fields
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "characters", "password"})
    private User deletedBy;
}
