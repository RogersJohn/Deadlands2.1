package com.deadlands.campaign.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "hindrance_references")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HindranceReference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(length = 500)
    private String gameEffect; // Summary of mechanical effects

    public enum Severity {
        MINOR,
        MAJOR,
        EITHER // Some hindrances can be taken as either Minor or Major
    }
}