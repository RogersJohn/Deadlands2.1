package com.deadlands.v2.service;

import com.deadlands.v2.dto.*;
import com.deadlands.v2.entity.*;
import com.deadlands.v2.exception.AccessDeniedException;
import com.deadlands.v2.exception.DuplicateResourceException;
import com.deadlands.v2.exception.ResourceNotFoundException;
import com.deadlands.v2.repository.WikiAccessRepository;
import com.deadlands.v2.repository.WikiEntryRepository;
import com.deadlands.v2.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class WikiService {

    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    private final WikiEntryRepository wikiEntryRepository;
    private final WikiAccessRepository wikiAccessRepository;
    private final UserRepository userRepository;

    public WikiService(WikiEntryRepository wikiEntryRepository,
                       WikiAccessRepository wikiAccessRepository,
                       UserRepository userRepository) {
        this.wikiEntryRepository = wikiEntryRepository;
        this.wikiAccessRepository = wikiAccessRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<WikiEntryDTO> getAllVisibleEntries(User currentUser) {
        List<WikiEntry> allEntries = wikiEntryRepository.findAllByOrderBySortOrderAsc();
        return filterVisibleEntries(allEntries, currentUser);
    }

    @Transactional(readOnly = true)
    public List<WikiEntryDTO> getEntriesByCategory(WikiCategory category, User currentUser) {
        List<WikiEntry> entries = wikiEntryRepository.findByCategoryOrderBySortOrderAsc(category);
        return filterVisibleEntries(entries, currentUser);
    }

    @Transactional(readOnly = true)
    public WikiEntryDTO getBySlug(String slug, User currentUser) {
        WikiEntry entry = wikiEntryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Wiki entry not found with slug: " + slug));

        if (!canUserAccess(entry, currentUser)) {
            throw new AccessDeniedException("Access denied to this wiki entry");
        }

        return WikiEntryDTO.fromEntity(entry);
    }

    @Transactional(readOnly = true)
    public WikiEntryDTO getById(Long id, User currentUser) {
        WikiEntry entry = wikiEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Wiki entry not found with id: " + id));

        if (!canUserAccess(entry, currentUser)) {
            throw new AccessDeniedException("Access denied to this wiki entry");
        }

        return WikiEntryDTO.fromEntity(entry);
    }

    @Transactional(readOnly = true)
    public List<WikiEntryDTO> search(String query, User currentUser) {
        List<WikiEntry> entries = wikiEntryRepository.searchByTitleOrContent(query);
        return filterVisibleEntries(entries, currentUser);
    }

    @Transactional(readOnly = true)
    public List<WikiEntryDTO> searchByCategory(String query, WikiCategory category, User currentUser) {
        List<WikiEntry> entries = wikiEntryRepository.searchByTitleOrContentAndCategory(query, category);
        return filterVisibleEntries(entries, currentUser);
    }

    @Transactional
    public WikiEntryDTO createEntry(CreateWikiEntryRequest request, User currentUser) {
        // Only GM can create private or character-specific entries
        if (request.getVisibility() != WikiVisibility.PUBLIC && !isGameMaster(currentUser)) {
            throw new AccessDeniedException("Only Game Masters can create non-public entries");
        }

        String slug = request.getSlug();
        if (slug == null || slug.isBlank()) {
            slug = generateSlug(request.getTitle());
        }

        // Ensure slug is unique
        if (wikiEntryRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis();
        }

        WikiEntry entry = new WikiEntry();
        entry.setTitle(request.getTitle());
        entry.setSlug(slug);
        entry.setContent(request.getContent());
        entry.setCategory(request.getCategory());
        entry.setVisibility(request.getVisibility());
        entry.setRelatedCharacterId(request.getRelatedCharacterId());
        entry.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        entry.setCreatedBy(currentUser);

        WikiEntry saved = wikiEntryRepository.save(entry);
        return WikiEntryDTO.fromEntity(saved);
    }

    @Transactional
    public WikiEntryDTO updateEntry(Long id, UpdateWikiEntryRequest request, User currentUser) {
        WikiEntry entry = wikiEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Wiki entry not found with id: " + id));

        // Only GM can update entries
        if (!isGameMaster(currentUser)) {
            throw new AccessDeniedException("Only Game Masters can update wiki entries");
        }

        if (request.getTitle() != null) {
            entry.setTitle(request.getTitle());
        }
        if (request.getSlug() != null && !request.getSlug().isBlank()) {
            // Check if new slug is unique (excluding current entry)
            wikiEntryRepository.findBySlug(request.getSlug())
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new DuplicateResourceException("Slug already exists: " + request.getSlug());
                        }
                    });
            entry.setSlug(request.getSlug());
        }
        if (request.getContent() != null) {
            entry.setContent(request.getContent());
        }
        if (request.getCategory() != null) {
            entry.setCategory(request.getCategory());
        }
        if (request.getVisibility() != null) {
            entry.setVisibility(request.getVisibility());
        }
        if (request.getRelatedCharacterId() != null) {
            entry.setRelatedCharacterId(request.getRelatedCharacterId());
        }
        if (request.getSortOrder() != null) {
            entry.setSortOrder(request.getSortOrder());
        }

        WikiEntry saved = wikiEntryRepository.save(entry);
        return WikiEntryDTO.fromEntity(saved);
    }

    @Transactional
    public void deleteEntry(Long id, User currentUser) {
        WikiEntry entry = wikiEntryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Wiki entry not found with id: " + id));

        // Only GM can delete entries
        if (!isGameMaster(currentUser)) {
            throw new AccessDeniedException("Only Game Masters can delete wiki entries");
        }

        wikiEntryRepository.delete(entry);
    }

    @Transactional
    public WikiAccessDTO grantAccess(Long entryId, Long userId, String reason, User grantingUser) {
        // Only GM can grant access
        if (!isGameMaster(grantingUser)) {
            throw new AccessDeniedException("Only Game Masters can grant wiki access");
        }

        WikiEntry entry = wikiEntryRepository.findById(entryId)
                .orElseThrow(() -> new ResourceNotFoundException("Wiki entry not found with id: " + entryId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Check if access already exists
        if (wikiAccessRepository.existsByWikiEntryIdAndUserId(entryId, userId)) {
            throw new DuplicateResourceException("Access already granted to this user");
        }

        WikiAccess access = new WikiAccess(entry, user, grantingUser, reason);
        WikiAccess saved = wikiAccessRepository.save(access);
        return WikiAccessDTO.fromEntity(saved);
    }

    @Transactional
    public void revokeAccess(Long entryId, Long userId, User revokingUser) {
        // Only GM can revoke access
        if (!isGameMaster(revokingUser)) {
            throw new AccessDeniedException("Only Game Masters can revoke wiki access");
        }

        WikiAccess access = wikiAccessRepository.findByWikiEntryIdAndUserId(entryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Access grant not found"));

        wikiAccessRepository.delete(access);
    }

    @Transactional(readOnly = true)
    public List<WikiAccessDTO> getAccessGrants(Long entryId, User currentUser) {
        // Only GM can view access grants
        if (!isGameMaster(currentUser)) {
            throw new AccessDeniedException("Only Game Masters can view access grants");
        }

        return wikiAccessRepository.findByWikiEntryId(entryId).stream()
                .map(WikiAccessDTO::fromEntity)
                .collect(Collectors.toList());
    }

    private List<WikiEntryDTO> filterVisibleEntries(List<WikiEntry> entries, User currentUser) {
        return entries.stream()
                .filter(entry -> canUserAccess(entry, currentUser))
                .map(WikiEntryDTO::fromEntity)
                .collect(Collectors.toList());
    }

    private boolean canUserAccess(WikiEntry entry, User currentUser) {
        // GM can see everything
        if (isGameMaster(currentUser)) {
            return true;
        }

        // Public entries visible to all
        if (entry.getVisibility() == WikiVisibility.PUBLIC) {
            return true;
        }

        // Character-specific entries visible to character owner
        // Note: This would require character ownership check when characters are implemented
        // For now, we check if user has explicit access grant
        if (entry.getVisibility() == WikiVisibility.CHARACTER_SPECIFIC) {
            // TODO: Check character ownership when Character entity is implemented
            // For now, allow if has access grant
            return wikiAccessRepository.existsByWikiEntryIdAndUserId(entry.getId(), currentUser.getId());
        }

        // Private entries only visible with explicit access grant
        if (entry.getVisibility() == WikiVisibility.PRIVATE) {
            return wikiAccessRepository.existsByWikiEntryIdAndUserId(entry.getId(), currentUser.getId());
        }

        return false;
    }

    private boolean isGameMaster(User user) {
        return user.getRole() == Role.GAME_MASTER;
    }

    private String generateSlug(String title) {
        String noWhitespace = WHITESPACE.matcher(title).replaceAll("-");
        String normalized = Normalizer.normalize(noWhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH);
    }
}
