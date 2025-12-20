package com.deadlands.v2.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "wiki_entries")
public class WikiEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 200)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WikiCategory category = WikiCategory.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WikiVisibility visibility = WikiVisibility.PUBLIC;

    @Column(name = "related_character_id")
    private Long relatedCharacterId;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "wikiEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WikiAccess> accessGrants = new ArrayList<>();

    public WikiEntry() {
    }

    public WikiEntry(String title, String slug, String content, WikiCategory category, WikiVisibility visibility) {
        this.title = title;
        this.slug = slug;
        this.content = content;
        this.category = category;
        this.visibility = visibility;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public WikiCategory getCategory() {
        return category;
    }

    public void setCategory(WikiCategory category) {
        this.category = category;
    }

    public WikiVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(WikiVisibility visibility) {
        this.visibility = visibility;
    }

    public Long getRelatedCharacterId() {
        return relatedCharacterId;
    }

    public void setRelatedCharacterId(Long relatedCharacterId) {
        this.relatedCharacterId = relatedCharacterId;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<WikiAccess> getAccessGrants() {
        return accessGrants;
    }

    public void setAccessGrants(List<WikiAccess> accessGrants) {
        this.accessGrants = accessGrants;
    }
}
