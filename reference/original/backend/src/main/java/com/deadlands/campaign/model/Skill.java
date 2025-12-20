package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "skills")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(exclude = {"character", "skillReference"})
@lombok.ToString(exclude = {"character", "skillReference"})
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    @JsonIgnoreProperties({"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds"})
    private Character character;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "skill_reference_id")
    @JsonIgnoreProperties("id")
    private SkillReference skillReference;

    // Legacy field - kept for backward compatibility
    @Column(nullable = true)
    private String name;

    @Column(name = "die_value", nullable = false)
    private String dieValue; // e.g., "d6", "d8", "d10", "d12"

    @Column(length = 500)
    private String notes;

    // Legacy enum - kept for backward compatibility
    @Enumerated(EnumType.STRING)
    private SkillCategory category;

    public enum SkillCategory {
        COGNITION,
        DEFTNESS,
        KNOWLEDGE,
        NIMBLENESS,
        SMARTS,
        SPIRIT,
        STRENGTH,
        VIGOR,
        TRADE,
        PROFESSIONAL
    }
}
