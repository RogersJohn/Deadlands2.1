package com.deadlands.v2.repository;

import com.deadlands.v2.entity.WikiCategory;
import com.deadlands.v2.entity.WikiEntry;
import com.deadlands.v2.entity.WikiVisibility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WikiEntryRepository extends JpaRepository<WikiEntry, Long> {

    Optional<WikiEntry> findBySlug(String slug);

    List<WikiEntry> findByCategory(WikiCategory category);

    List<WikiEntry> findByVisibility(WikiVisibility visibility);

    List<WikiEntry> findByCategoryOrderBySortOrderAsc(WikiCategory category);

    List<WikiEntry> findAllByOrderBySortOrderAsc();

    @Query("SELECT w FROM WikiEntry w WHERE w.visibility = :visibility ORDER BY w.sortOrder ASC")
    List<WikiEntry> findByVisibilityOrdered(@Param("visibility") WikiVisibility visibility);

    @Query("SELECT w FROM WikiEntry w WHERE " +
           "LOWER(w.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(w.content) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<WikiEntry> searchByTitleOrContent(@Param("query") String query);

    @Query("SELECT w FROM WikiEntry w WHERE " +
           "(LOWER(w.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(w.content) LIKE LOWER(CONCAT('%', :query, '%'))) AND " +
           "w.category = :category")
    List<WikiEntry> searchByTitleOrContentAndCategory(@Param("query") String query,
                                                       @Param("category") WikiCategory category);

    @Query("SELECT w FROM WikiEntry w WHERE w.relatedCharacterId = :characterId")
    List<WikiEntry> findByRelatedCharacterId(@Param("characterId") Long characterId);

    boolean existsBySlug(String slug);
}
