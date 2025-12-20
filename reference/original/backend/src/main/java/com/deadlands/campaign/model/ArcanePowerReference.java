package com.deadlands.campaign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "arcane_power_references")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArcanePowerReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 3000)
    private String description;

    @Column(name = "power_points")
    private Integer powerPoints;

    private String range;
    private String duration;

    @Column(name = "trait_roll")
    private String traitRoll; // e.g., "Faith", "Hexslinging", "Knowledge (Science)"

    @Column(length = 1000)
    private String effect;

    @Column(name = "arcane_backgrounds", length = 500)
    private String arcaneBackgrounds; // Comma-separated list: "Blessed,Huckster,Shaman"

    @Column(name = "is_trapping")
    private Boolean isTrapping = false; // Whether this is a variant/trapping of another power

    public enum PowerType {
        BLESSED,
        HUCKSTER,
        SHAMAN,
        MAD_SCIENCE,
        CHI_MASTERY,
        COMMON // Available to multiple arcane backgrounds
    }
}