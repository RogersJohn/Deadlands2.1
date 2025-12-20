package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.InitiativeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for InitiativeEntry entities.
 */
@Repository
public interface InitiativeEntryRepository extends JpaRepository<InitiativeEntry, Long> {

    /**
     * Find all initiative entries for the current game state, ordered by sort value (highest first).
     */
    @Query("SELECT i FROM InitiativeEntry i WHERE i.gameState.id = 1 ORDER BY i.sortValue DESC")
    List<InitiativeEntry> findAllOrdered();

    /**
     * Find initiative entry by character ID.
     */
    @Query("SELECT i FROM InitiativeEntry i WHERE i.gameState.id = 1 AND i.characterId = ?1")
    InitiativeEntry findByCharacterId(Long characterId);

    /**
     * Find initiative entry by NPC name.
     */
    @Query("SELECT i FROM InitiativeEntry i WHERE i.gameState.id = 1 AND i.characterName = ?1 AND i.isPlayer = false")
    InitiativeEntry findByNpcName(String npcName);

    /**
     * Delete all initiative entries for the game state.
     */
    @Modifying
    @Query("DELETE FROM InitiativeEntry i WHERE i.gameState.id = 1")
    void deleteAllForGameState();

    /**
     * Count how many characters haven't acted yet.
     */
    @Query("SELECT COUNT(i) FROM InitiativeEntry i WHERE i.gameState.id = 1 AND i.hasActed = false")
    int countNotActed();
}
