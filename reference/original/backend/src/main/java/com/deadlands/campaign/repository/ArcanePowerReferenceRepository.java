package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.ArcanePowerReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ArcanePowerReferenceRepository extends JpaRepository<ArcanePowerReference, Long> {
    Optional<ArcanePowerReference> findByName(String name);
    List<ArcanePowerReference> findByIsTrapping(Boolean isTrapping);
}
