package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.WikiAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WikiAccessRepository extends JpaRepository<WikiAccess, Long> {

    @Query("SELECT wa FROM WikiAccess wa WHERE wa.wikiEntry.id = :wikiEntryId AND wa.user.id = :userId")
    Optional<WikiAccess> findByWikiEntryIdAndUserId(@Param("wikiEntryId") Long wikiEntryId, @Param("userId") Long userId);

    @Query("SELECT wa FROM WikiAccess wa WHERE wa.wikiEntry.id = :wikiEntryId")
    List<WikiAccess> findByWikiEntryId(@Param("wikiEntryId") Long wikiEntryId);

    @Query("SELECT wa FROM WikiAccess wa WHERE wa.user.id = :userId")
    List<WikiAccess> findByUserId(@Param("userId") Long userId);

    @Query("SELECT wa.wikiEntry.id FROM WikiAccess wa WHERE wa.user.id = :userId")
    List<Long> findWikiEntryIdsByUserId(@Param("userId") Long userId);
}
