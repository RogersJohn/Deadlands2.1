package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.Character;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CharacterRepository extends JpaRepository<Character, Long> {
    // Active characters only (not soft-deleted)
    @Query("SELECT c FROM Character c WHERE c.player.id = :playerId AND c.deletedAt IS NULL")
    List<Character> findByPlayerId(@Param("playerId") Long playerId);

    @Query("SELECT c FROM Character c WHERE c.isNpc = :isNpc AND c.deletedAt IS NULL")
    List<Character> findByIsNpc(@Param("isNpc") Boolean isNpc);

    @Query("SELECT c FROM Character c WHERE c.player.id = :playerId AND c.isNpc = :isNpc AND c.deletedAt IS NULL")
    List<Character> findByPlayerIdAndIsNpc(@Param("playerId") Long playerId, @Param("isNpc") Boolean isNpc);

    @EntityGraph(attributePaths = {"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds", "player"})
    @Query("SELECT c FROM Character c WHERE c.id = :id AND c.deletedAt IS NULL")
    Optional<Character> findByIdWithRelationships(@Param("id") Long id);

    @EntityGraph(attributePaths = {"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds", "player"})
    @Query("SELECT c FROM Character c WHERE c.deletedAt IS NULL")
    List<Character> findAllWithRelationships();

    @EntityGraph(attributePaths = {"skills", "edges", "hindrances", "equipment", "arcanePowers", "wounds", "player"})
    @Query("SELECT c FROM Character c WHERE c.player.id = :playerId AND c.deletedAt IS NULL")
    List<Character> findByPlayerIdWithRelationships(@Param("playerId") Long playerId);

    // Override default findAll to exclude soft-deleted
    @Override
    @Query("SELECT c FROM Character c WHERE c.deletedAt IS NULL")
    List<Character> findAll();

    // Override default findById to exclude soft-deleted
    @Override
    @Query("SELECT c FROM Character c WHERE c.id = :id AND c.deletedAt IS NULL")
    Optional<Character> findById(@Param("id") Long id);

    // Backend-only: Find deleted characters
    @Query("SELECT c FROM Character c WHERE c.deletedAt IS NOT NULL ORDER BY c.deletedAt DESC")
    List<Character> findDeleted();

    // Backend-only: Find all including deleted
    @Query("SELECT c FROM Character c")
    List<Character> findAllIncludingDeleted();

    // Backend-only: Find by ID including deleted (for authorization checks)
    @Query("SELECT c FROM Character c WHERE c.id = :id")
    Optional<Character> findByIdIncludingDeleted(@Param("id") Long id);
}
