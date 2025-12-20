package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.TokenPosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for TokenPosition entities.
 *
 * Provides methods to find, update, and delete token positions on the map.
 */
@Repository
public interface TokenPositionRepository extends JpaRepository<TokenPosition, Long> {

    /**
     * Find a token position by its token ID.
     *
     * @param tokenId The unique token identifier
     * @return Optional containing the token position if found
     */
    Optional<TokenPosition> findByTokenId(String tokenId);

    /**
     * Check if a token position exists for a given token ID.
     *
     * @param tokenId The unique token identifier
     * @return True if position exists, false otherwise
     */
    boolean existsByTokenId(String tokenId);

    /**
     * Delete a token position by its token ID.
     *
     * @param tokenId The unique token identifier
     */
    void deleteByTokenId(String tokenId);

    /**
     * Delete all token positions (used when GM changes maps).
     */
    @Query("DELETE FROM TokenPosition")
    void deleteAllPositions();
}
