package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "equipment")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(exclude = {"character", "equipmentReference"})
@lombok.ToString(exclude = {"character", "equipmentReference"})
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    @JsonIgnoreProperties({"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds"})
    private Character character;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "equipment_reference_id")
    @JsonIgnoreProperties("id")
    private EquipmentReference equipmentReference;

    // Legacy fields - kept for backward compatibility
    @Column(nullable = true)
    private String name;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    private EquipmentType type;

    // Character-specific fields
    @Column(nullable = false)
    private Integer quantity = 1;

    @Column(precision = 10, scale = 2)
    private BigDecimal weight;

    @Column(precision = 10, scale = 2)
    private BigDecimal cost;

    // Weapon-specific fields (can override reference values)
    private String damage;
    private String range;
    private Integer rof; // Rate of Fire
    private Integer shots;
    private Integer speed;
    private Integer defense;

    @Column(name = "is_equipped")
    private Boolean isEquipped = false;

    @Column(length = 500)
    private String notes; // Character-specific notes

    public enum EquipmentType {
        WEAPON_MELEE,
        WEAPON_RANGED,
        ARMOR,
        AMMUNITION,
        GEAR,
        TREASURE,
        CONSUMABLE
    }
}
