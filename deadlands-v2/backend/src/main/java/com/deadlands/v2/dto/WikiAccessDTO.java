package com.deadlands.v2.dto;

import com.deadlands.v2.entity.WikiAccess;

import java.time.LocalDateTime;

public class WikiAccessDTO {

    private Long id;
    private Long wikiEntryId;
    private String wikiEntryTitle;
    private Long userId;
    private String username;
    private Long grantedById;
    private String grantedByUsername;
    private String grantReason;
    private LocalDateTime grantedAt;

    public WikiAccessDTO() {
    }

    public static WikiAccessDTO fromEntity(WikiAccess entity) {
        WikiAccessDTO dto = new WikiAccessDTO();
        dto.setId(entity.getId());
        dto.setWikiEntryId(entity.getWikiEntry().getId());
        dto.setWikiEntryTitle(entity.getWikiEntry().getTitle());
        dto.setUserId(entity.getUser().getId());
        dto.setUsername(entity.getUser().getUsername());
        if (entity.getGrantedBy() != null) {
            dto.setGrantedById(entity.getGrantedBy().getId());
            dto.setGrantedByUsername(entity.getGrantedBy().getUsername());
        }
        dto.setGrantReason(entity.getGrantReason());
        dto.setGrantedAt(entity.getGrantedAt());
        return dto;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getWikiEntryId() {
        return wikiEntryId;
    }

    public void setWikiEntryId(Long wikiEntryId) {
        this.wikiEntryId = wikiEntryId;
    }

    public String getWikiEntryTitle() {
        return wikiEntryTitle;
    }

    public void setWikiEntryTitle(String wikiEntryTitle) {
        this.wikiEntryTitle = wikiEntryTitle;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Long getGrantedById() {
        return grantedById;
    }

    public void setGrantedById(Long grantedById) {
        this.grantedById = grantedById;
    }

    public String getGrantedByUsername() {
        return grantedByUsername;
    }

    public void setGrantedByUsername(String grantedByUsername) {
        this.grantedByUsername = grantedByUsername;
    }

    public String getGrantReason() {
        return grantReason;
    }

    public void setGrantReason(String grantReason) {
        this.grantReason = grantReason;
    }

    public LocalDateTime getGrantedAt() {
        return grantedAt;
    }

    public void setGrantedAt(LocalDateTime grantedAt) {
        this.grantedAt = grantedAt;
    }
}
