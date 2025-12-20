package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.WikiEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WikiEntryRepository extends JpaRepository<WikiEntry, Long> {

    @Query("SELECT w FROM WikiEntry w " +
           "LEFT JOIN FETCH w.relatedCharacter c " +
           "LEFT JOIN FETCH c.player " +
           "WHERE w.slug = :slug")
    Optional<WikiEntry> findBySlug(@Param("slug") String slug);

    @Query("SELECT DISTINCT w FROM WikiEntry w " +
           "LEFT JOIN FETCH w.relatedCharacter c " +
           "LEFT JOIN FETCH c.player " +
           "WHERE w.category = :category " +
           "ORDER BY w.sortOrder, w.title")
    List<WikiEntry> findByCategory(@Param("category") WikiEntry.Category category);

    List<WikiEntry> findByIsPublicTrue();

    @Query("SELECT w FROM WikiEntry w WHERE w.relatedCharacter.id = :characterId")
    List<WikiEntry> findByRelatedCharacterId(@Param("characterId") Long characterId);

    @Query("SELECT DISTINCT w FROM WikiEntry w " +
           "LEFT JOIN FETCH w.relatedCharacter c " +
           "LEFT JOIN FETCH c.player " +
           "ORDER BY w.category, w.sortOrder, w.title")
    List<WikiEntry> findAllOrdered();
}
