package com.deadlands.campaign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "skill_references")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SkillAttribute attribute;

    @Column(name = "default_value")
    private String defaultValue; // e.g., "d4-2" for unskilled

    @Column(name = "is_core_skill")
    private Boolean isCoreSkill = false; // Core skills like Fighting, Shooting, etc.

    public enum SkillAttribute {
        AGILITY,
        SMARTS,
        SPIRIT,
        STRENGTH,
        VIGOR
    }
}