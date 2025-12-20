package com.deadlands.v2.dto;

import com.deadlands.v2.entity.WikiCategory;
import com.deadlands.v2.entity.WikiVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateWikiEntryRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must be less than 200 characters")
    private String title;

    @Size(max = 200, message = "Slug must be less than 200 characters")
    private String slug;

    private String content;

    private WikiCategory category = WikiCategory.OTHER;

    private WikiVisibility visibility = WikiVisibility.PUBLIC;

    private Long relatedCharacterId;

    private Integer sortOrder = 0;

    public CreateWikiEntryRequest() {
    }

    // Getters and Setters
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
}
