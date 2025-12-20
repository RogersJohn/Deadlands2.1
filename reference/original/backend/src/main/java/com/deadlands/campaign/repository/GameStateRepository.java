package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.GameState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for the singleton GameState entity.
 *
 * There is only ONE GameState record (id = 1) in the database.
 */
@Repository
public interface GameStateRepository extends JpaRepository<GameState, Long> {
    // No additional methods needed - use findById(1L) to get the singleton
}
