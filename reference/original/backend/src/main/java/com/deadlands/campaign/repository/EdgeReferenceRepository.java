package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.EdgeReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EdgeReferenceRepository extends JpaRepository<EdgeReference, Long> {
    Optional<EdgeReference> findByName(String name);
    List<EdgeReference> findByType(EdgeReference.EdgeType type);
    List<EdgeReference> findByRankRequired(String rankRequired);
}
