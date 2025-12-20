package com.deadlands.campaign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "edge_references")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EdgeReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 2000)
    private String description;

    @Column(length = 1000)
    private String requirements;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EdgeType type;

    @Column(name = "rank_required")
    private String rankRequired; // Novice, Seasoned, Veteran, Heroic, Legendary

    public enum EdgeType {
        BACKGROUND,
        COMBAT,
        LEADERSHIP,
        PROFESSIONAL,
        SOCIAL,
        WEIRD,
        POWER,
        LEGENDARY
    }
}