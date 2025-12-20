package com.deadlands.campaign.controller;

import com.deadlands.campaign.model.Character;
import com.deadlands.campaign.model.Equipment;
import com.deadlands.campaign.model.Skill;
import com.deadlands.campaign.model.Edge;
import com.deadlands.campaign.model.User;
import com.deadlands.campaign.model.ArcanePower;
import com.deadlands.campaign.model.ArcanePowerReference;
import com.deadlands.campaign.repository.CharacterRepository;
import com.deadlands.campaign.repository.UserRepository;
import com.deadlands.campaign.repository.ArcanePowerReferenceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/characters")
public class CharacterController {

    private static final Logger log = LoggerFactory.getLogger(CharacterController.class);

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ArcanePowerReferenceRepository arcanePowerReferenceRepository;

    @GetMapping
    public ResponseEntity<List<CharacterDTO>> getAllCharacters(Authentication authentication) {
        log.info("[CharacterController] GET /characters - Auth: {}, Principal: {}",
                authentication != null ? "present" : "NULL",
                authentication != null ? authentication.getName() : "N/A");

        if (authentication == null) {
            log.error("[CharacterController] Authentication is NULL - this should not happen if security is configured correctly");
            return ResponseEntity.status(401).build();
        }

        try {
            User user = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found: " + authentication.getName()));

            log.info("[CharacterController] User found: {} (role: {})", user.getUsername(), user.getRole());

            List<Character> characters;
            if (user.getRole() == User.Role.GAME_MASTER) {
                characters = characterRepository.findAll();
                log.info("[CharacterController] GM mode - fetched all {} characters", characters.size());
            } else {
                characters = characterRepository.findByPlayerId(user.getId());
                log.info("[CharacterController] Player mode - fetched {} characters for player {}",
                        characters.size(), user.getId());
            }

            List<CharacterDTO> characterDTOs = characters.stream()
                    .map(this::toDTO)
                    .toList();

            log.info("[CharacterController] Returning {} character DTOs", characterDTOs.size());
            return ResponseEntity.ok(characterDTOs);
        } catch (Exception e) {
            log.error("[CharacterController] Error fetching characters: {} - {}",
                    e.getClass().getSimpleName(), e.getMessage());
            throw e;
        }
    }

    private CharacterDTO toDTO(Character character) {
        CharacterDTO dto = new CharacterDTO();
        dto.setId(character.getId());
        dto.setName(character.getName());
        dto.setOccupation(character.getOccupation());
        dto.setPace(character.getPace());
        dto.setSize(character.getSize());
        dto.setWind(character.getWind());
        dto.setGrit(character.getGrit());
        dto.setParry(character.getParry());
        dto.setToughness(character.getToughness());
        // Savage Worlds attributes
        dto.setAgilityDie(character.getAgilityDie());
        dto.setSmartsDie(character.getSmartsDie());
        dto.setSpiritDie(character.getSpiritDie());
        dto.setStrengthDie(character.getStrengthDie());
        dto.setVigorDie(character.getVigorDie());
        // Legacy attributes (deprecated)
        dto.setCognitionDie(character.getCognitionDie());
        dto.setDeftnessDie(character.getDeftnessDie());
        dto.setNimblenessDie(character.getNimblenessDie());
        dto.setQuicknessDie(character.getQuicknessDie());
        dto.setNotes(character.getNotes());
        dto.setCharacterImageUrl(character.getCharacterImageUrl());
        dto.setIsNpc(character.getIsNpc());
        // XP tracking
        dto.setTotalXp(character.getTotalXp());
        dto.setSpentXp(character.getSpentXp());
        // Power Points and Fate Chips
        dto.setCurrentPowerPoints(character.getCurrentPowerPoints());
        dto.setMaxPowerPoints(character.getMaxPowerPoints());
        dto.setFateChips(character.getFateChips());
        // Combat State
        dto.setWoundCount(character.getWoundCount());
        dto.setIsShaken(character.getIsShaken());

        // Add player information
        if (character.getPlayer() != null) {
            dto.setPlayerId(character.getPlayer().getId());
            dto.setPlayerName(character.getPlayer().getUsername());
        }

        // Add equipment (for game arena)
        dto.setEquipment(character.getEquipment().stream()
                .map(this::toEquipmentDTO)
                .toList());

        // Add skills (for combat rolls)
        dto.setSkills(character.getSkills().stream()
                .map(this::toSkillDTO)
                .toList());

        // Add edges (for special abilities)
        dto.setEdges(character.getEdges().stream()
                .map(this::toEdgeDTO)
                .toList());

        // Add powers (for arcane characters)
        dto.setPowers(character.getArcanePowers().stream()
                .map(this::toArcanePowerDTO)
                .toList());

        return dto;
    }

    private EquipmentDTO toEquipmentDTO(Equipment equipment) {
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(equipment.getId());
        dto.setName(equipment.getName());
        dto.setDescription(equipment.getDescription());
        dto.setType(equipment.getType() != null ? equipment.getType().toString() : null);
        dto.setQuantity(equipment.getQuantity());
        dto.setDamage(equipment.getDamage());
        dto.setRange(equipment.getRange());
        dto.setRof(equipment.getRof());
        dto.setShots(equipment.getShots());
        dto.setIsEquipped(equipment.getIsEquipped());
        return dto;
    }

    private SkillDTO toSkillDTO(Skill skill) {
        SkillDTO dto = new SkillDTO();
        dto.setId(skill.getId());
        dto.setName(skill.getName());
        dto.setDieValue(skill.getDieValue());
        return dto;
    }

    private EdgeDTO toEdgeDTO(Edge edge) {
        EdgeDTO dto = new EdgeDTO();
        dto.setId(edge.getId());
        dto.setName(edge.getName());
        dto.setDescription(edge.getDescription());
        return dto;
    }

    private ArcanePowerDTO toArcanePowerDTO(ArcanePower arcanePower) {
        ArcanePowerDTO dto = new ArcanePowerDTO();
        if (arcanePower.getPowerReference() != null) {
            ArcanePowerReference ref = arcanePower.getPowerReference();
            dto.setId(ref.getId());
            dto.setName(ref.getName());
            dto.setDescription(ref.getDescription());
            dto.setPowerPoints(ref.getPowerPoints());
            dto.setRange(ref.getRange());
            dto.setDuration(ref.getDuration());
            dto.setEffect(ref.getEffect());
            dto.setTraitRoll(ref.getTraitRoll());
            dto.setArcaneBackgrounds(ref.getArcaneBackgrounds());
        } else {
            // Legacy support - use ArcanePower's own fields if no reference
            dto.setId(arcanePower.getId());
            dto.setName(arcanePower.getName());
        }
        return dto;
    }

    static class CharacterDTO {
        private Long id;
        private String name;
        private String occupation;
        private Integer pace;
        private Integer size;
        private Integer wind;
        private Integer grit;
        private Integer parry;
        private Integer toughness;
        // Savage Worlds attributes
        private String agilityDie;
        private String smartsDie;
        private String spiritDie;
        private String strengthDie;
        private String vigorDie;
        // Legacy attributes (deprecated)
        private String cognitionDie;
        private String deftnessDie;
        private String nimblenessDie;
        private String quicknessDie;
        private String notes;
        private String characterImageUrl;
        private Boolean isNpc;
        private Integer totalXp;
        private Integer spentXp;
        private Integer currentPowerPoints;
        private Integer maxPowerPoints;
        private Integer fateChips;
        private Integer woundCount;
        private Boolean isShaken;
        private Long playerId;
        private String playerName;
        private java.util.List<EquipmentDTO> equipment;
        private java.util.List<SkillDTO> skills;
        private java.util.List<EdgeDTO> edges;
        private java.util.List<ArcanePowerDTO> powers;

        // Getters and setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getOccupation() { return occupation; }
        public void setOccupation(String occupation) { this.occupation = occupation; }
        public Integer getPace() { return pace; }
        public void setPace(Integer pace) { this.pace = pace; }
        public Integer getSize() { return size; }
        public void setSize(Integer size) { this.size = size; }
        public Integer getWind() { return wind; }
        public void setWind(Integer wind) { this.wind = wind; }
        public Integer getGrit() { return grit; }
        public void setGrit(Integer grit) { this.grit = grit; }
        public Integer getParry() { return parry; }
        public void setParry(Integer parry) { this.parry = parry; }
        public Integer getToughness() { return toughness; }
        public void setToughness(Integer toughness) { this.toughness = toughness; }
        public String getAgilityDie() { return agilityDie; }
        public void setAgilityDie(String agilityDie) { this.agilityDie = agilityDie; }
        public String getCognitionDie() { return cognitionDie; }
        public void setCognitionDie(String cognitionDie) { this.cognitionDie = cognitionDie; }
        public String getDeftnessDie() { return deftnessDie; }
        public void setDeftnessDie(String deftnessDie) { this.deftnessDie = deftnessDie; }
        public String getNimblenessDie() { return nimblenessDie; }
        public void setNimblenessDie(String nimblenessDie) { this.nimblenessDie = nimblenessDie; }
        public String getQuicknessDie() { return quicknessDie; }
        public void setQuicknessDie(String quicknessDie) { this.quicknessDie = quicknessDie; }
        public String getSmartsDie() { return smartsDie; }
        public void setSmartsDie(String smartsDie) { this.smartsDie = smartsDie; }
        public String getSpiritDie() { return spiritDie; }
        public void setSpiritDie(String spiritDie) { this.spiritDie = spiritDie; }
        public String getStrengthDie() { return strengthDie; }
        public void setStrengthDie(String strengthDie) { this.strengthDie = strengthDie; }
        public String getVigorDie() { return vigorDie; }
        public void setVigorDie(String vigorDie) { this.vigorDie = vigorDie; }
        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }
        public String getCharacterImageUrl() { return characterImageUrl; }
        public void setCharacterImageUrl(String characterImageUrl) { this.characterImageUrl = characterImageUrl; }
        public Boolean getIsNpc() { return isNpc; }
        public void setIsNpc(Boolean isNpc) { this.isNpc = isNpc; }
        public Integer getTotalXp() { return totalXp; }
        public void setTotalXp(Integer totalXp) { this.totalXp = totalXp; }
        public Integer getSpentXp() { return spentXp; }
        public void setSpentXp(Integer spentXp) { this.spentXp = spentXp; }
        public Integer getCurrentPowerPoints() { return currentPowerPoints; }
        public void setCurrentPowerPoints(Integer currentPowerPoints) { this.currentPowerPoints = currentPowerPoints; }
        public Integer getMaxPowerPoints() { return maxPowerPoints; }
        public void setMaxPowerPoints(Integer maxPowerPoints) { this.maxPowerPoints = maxPowerPoints; }
        public Integer getFateChips() { return fateChips; }
        public void setFateChips(Integer fateChips) { this.fateChips = fateChips; }
        public Integer getWoundCount() { return woundCount; }
        public void setWoundCount(Integer woundCount) { this.woundCount = woundCount; }
        public Boolean getIsShaken() { return isShaken; }
        public void setIsShaken(Boolean isShaken) { this.isShaken = isShaken; }
        public Long getPlayerId() { return playerId; }
        public void setPlayerId(Long playerId) { this.playerId = playerId; }
        public String getPlayerName() { return playerName; }
        public void setPlayerName(String playerName) { this.playerName = playerName; }
        public java.util.List<EquipmentDTO> getEquipment() { return equipment; }
        public void setEquipment(java.util.List<EquipmentDTO> equipment) { this.equipment = equipment; }
        public java.util.List<SkillDTO> getSkills() { return skills; }
        public void setSkills(java.util.List<SkillDTO> skills) { this.skills = skills; }
        public java.util.List<EdgeDTO> getEdges() { return edges; }
        public void setEdges(java.util.List<EdgeDTO> edges) { this.edges = edges; }
        public java.util.List<ArcanePowerDTO> getPowers() { return powers; }
        public void setPowers(java.util.List<ArcanePowerDTO> powers) { this.powers = powers; }
    }

    static class EquipmentDTO {
        private Long id;
        private String name;
        private String description;
        private String type;
        private Integer quantity;
        private String damage;
        private String range;
        private Integer rof;
        private Integer shots;
        private Boolean isEquipped;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
        public String getDamage() { return damage; }
        public void setDamage(String damage) { this.damage = damage; }
        public String getRange() { return range; }
        public void setRange(String range) { this.range = range; }
        public Integer getRof() { return rof; }
        public void setRof(Integer rof) { this.rof = rof; }
        public Integer getShots() { return shots; }
        public void setShots(Integer shots) { this.shots = shots; }
        public Boolean getIsEquipped() { return isEquipped; }
        public void setIsEquipped(Boolean isEquipped) { this.isEquipped = isEquipped; }
    }

    static class SkillDTO {
        private Long id;
        private String name;
        private String dieValue;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDieValue() { return dieValue; }
        public void setDieValue(String dieValue) { this.dieValue = dieValue; }
    }

    static class EdgeDTO {
        private Long id;
        private String name;
        private String description;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    static class ArcanePowerDTO {
        private Long id;
        private String name;
        private String description;
        private Integer powerPoints;
        private String range;
        private String duration;
        private String effect;
        private String traitRoll;
        private String arcaneBackgrounds;

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getPowerPoints() { return powerPoints; }
        public void setPowerPoints(Integer powerPoints) { this.powerPoints = powerPoints; }
        public String getRange() { return range; }
        public void setRange(String range) { this.range = range; }
        public String getDuration() { return duration; }
        public void setDuration(String duration) { this.duration = duration; }
        public String getEffect() { return effect; }
        public void setEffect(String effect) { this.effect = effect; }
        public String getTraitRoll() { return traitRoll; }
        public void setTraitRoll(String traitRoll) { this.traitRoll = traitRoll; }
        public String getArcaneBackgrounds() { return arcaneBackgrounds; }
        public void setArcaneBackgrounds(String arcaneBackgrounds) { this.arcaneBackgrounds = arcaneBackgrounds; }
    }

    @GetMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<Character> getCharacterById(@PathVariable Long id, Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if user has permission to view this character
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Trigger lazy loading within transaction before returning
        character.getSkills().size();
        character.getEdges().size();
        character.getHindrances().size();
        character.getEquipment().size();
        character.getArcanePowers().size();
        character.getWounds().size();

        return ResponseEntity.ok(character);
    }

    @PostMapping
    public ResponseEntity<Character> createCharacter(@RequestBody Character character, Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        character.setPlayer(user);

        // Set bidirectional relationships for all child entities
        if (character.getSkills() != null) {
            character.getSkills().forEach(skill -> skill.setCharacter(character));
        }
        if (character.getEdges() != null) {
            character.getEdges().forEach(edge -> edge.setCharacter(character));
        }
        if (character.getHindrances() != null) {
            character.getHindrances().forEach(hindrance -> hindrance.setCharacter(character));
        }
        if (character.getEquipment() != null) {
            character.getEquipment().forEach(equipment -> equipment.setCharacter(character));
        }
        if (character.getArcanePowers() != null) {
            character.getArcanePowers().forEach(power -> power.setCharacter(character));
        }

        Character savedCharacter = characterRepository.save(character);
        return ResponseEntity.ok(savedCharacter);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Character> updateCharacter(@PathVariable Long id,
                                                      @RequestBody Character characterDetails,
                                                      Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if user has permission to edit this character
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Update basic character fields
        character.setName(characterDetails.getName());
        character.setOccupation(characterDetails.getOccupation());
        character.setIsNpc(characterDetails.getIsNpc());
        character.setNotes(characterDetails.getNotes());
        character.setCharacterImageUrl(characterDetails.getCharacterImageUrl());

        // Update legacy attribute dies (deprecated, but still supported)
        character.setCognitionDie(characterDetails.getCognitionDie());
        character.setDeftnessDie(characterDetails.getDeftnessDie());
        character.setNimblenessDie(characterDetails.getNimblenessDie());
        character.setQuicknessDie(characterDetails.getQuicknessDie());

        // Update Savage Worlds attribute dies
        character.setAgilityDie(characterDetails.getAgilityDie());
        character.setSmartsDie(characterDetails.getSmartsDie());
        character.setSpiritDie(characterDetails.getSpiritDie());
        character.setStrengthDie(characterDetails.getStrengthDie());
        character.setVigorDie(characterDetails.getVigorDie());

        // Update derived stats
        character.setPace(characterDetails.getPace());
        character.setSize(characterDetails.getSize());
        character.setGrit(characterDetails.getGrit());
        character.setParry(characterDetails.getParry());
        character.setToughness(characterDetails.getToughness());
        character.setCharisma(characterDetails.getCharisma());

        // Update XP tracking
        character.setTotalXp(characterDetails.getTotalXp());
        character.setSpentXp(characterDetails.getSpentXp());

        // Update skills collection
        character.getSkills().clear();
        if (characterDetails.getSkills() != null) {
            characterDetails.getSkills().forEach(skill -> {
                skill.setCharacter(character);
                character.getSkills().add(skill);
            });
        }

        // Update edges collection
        character.getEdges().clear();
        if (characterDetails.getEdges() != null) {
            characterDetails.getEdges().forEach(edge -> {
                edge.setCharacter(character);
                character.getEdges().add(edge);
            });
        }

        // Update hindrances collection
        character.getHindrances().clear();
        if (characterDetails.getHindrances() != null) {
            characterDetails.getHindrances().forEach(hindrance -> {
                hindrance.setCharacter(character);
                character.getHindrances().add(hindrance);
            });
        }

        // Update equipment collection
        character.getEquipment().clear();
        if (characterDetails.getEquipment() != null) {
            characterDetails.getEquipment().forEach(equipment -> {
                equipment.setCharacter(character);
                character.getEquipment().add(equipment);
            });
        }

        // Update arcane powers collection
        character.getArcanePowers().clear();
        if (characterDetails.getArcanePowers() != null) {
            characterDetails.getArcanePowers().forEach(power -> {
                power.setCharacter(character);
                character.getArcanePowers().add(power);
            });
        }

        Character updatedCharacter = characterRepository.save(character);
        return ResponseEntity.ok(updatedCharacter);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCharacter(@PathVariable Long id, Authentication authentication) {
        // Use findByIdIncludingDeleted to prevent double-deletion
        Character character = characterRepository.findByIdIncludingDeleted(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if user has permission to delete this character (owner OR GM)
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // Check if already deleted
        if (character.getDeletedAt() != null) {
            return ResponseEntity.status(410).body("Character already deleted"); // 410 Gone
        }

        // Soft delete: set deletedAt and deletedBy
        character.setDeletedAt(java.time.LocalDateTime.now());
        character.setDeletedBy(user);
        characterRepository.save(character);

        return ResponseEntity.noContent().build();
    }

    /**
     * Spend power points (for casting powers).
     * POST /api/characters/{id}/power-points/spend
     */
    @PostMapping("/{id}/power-points/spend")
    public ResponseEntity<?> spendPowerPoints(@PathVariable Long id,
                                               @RequestBody PowerPointsRequest request,
                                               Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check permission: owner or GM
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Not authorized to modify this character");
        }

        int amount = request.getAmount();
        if (amount <= 0) {
            return ResponseEntity.badRequest().body("Amount must be positive");
        }

        if (character.getCurrentPowerPoints() < amount) {
            return ResponseEntity.badRequest().body("Insufficient power points");
        }

        character.setCurrentPowerPoints(character.getCurrentPowerPoints() - amount);
        characterRepository.save(character);

        return ResponseEntity.ok(Map.of(
                "currentPowerPoints", character.getCurrentPowerPoints(),
                "maxPowerPoints", character.getMaxPowerPoints()
        ));
    }

    /**
     * Restore power points (natural recovery, rest, or GM action).
     * POST /api/characters/{id}/power-points/restore
     */
    @PostMapping("/{id}/power-points/restore")
    public ResponseEntity<?> restorePowerPoints(@PathVariable Long id,
                                                 @RequestBody PowerPointsRequest request,
                                                 Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check permission: owner or GM
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Not authorized to modify this character");
        }

        int amount = request.getAmount();
        if (amount <= 0) {
            return ResponseEntity.badRequest().body("Amount must be positive");
        }

        int newAmount = Math.min(
                character.getCurrentPowerPoints() + amount,
                character.getMaxPowerPoints()
        );
        character.setCurrentPowerPoints(newAmount);
        characterRepository.save(character);

        return ResponseEntity.ok(Map.of(
                "currentPowerPoints", character.getCurrentPowerPoints(),
                "maxPowerPoints", character.getMaxPowerPoints()
        ));
    }

    /**
     * Spend a fate chip (benny).
     * POST /api/characters/{id}/fate-chips/spend
     */
    @PostMapping("/{id}/fate-chips/spend")
    public ResponseEntity<?> spendFateChip(@PathVariable Long id,
                                            Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check permission: owner or GM
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Not authorized to modify this character");
        }

        if (character.getFateChips() <= 0) {
            return ResponseEntity.badRequest().body("No fate chips remaining");
        }

        character.setFateChips(character.getFateChips() - 1);
        characterRepository.save(character);

        return ResponseEntity.ok(Map.of("fateChips", character.getFateChips()));
    }

    /**
     * Gain a fate chip (GM award, or start of session).
     * POST /api/characters/{id}/fate-chips/gain
     */
    @PostMapping("/{id}/fate-chips/gain")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<?> gainFateChip(@PathVariable Long id) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        character.setFateChips(character.getFateChips() + 1);
        characterRepository.save(character);

        return ResponseEntity.ok(Map.of("fateChips", character.getFateChips()));
    }

    /**
     * Apply damage to a character (Savage Worlds damage system).
     * POST /api/characters/{id}/combat/damage
     */
    @PostMapping("/{id}/combat/damage")
    public ResponseEntity<?> applyDamage(@PathVariable Long id,
                                          @RequestBody DamageRequest request,
                                          Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // GM can apply damage to anyone, players only to their own characters
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Not authorized to modify this character");
        }

        int damageTotal = request.getDamage();
        int toughness = character.getToughness();

        // Savage Worlds damage rules:
        // - If damage < Toughness: No effect (or Shaken if already Shaken)
        // - If damage >= Toughness: Shaken (if not already wounded)
        // - If damage >= Toughness + 4: 1 wound per 4 points over Toughness

        if (damageTotal < toughness) {
            // No damage - but if already Shaken, might take a wound
            if (character.getIsShaken()) {
                character.setWoundCount(Math.min(character.getWoundCount() + 1, 4));
                character.setIsShaken(false); // Taking wound clears Shaken
            }
        } else {
            // Damage exceeds Toughness
            int excessDamage = damageTotal - toughness;
            int woundsToAdd = 1 + (excessDamage / 4); // 1 wound + 1 per raise (4 points)

            if (character.getWoundCount() == 0 && woundsToAdd == 1 && !character.getIsShaken()) {
                // First hit with only 1 wound = Shaken instead
                character.setIsShaken(true);
            } else {
                // Add wounds
                character.setWoundCount(Math.min(character.getWoundCount() + woundsToAdd, 4));
                character.setIsShaken(false); // Wounds clear Shaken
            }
        }

        characterRepository.save(character);

        return ResponseEntity.ok(Map.of(
                "woundCount", character.getWoundCount(),
                "isShaken", character.getIsShaken(),
                "isIncapacitated", character.getWoundCount() >= 4
        ));
    }

    /**
     * Soak damage (spend fate chip + Vigor roll to remove wounds).
     * POST /api/characters/{id}/combat/soak
     */
    @PostMapping("/{id}/combat/soak")
    public ResponseEntity<?> soakDamage(@PathVariable Long id,
                                         @RequestBody SoakRequest request,
                                         Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Owner or GM can soak
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Not authorized to modify this character");
        }

        // Must have fate chips to soak
        if (character.getFateChips() <= 0) {
            return ResponseEntity.badRequest().body("No fate chips remaining");
        }

        // Must have wounds to soak
        if (character.getWoundCount() <= 0) {
            return ResponseEntity.badRequest().body("No wounds to soak");
        }

        // Spend the fate chip
        character.setFateChips(character.getFateChips() - 1);

        // Vigor roll result (passed from frontend or rolled here)
        // For simplicity, frontend should roll and pass the total
        int vigorRollTotal = request.getVigorRoll();
        int targetNumber = 4; // Standard TN for Vigor soak

        // Calculate successes: base success + raises (every 4 over)
        int margin = vigorRollTotal - targetNumber;
        int woundsRemoved = 0;

        if (margin >= 0) {
            woundsRemoved = 1 + (margin / 4); // 1 for success + 1 per raise
        }

        // Remove wounds (min 0)
        int newWoundCount = Math.max(character.getWoundCount() - woundsRemoved, 0);
        character.setWoundCount(newWoundCount);

        characterRepository.save(character);

        return ResponseEntity.ok(Map.of(
                "woundCount", character.getWoundCount(),
                "woundsRemoved", woundsRemoved,
                "fateChips", character.getFateChips(),
                "vigorRoll", vigorRollTotal
        ));
    }

    /**
     * Recover from Shaken (Spirit roll).
     * POST /api/characters/{id}/combat/recover
     */
    @PostMapping("/{id}/combat/recover")
    public ResponseEntity<?> recoverFromShaken(@PathVariable Long id,
                                                 @RequestBody RecoverRequest request,
                                                 Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Owner or GM can attempt recovery
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Not authorized to modify this character");
        }

        // Must be Shaken to recover
        if (!character.getIsShaken()) {
            return ResponseEntity.badRequest().body("Character is not Shaken");
        }

        // Spirit roll (passed from frontend)
        int spiritRollTotal = request.getSpiritRoll();
        int targetNumber = 4; // Standard TN

        boolean recovered = spiritRollTotal >= targetNumber;

        if (recovered) {
            character.setIsShaken(false);
        }

        characterRepository.save(character);

        return ResponseEntity.ok(Map.of(
                "isShaken", character.getIsShaken(),
                "recovered", recovered,
                "spiritRoll", spiritRollTotal
        ));
    }

    /**
     * Cast a power (spend power points and invoke power effect).
     * POST /api/characters/{id}/powers/cast
     */
    @PostMapping("/{id}/powers/cast")
    public ResponseEntity<?> castPower(@PathVariable Long id,
                                        @RequestBody CastPowerRequest request,
                                        Authentication authentication) {
        Character character = characterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Character not found"));

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Owner or GM can cast powers
        if (user.getRole() != User.Role.GAME_MASTER &&
            !character.getPlayer().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("Not authorized to modify this character");
        }

        // Get the power reference
        ArcanePowerReference powerRef = arcanePowerReferenceRepository.findById(request.getPowerReferenceId())
                .orElseThrow(() -> new RuntimeException("Power not found"));

        // Validate character knows this power
        boolean knowsPower = character.getArcanePowers().stream()
                .anyMatch(ap -> ap.getPowerReference() != null &&
                               ap.getPowerReference().getId().equals(powerRef.getId()));

        if (!knowsPower) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Character does not know this power"));
        }

        // Validate sufficient power points
        int powerCost = powerRef.getPowerPoints() != null ? powerRef.getPowerPoints() : 0;
        if (character.getCurrentPowerPoints() < powerCost) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Insufficient power points"));
        }

        // Deduct power points
        character.setCurrentPowerPoints(character.getCurrentPowerPoints() - powerCost);
        characterRepository.save(character);

        // Return updated state and power details
        return ResponseEntity.ok(Map.of(
                "currentPowerPoints", character.getCurrentPowerPoints(),
                "maxPowerPoints", character.getMaxPowerPoints(),
                "powerCast", powerRef.getName(),
                "powerEffect", powerRef.getEffect() != null ? powerRef.getEffect() : "",
                "powerCost", powerCost,
                "targetId", request.getTargetId() != null ? request.getTargetId() : 0
        ));
    }

    // Request DTOs
    static class PowerPointsRequest {
        private int amount;

        public int getAmount() { return amount; }
        public void setAmount(int amount) { this.amount = amount; }
    }

    static class DamageRequest {
        private int damage;

        public int getDamage() { return damage; }
        public void setDamage(int damage) { this.damage = damage; }
    }

    static class SoakRequest {
        private int vigorRoll;

        public int getVigorRoll() { return vigorRoll; }
        public void setVigorRoll(int vigorRoll) { this.vigorRoll = vigorRoll; }
    }

    static class RecoverRequest {
        private int spiritRoll;

        public int getSpiritRoll() { return spiritRoll; }
        public void setSpiritRoll(int spiritRoll) { this.spiritRoll = spiritRoll; }
    }

    static class CastPowerRequest {
        private Long powerReferenceId;
        private Long targetId; // Character or enemy ID (null for self/area powers)
        private Integer gridX;  // For area effect powers
        private Integer gridY;

        public Long getPowerReferenceId() { return powerReferenceId; }
        public void setPowerReferenceId(Long powerReferenceId) { this.powerReferenceId = powerReferenceId; }

        public Long getTargetId() { return targetId; }
        public void setTargetId(Long targetId) { this.targetId = targetId; }

        public Integer getGridX() { return gridX; }
        public void setGridX(Integer gridX) { this.gridX = gridX; }

        public Integer getGridY() { return gridY; }
        public void setGridY(Integer gridY) { this.gridY = gridY; }
    }
}
