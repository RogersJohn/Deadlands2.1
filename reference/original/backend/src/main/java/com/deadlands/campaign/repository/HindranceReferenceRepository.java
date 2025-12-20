package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.HindranceReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HindranceReferenceRepository extends JpaRepository<HindranceReference, Long> {
    Optional<HindranceReference> findByName(String name);
    List<HindranceReference> findBySeverity(HindranceReference.Severity severity);
}
