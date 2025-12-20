package com.deadlands.v2.controller;

import com.deadlands.v2.dto.*;
import com.deadlands.v2.entity.User;
import com.deadlands.v2.entity.WikiCategory;
import com.deadlands.v2.service.WikiService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wiki")
public class WikiController {

    private final WikiService wikiService;

    public WikiController(WikiService wikiService) {
        this.wikiService = wikiService;
    }

    @GetMapping
    public ResponseEntity<List<WikiEntryDTO>> getAllEntries(@AuthenticationPrincipal User currentUser) {
        List<WikiEntryDTO> entries = wikiService.getAllVisibleEntries(currentUser);
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<WikiEntryDTO>> getByCategory(
            @PathVariable WikiCategory category,
            @AuthenticationPrincipal User currentUser) {
        List<WikiEntryDTO> entries = wikiService.getEntriesByCategory(category, currentUser);
        return ResponseEntity.ok(entries);
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<WikiEntryDTO> getBySlug(
            @PathVariable String slug,
            @AuthenticationPrincipal User currentUser) {
        WikiEntryDTO entry = wikiService.getBySlug(slug, currentUser);
        return ResponseEntity.ok(entry);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WikiEntryDTO> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        WikiEntryDTO entry = wikiService.getById(id, currentUser);
        return ResponseEntity.ok(entry);
    }

    @GetMapping("/search")
    public ResponseEntity<List<WikiEntryDTO>> search(
            @RequestParam String query,
            @RequestParam(required = false) WikiCategory category,
            @AuthenticationPrincipal User currentUser) {
        List<WikiEntryDTO> entries;
        if (category != null) {
            entries = wikiService.searchByCategory(query, category, currentUser);
        } else {
            entries = wikiService.search(query, currentUser);
        }
        return ResponseEntity.ok(entries);
    }

    @PostMapping
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<WikiEntryDTO> createEntry(
            @Valid @RequestBody CreateWikiEntryRequest request,
            @AuthenticationPrincipal User currentUser) {
        WikiEntryDTO created = wikiService.createEntry(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<WikiEntryDTO> updateEntry(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWikiEntryRequest request,
            @AuthenticationPrincipal User currentUser) {
        WikiEntryDTO updated = wikiService.updateEntry(id, request, currentUser);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<Map<String, String>> deleteEntry(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        wikiService.deleteEntry(id, currentUser);
        return ResponseEntity.ok(Map.of("message", "Wiki entry deleted successfully"));
    }

    @PostMapping("/{entryId}/grant-access/{userId}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<WikiAccessDTO> grantAccess(
            @PathVariable Long entryId,
            @PathVariable Long userId,
            @Valid @RequestBody(required = false) GrantAccessRequest request,
            @AuthenticationPrincipal User currentUser) {
        String reason = request != null ? request.getReason() : null;
        WikiAccessDTO access = wikiService.grantAccess(entryId, userId, reason, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(access);
    }

    @DeleteMapping("/{entryId}/revoke-access/{userId}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<Map<String, String>> revokeAccess(
            @PathVariable Long entryId,
            @PathVariable Long userId,
            @AuthenticationPrincipal User currentUser) {
        wikiService.revokeAccess(entryId, userId, currentUser);
        return ResponseEntity.ok(Map.of("message", "Access revoked successfully"));
    }

    @GetMapping("/{entryId}/access-grants")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<List<WikiAccessDTO>> getAccessGrants(
            @PathVariable Long entryId,
            @AuthenticationPrincipal User currentUser) {
        List<WikiAccessDTO> grants = wikiService.getAccessGrants(entryId, currentUser);
        return ResponseEntity.ok(grants);
    }
}
