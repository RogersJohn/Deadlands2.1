package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wounds")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(exclude = {"character"})
@lombok.ToString(exclude = {"character"})
public class Wound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    @JsonIgnoreProperties({"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds"})
    private Character character;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Location location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(length = 500)
    private String description;

    @Column(name = "is_healed")
    private Boolean isHealed = false;

    public enum Location {
        HEAD,
        RIGHT_ARM,
        LEFT_ARM,
        GUTS,
        RIGHT_LEG,
        LEFT_LEG
    }

    public enum Severity {
        LIGHT,
        HEAVY,
        SERIOUS,
        CRITICAL,
        MAIMED
    }
}
