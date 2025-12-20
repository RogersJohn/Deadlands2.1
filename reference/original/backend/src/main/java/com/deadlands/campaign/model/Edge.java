package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "edges")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(exclude = {"character", "edgeReference"})
@lombok.ToString(exclude = {"character", "edgeReference"})
public class Edge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    @JsonIgnoreProperties({"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds"})
    private Character character;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "edge_reference_id")
    @JsonIgnoreProperties("id")
    private EdgeReference edgeReference;

    // Legacy fields - kept for backward compatibility
    @Column(nullable = true)
    private String name;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    private EdgeType type;

    @Column(length = 500)
    private String notes; // Character-specific notes

    public enum EdgeType {
        BACKGROUND,
        COMBAT,
        LEADERSHIP,
        PROFESSIONAL,
        SOCIAL,
        SUPERNATURAL,
        WEIRD
    }
}
