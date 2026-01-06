package com.deadlands.v2.dto;

import com.deadlands.v2.entity.WikiCategory;
import com.deadlands.v2.entity.WikiEntry;
import com.deadlands.v2.entity.WikiVisibility;

import java.time.LocalDateTime;

public class WikiEntryDTO {

    private Long id;
    private String title;
    private String slug;
    private String content;
    private WikiCategory category;
    private WikiVisibility visibility;
    private Long relatedCharacterId;
    private Integer sortOrder;
    private String createdByUsername;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public WikiEntryDTO() {
    }

    public static WikiEntryDTO fromEntity(WikiEntry entity) {
        WikiEntryDTO dto = new WikiEntryDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setSlug(entity.getSlug());
        dto.setContent(entity.getContent());
        dto.setCategory(entity.getCategory());
        dto.setVisibility(entity.getVisibility());
        dto.setRelatedCharacterId(entity.getRelatedCharacterId());
        dto.setSortOrder(entity.getSortOrder());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        if (entity.getCreatedBy() != null) {
            dto.setCreatedByUsername(entity.getCreatedBy().getUsername());
        }
        return dto;
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

    public String getCreatedByUsername() {
        return createdByUsername;
    }

    public void setCreatedByUsername(String createdByUsername) {
        this.createdByUsername = createdByUsername;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
