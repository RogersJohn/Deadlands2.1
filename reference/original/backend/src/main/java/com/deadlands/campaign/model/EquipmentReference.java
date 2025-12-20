package com.deadlands.campaign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "equipment_references")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentType type;

    @Column(precision = 10, scale = 2)
    private BigDecimal weight;

    @Column(precision = 10, scale = 2)
    private BigDecimal cost;

    // Weapon-specific fields
    private String damage;
    private String range;

    @Column(name = "rate_of_fire")
    private Integer rateOfFire;

    private Integer shots;

    @Column(name = "ap")
    private Integer armorPiercing;

    private String notes;

    // Armor-specific fields
    @Column(name = "armor_value")
    private Integer armorValue;

    @Column(name = "covers")
    private String covers; // e.g., "torso", "head", "full body"

    public enum EquipmentType {
        WEAPON_MELEE,
        WEAPON_RANGED,
        WEAPON_THROWN,
        ARMOR,
        AMMUNITION,
        GEAR,
        INFERNAL_DEVICE,
        CONSUMABLE,
        VEHICLE,
        TREASURE
    }
}