package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.BattleMap;
import com.deadlands.campaign.model.BattleTheme;
import com.deadlands.campaign.model.MapType;
import com.deadlands.campaign.model.MapVisibility;
import com.deadlands.campaign.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BattleMapRepository extends JpaRepository<BattleMap, Long> {

    // Find maps created by specific user, ordered by most recent
    List<BattleMap> findByCreatedByOrderByCreatedAtDesc(User user);

    // Find public maps for map library
    List<BattleMap> findByVisibilityOrderByCreatedAtDesc(MapVisibility visibility);

    // Find maps by type with visibility filter
    List<BattleMap> findByTypeAndVisibilityIn(MapType type, List<MapVisibility> visibilities);

    // Find maps by theme with visibility filter
    List<BattleMap> findByThemeAndVisibilityIn(BattleTheme theme, List<MapVisibility> visibilities);

    // Find maps by tag (partial match) with visibility filter
    @Query("SELECT bm FROM BattleMap bm WHERE bm.tags LIKE %:tag% AND bm.visibility IN :visibilities ORDER BY bm.createdAt DESC")
    List<BattleMap> findByTagsContainingAndVisibilityIn(@Param("tag") String tag, @Param("visibilities") List<MapVisibility> visibilities);

    // Find all maps a user can access (their own + public)
    @Query("SELECT bm FROM BattleMap bm WHERE bm.createdBy = :user OR bm.visibility = 'PUBLIC' ORDER BY bm.createdAt DESC")
    List<BattleMap> findAccessibleMaps(@Param("user") User user);
}
