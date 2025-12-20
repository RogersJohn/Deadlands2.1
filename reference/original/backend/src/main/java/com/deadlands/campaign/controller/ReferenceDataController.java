package com.deadlands.campaign.controller;

import com.deadlands.campaign.model.*;
import com.deadlands.campaign.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/reference")
@CrossOrigin(origins = "*")
public class ReferenceDataController {

    @Autowired
    private SkillReferenceRepository skillReferenceRepository;

    @Autowired
    private EdgeReferenceRepository edgeReferenceRepository;

    @Autowired
    private HindranceReferenceRepository hindranceReferenceRepository;

    @Autowired
    private EquipmentReferenceRepository equipmentReferenceRepository;

    @Autowired
    private ArcanePowerReferenceRepository arcanePowerReferenceRepository;

    // Skills
    @GetMapping("/skills")
    public ResponseEntity<List<SkillReference>> getAllSkills() {
        return ResponseEntity.ok(skillReferenceRepository.findAll());
    }

    @GetMapping("/skills/{id}")
    public ResponseEntity<SkillReference> getSkillById(@PathVariable Long id) {
        return skillReferenceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/skills/by-attribute/{attribute}")
    public ResponseEntity<List<SkillReference>> getSkillsByAttribute(
            @PathVariable SkillReference.SkillAttribute attribute) {
        return ResponseEntity.ok(skillReferenceRepository.findByAttribute(attribute));
    }

    // Edges
    @GetMapping("/edges")
    public ResponseEntity<List<EdgeReference>> getAllEdges() {
        return ResponseEntity.ok(edgeReferenceRepository.findAll());
    }

    @GetMapping("/edges/{id}")
    public ResponseEntity<EdgeReference> getEdgeById(@PathVariable Long id) {
        return edgeReferenceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/edges/by-type/{type}")
    public ResponseEntity<List<EdgeReference>> getEdgesByType(
            @PathVariable EdgeReference.EdgeType type) {
        return ResponseEntity.ok(edgeReferenceRepository.findByType(type));
    }

    // Hindrances
    @GetMapping("/hindrances")
    public ResponseEntity<List<HindranceReference>> getAllHindrances() {
        return ResponseEntity.ok(hindranceReferenceRepository.findAll());
    }

    @GetMapping("/hindrances/{id}")
    public ResponseEntity<HindranceReference> getHindranceById(@PathVariable Long id) {
        return hindranceReferenceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/hindrances/by-severity/{severity}")
    public ResponseEntity<List<HindranceReference>> getHindrancesBySeverity(
            @PathVariable HindranceReference.Severity severity) {
        return ResponseEntity.ok(hindranceReferenceRepository.findBySeverity(severity));
    }

    // Equipment
    @GetMapping("/equipment")
    public ResponseEntity<List<EquipmentReference>> getAllEquipment() {
        return ResponseEntity.ok(equipmentReferenceRepository.findAll());
    }

    @GetMapping("/equipment/{id}")
    public ResponseEntity<EquipmentReference> getEquipmentById(@PathVariable Long id) {
        return equipmentReferenceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/equipment/by-type/{type}")
    public ResponseEntity<List<EquipmentReference>> getEquipmentByType(
            @PathVariable EquipmentReference.EquipmentType type) {
        return ResponseEntity.ok(equipmentReferenceRepository.findByType(type));
    }

    // Arcane Powers
    @GetMapping("/powers")
    public ResponseEntity<List<ArcanePowerReference>> getAllPowers() {
        return ResponseEntity.ok(arcanePowerReferenceRepository.findAll());
    }

    @GetMapping("/powers/{id}")
    public ResponseEntity<ArcanePowerReference> getPowerById(@PathVariable Long id) {
        return arcanePowerReferenceRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
