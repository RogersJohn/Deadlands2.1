package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "arcane_powers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(exclude = {"character", "powerReference"})
@lombok.ToString(exclude = {"character", "powerReference"})
public class ArcanePower {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    @JsonIgnoreProperties({"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds"})
    private Character character;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "power_reference_id")
    @JsonIgnoreProperties("id")
    private ArcanePowerReference powerReference;

    // Legacy fields - kept for backward compatibility
    @Column(nullable = true)
    private String name;

    @Enumerated(EnumType.STRING)
    private PowerType type;

    private String speed;
    private String duration;
    private String range;
    private String trait;

    @Column(name = "target_number")
    private Integer targetNumber;

    @Column(length = 1000)
    private String notes; // Character-specific notes, trappings, etc.

    public enum PowerType {
        HEXSLINGING,
        RITUAL,
        SHAMANISM,
        BLESSED,
        MAD_SCIENCE
    }
}
