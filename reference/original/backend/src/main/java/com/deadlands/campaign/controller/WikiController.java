package com.deadlands.campaign.controller;

import com.deadlands.campaign.model.Character;
import com.deadlands.campaign.model.User;
import com.deadlands.campaign.model.WikiAccess;
import com.deadlands.campaign.model.WikiEntry;
import com.deadlands.campaign.repository.CharacterRepository;
import com.deadlands.campaign.repository.UserRepository;
import com.deadlands.campaign.repository.WikiAccessRepository;
import com.deadlands.campaign.repository.WikiEntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/wiki")
public class WikiController {

    @Autowired
    private WikiEntryRepository wikiEntryRepository;

    @Autowired
    private WikiAccessRepository wikiAccessRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CharacterRepository characterRepository;

    /**
     * Get all wiki entries visible to the current user
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<WikiEntryDTO>> getAllVisibleEntries(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<WikiEntry> allEntries = wikiEntryRepository.findAllOrdered();
        List<WikiEntry> visibleEntries = filterVisibleEntries(allEntries, user);

        List<WikiEntryDTO> dtos = visibleEntries.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * Get a specific wiki entry by slug
     */
    @GetMapping("/slug/{slug}")
    @Transactional(readOnly = true)
    public ResponseEntity<WikiEntryDTO> getBySlug(@PathVariable String slug, Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        WikiEntry entry = wikiEntryRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Wiki entry not found"));

        if (!canUserAccess(entry, user)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(toDTO(entry));
    }

    /**
     * Get wiki entries by category
     */
    @GetMapping("/category/{category}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<WikiEntryDTO>> getByCategory(
            @PathVariable WikiEntry.Category category,
            Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<WikiEntry> entries = wikiEntryRepository.findByCategory(category);
        List<WikiEntry> visibleEntries = filterVisibleEntries(entries, user);

        List<WikiEntryDTO> dtos = visibleEntries.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * GM: Grant access to a wiki entry for a specific user
     */
    @PostMapping("/{entryId}/grant-access/{userId}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<WikiAccess> grantAccess(
            @PathVariable Long entryId,
            @PathVariable Long userId,
            @RequestBody(required = false) GrantAccessRequest request,
            Authentication authentication) {

        User gm = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        WikiEntry entry = wikiEntryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Wiki entry not found"));

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        // Check if access already exists
        if (wikiAccessRepository.findByWikiEntryIdAndUserId(entryId, userId).isPresent()) {
            return ResponseEntity.badRequest().build();
        }

        WikiAccess access = WikiAccess.builder()
                .wikiEntry(entry)
                .user(targetUser)
                .grantedBy(gm)
                .grantReason(request != null ? request.getReason() : null)
                .build();

        WikiAccess savedAccess = wikiAccessRepository.save(access);
        return ResponseEntity.ok(savedAccess);
    }

    /**
     * GM: Revoke access to a wiki entry for a specific user
     */
    @DeleteMapping("/{entryId}/revoke-access/{userId}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<?> revokeAccess(@PathVariable Long entryId, @PathVariable Long userId) {
        WikiAccess access = wikiAccessRepository.findByWikiEntryIdAndUserId(entryId, userId)
                .orElseThrow(() -> new RuntimeException("Access grant not found"));

        wikiAccessRepository.delete(access);
        return ResponseEntity.ok().build();
    }

    /**
     * GM: Get all access grants for a wiki entry
     */
    @GetMapping("/{entryId}/access-grants")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<List<WikiAccess>> getAccessGrants(@PathVariable Long entryId) {
        List<WikiAccess> grants = wikiAccessRepository.findByWikiEntryId(entryId);
        return ResponseEntity.ok(grants);
    }

    /**
     * Filter wiki entries to only those visible to the user
     */
    private List<WikiEntry> filterVisibleEntries(List<WikiEntry> entries, User user) {
        return entries.stream()
                .filter(entry -> canUserAccess(entry, user))
                .collect(Collectors.toList());
    }

    /**
     * Check if a user can access a wiki entry
     */
    private boolean canUserAccess(WikiEntry entry, User user) {
        // GM can see everything
        if (user.getRole() == User.Role.GAME_MASTER) {
            return true;
        }

        // Public entries visible to all
        if (entry.getVisibility() == WikiEntry.Visibility.PUBLIC) {
            return true;
        }

        // Character-specific entries visible to character owner
        if (entry.getVisibility() == WikiEntry.Visibility.CHARACTER_SPECIFIC) {
            if (entry.getRelatedCharacter() != null) {
                Character relatedChar = entry.getRelatedCharacter();
                if (relatedChar.getPlayer() != null &&
                    relatedChar.getPlayer().getId().equals(user.getId())) {
                    return true;
                }
            }
        }

        // Check if user has been granted access
        List<Long> grantedEntryIds = wikiAccessRepository.findWikiEntryIdsByUserId(user.getId());
        return grantedEntryIds.contains(entry.getId());
    }

    /**
     * Convert WikiEntry to DTO
     */
    private WikiEntryDTO toDTO(WikiEntry entry) {
        WikiEntryDTO dto = new WikiEntryDTO();
        dto.setId(entry.getId());
        dto.setTitle(entry.getTitle());
        dto.setSlug(entry.getSlug());
        dto.setContent(entry.getContent());
        dto.setCategory(entry.getCategory());
        dto.setVisibility(entry.getVisibility());
        dto.setSortOrder(entry.getSortOrder());
        dto.setCreatedAt(entry.getCreatedAt());
        dto.setUpdatedAt(entry.getUpdatedAt());

        if (entry.getRelatedCharacter() != null) {
            dto.setRelatedCharacterId(entry.getRelatedCharacter().getId());
            dto.setRelatedCharacterName(entry.getRelatedCharacter().getName());
        }

        return dto;
    }

    static class WikiEntryDTO {
        private Long id;
        private String title;
        private String slug;
        private String content;
        private WikiEntry.Category category;
        private WikiEntry.Visibility visibility;
        private Integer sortOrder;
        private Long relatedCharacterId;
        private String relatedCharacterName;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime updatedAt;

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getSlug() { return slug; }
        public void setSlug(String slug) { this.slug = slug; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public WikiEntry.Category getCategory() { return category; }
        public void setCategory(WikiEntry.Category category) { this.category = category; }
        public WikiEntry.Visibility getVisibility() { return visibility; }
        public void setVisibility(WikiEntry.Visibility visibility) { this.visibility = visibility; }
        public Integer getSortOrder() { return sortOrder; }
        public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
        public Long getRelatedCharacterId() { return relatedCharacterId; }
        public void setRelatedCharacterId(Long relatedCharacterId) { this.relatedCharacterId = relatedCharacterId; }
        public String getRelatedCharacterName() { return relatedCharacterName; }
        public void setRelatedCharacterName(String relatedCharacterName) { this.relatedCharacterName = relatedCharacterName; }
        public java.time.LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(java.time.LocalDateTime createdAt) { this.createdAt = createdAt; }
        public java.time.LocalDateTime getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(java.time.LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    }

    static class GrantAccessRequest {
        private String reason;

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
