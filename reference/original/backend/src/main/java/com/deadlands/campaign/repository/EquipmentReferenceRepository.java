package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.EquipmentReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EquipmentReferenceRepository extends JpaRepository<EquipmentReference, Long> {
    Optional<EquipmentReference> findByName(String name);
    List<EquipmentReference> findByType(EquipmentReference.EquipmentType type);
}
