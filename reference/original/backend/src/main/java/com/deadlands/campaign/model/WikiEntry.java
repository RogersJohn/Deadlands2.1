package com.deadlands.campaign.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "wiki_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class WikiEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug; // URL-friendly identifier

    @Column(length = 50000, nullable = false)
    private String content; // Markdown content

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility visibility = Visibility.PUBLIC;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_character_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Character relatedCharacter; // If this entry is about a specific character

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = true; // Quick check for public entries

    @OneToMany(mappedBy = "wikiEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("wikiEntry")
    private Set<WikiAccess> accessGrants = new HashSet<>();

    @Column(name = "sort_order")
    private Integer sortOrder = 0; // For ordering entries within categories

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum Category {
        CHARACTER_BIO("Character Bios"),
        CAMPAIGN_LORE("Campaign Lore"),
        LOCATION("Locations"),
        SESSION_NOTE("Session Notes"),
        OTHER("Other");

        private final String displayName;

        Category(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum Visibility {
        PUBLIC,              // Visible to all players
        CHARACTER_SPECIFIC,  // Visible to character owner + GM + granted users
        PRIVATE              // Visible to GM + granted users only
    }
}
