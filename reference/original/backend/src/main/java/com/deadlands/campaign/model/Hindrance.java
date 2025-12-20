package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "hindrances")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@lombok.EqualsAndHashCode(exclude = {"character", "hindranceReference"})
@lombok.ToString(exclude = {"character", "hindranceReference"})
public class Hindrance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    @JsonIgnoreProperties({"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds"})
    private Character character;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "hindrance_reference_id")
    @JsonIgnoreProperties("id")
    private HindranceReference hindranceReference;

    // Legacy fields - kept for backward compatibility
    @Column(nullable = true)
    private String name;

    @Column(length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    private Severity severity;

    @Column(length = 500)
    private String notes; // Character-specific notes

    public enum Severity {
        MINOR,
        MAJOR
    }
}
