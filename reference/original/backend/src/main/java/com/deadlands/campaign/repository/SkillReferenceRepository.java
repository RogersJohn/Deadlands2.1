package com.deadlands.campaign.repository;

import com.deadlands.campaign.model.SkillReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillReferenceRepository extends JpaRepository<SkillReference, Long> {
    Optional<SkillReference> findByName(String name);
    List<SkillReference> findByAttribute(SkillReference.SkillAttribute attribute);
    List<SkillReference> findByIsCoreSkill(Boolean isCoreSkill);
}
