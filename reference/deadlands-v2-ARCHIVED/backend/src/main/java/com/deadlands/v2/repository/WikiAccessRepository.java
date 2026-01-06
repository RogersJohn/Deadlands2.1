package com.deadlands.v2.repository;

import com.deadlands.v2.entity.WikiAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WikiAccessRepository extends JpaRepository<WikiAccess, Long> {

    @Query("SELECT wa FROM WikiAccess wa WHERE wa.wikiEntry.id = :entryId AND wa.user.id = :userId")
    Optional<WikiAccess> findByWikiEntryIdAndUserId(@Param("entryId") Long entryId,
                                                     @Param("userId") Long userId);

    @Query("SELECT wa FROM WikiAccess wa WHERE wa.wikiEntry.id = :entryId")
    List<WikiAccess> findByWikiEntryId(@Param("entryId") Long entryId);

    @Query("SELECT wa FROM WikiAccess wa WHERE wa.user.id = :userId")
    List<WikiAccess> findByUserId(@Param("userId") Long userId);

    @Query("SELECT wa.wikiEntry.id FROM WikiAccess wa WHERE wa.user.id = :userId")
    List<Long> findWikiEntryIdsByUserId(@Param("userId") Long userId);

    boolean existsByWikiEntryIdAndUserId(Long entryId, Long userId);

    void deleteByWikiEntryIdAndUserId(Long entryId, Long userId);
}
