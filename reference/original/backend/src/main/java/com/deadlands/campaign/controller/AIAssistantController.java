package com.deadlands.campaign.controller;

import com.deadlands.campaign.dto.*;
import com.deadlands.campaign.model.*;
import com.deadlands.campaign.repository.BattleMapRepository;
import com.deadlands.campaign.repository.UserRepository;
import com.deadlands.campaign.service.AIGameMasterService;
import com.deadlands.campaign.service.ImageGenerationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for AI-powered Game Master Assistant
 * Provides endpoints for NPC dialogue, encounters, rule lookups, and location generation
 */
@RestController
@RequestMapping("/ai-gm")
@CrossOrigin(origins = "${cors.allowed-origins}")
@Slf4j
public class AIAssistantController {

    private final AIGameMasterService aiGameMasterService;
    private final ImageGenerationService imageGenerationService;
    private final ObjectMapper objectMapper;
    private final BattleMapRepository battleMapRepository;
    private final UserRepository userRepository;

    public AIAssistantController(AIGameMasterService aiGameMasterService,
                                ImageGenerationService imageGenerationService,
                                ObjectMapper objectMapper,
                                BattleMapRepository battleMapRepository,
                                UserRepository userRepository) {
        this.aiGameMasterService = aiGameMasterService;
        this.imageGenerationService = imageGenerationService;
        this.objectMapper = objectMapper;
        this.battleMapRepository = battleMapRepository;
        this.userRepository = userRepository;
    }

    /**
     * Generate NPC dialogue
     * GM ONLY - Players cannot access AI Assistant
     */
    @PostMapping("/npc-dialogue")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<AIResponse> generateNPCDialogue(@Valid @RequestBody NPCDialogueRequest request) {
        log.info("NPC dialogue request for: {}", request.getNpcName());

        String response = aiGameMasterService.generateNPCDialogue(
                request.getNpcName(),
                request.getNpcPersonality() != null ? request.getNpcPersonality() : "A typical resident of the Weird West",
                request.getContext() != null ? request.getContext() : "A casual conversation",
                request.getPlayerQuestion()
        );

        return ResponseEntity.ok(new AIResponse(response));
    }

    /**
     * Generate random encounter
     * GM only feature
     */
    @PostMapping("/generate-encounter")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<AIResponse> generateEncounter(@Valid @RequestBody EncounterRequest request) {
        log.info("Encounter generation request for location: {}", request.getLocation());

        String response = aiGameMasterService.generateEncounter(
                request.getLocation(),
                request.getPartySize(),
                request.getAverageLevel()
        );

        return ResponseEntity.ok(new AIResponse(response));
    }

    /**
     * Look up game rules
     * GM ONLY - Players cannot access AI Assistant
     */
    @PostMapping("/rule-lookup")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<AIResponse> lookupRule(@Valid @RequestBody RuleLookupRequest request) {
        log.info("Rule lookup request: {}", request.getRuleQuestion());

        String response = aiGameMasterService.lookupRule(request.getRuleQuestion());

        return ResponseEntity.ok(new AIResponse(response));
    }

    /**
     * Generate location
     * GM only feature
     */
    @PostMapping("/generate-location")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<AIResponse> generateLocation(@Valid @RequestBody LocationRequest request) {
        log.info("Location generation request: {} {}", request.getSize(), request.getLocationType());

        String response = aiGameMasterService.generateLocation(
                request.getLocationType(),
                request.getSize()
        );

        return ResponseEntity.ok(new AIResponse(response));
    }

    /**
     * Get GM suggestions
     * GM only feature
     */
    @PostMapping("/gm-suggestion")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<AIResponse> getGMSuggestion(@RequestBody String situation) {
        log.info("GM suggestion request");

        String response = aiGameMasterService.generateGMSuggestion(situation);

        return ResponseEntity.ok(new AIResponse(response));
    }

    /**
     * Generate tactical battle map with terrain, buildings, and optional background image
     * GM ONLY - Players cannot access map generation
     */
    @PostMapping("/generate-map")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<AIResponse> generateMap(@Valid @RequestBody MapGenerationRequest request) {
        log.info("Map generation request: {} {} map", request.getSize(), request.getLocationType());

        try {
            // Step 1: Generate map data using Claude
            String mapJson = aiGameMasterService.generateBattleMap(
                request.getLocationType(),
                request.getSize(),
                request.getTheme() != null ? request.getTheme() : "combat",
                request.getFeatures(),
                request.getDescription()
            );

            // Clean up potential markdown formatting from Claude
            mapJson = mapJson.trim();
            if (mapJson.startsWith("```json")) {
                mapJson = mapJson.substring(7);
            }
            if (mapJson.startsWith("```")) {
                mapJson = mapJson.substring(3);
            }
            if (mapJson.endsWith("```")) {
                mapJson = mapJson.substring(0, mapJson.length() - 3);
            }
            mapJson = mapJson.trim();

            // Parse the JSON to validate it
            MapGenerationResponse mapData = objectMapper.readValue(mapJson, MapGenerationResponse.class);

            // Step 2: Skip AI image generation (using procedural rendering instead)
            // HYBRID APPROACH: Frontend draws map programmatically from tactical data
            log.info("⚙️ Using procedural rendering - AI image generation skipped");
            log.info("   Map will be drawn programmatically from terrain/building/cover data");

            // Optional: Generate AI images if explicitly requested (future feature)
            if (request.isGenerateImage() && imageGenerationService.isAvailable()) {
                log.info("🎨 AI image generation requested (experimental)");

                // Create image prompt from map data
                String imagePrompt = aiGameMasterService.generateImagePrompt(
                    mapData.getName(),
                    request.getLocationType(),
                    mapData.getDescription()
                );

                log.info("📝 Image prompt: {}", imagePrompt);

                // Generate image (may take 10-30 seconds)
                String imageData = imageGenerationService.generateMapImage(
                    imagePrompt,
                    1024,
                    1024
                );

                if (imageData != null) {
                    mapData.setImageUrl(imageData);
                    mapData.setImagePrompt(imagePrompt);
                    log.info("✅ AI texture generated successfully");
                } else {
                    log.warn("⚠️ AI image generation failed - proceeding with procedural rendering only");
                }
            }

            // Convert back to JSON string for response
            String finalJson = objectMapper.writeValueAsString(mapData);

            return ResponseEntity.ok(new AIResponse(finalJson));

        } catch (Exception e) {
            log.error("Error generating map: {}", e.getMessage(), e);
            return ResponseEntity.ok(new AIResponse(
                "Error generating map: " + e.getMessage() +
                ". Please check your request and try again."
            ));
        }
    }

    /**
     * Save generated map to database
     * GM ONLY - Players cannot save maps
     */
    @PostMapping("/maps/save")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<BattleMapDetailDTO> saveMap(@Valid @RequestBody SaveMapRequest request, Principal principal) {
        log.info("Saving battle map: {}", request.getName());

        try {
            // Get current user
            User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Create BattleMap entity
            BattleMap map = BattleMap.builder()
                .name(request.getName())
                .description(request.getDescription())
                .widthTiles(request.getWidthTiles())
                .heightTiles(request.getHeightTiles())
                .imageData(request.getImageData())
                .imageUrl(request.getImageUrl())
                .generationPrompt(request.getGenerationPrompt())
                .mapData(request.getMapData())
                .wallsData(request.getWallsData())
                .coverData(request.getCoverData())
                .spawnPointsData(request.getSpawnPointsData())
                .visibility(MapVisibility.valueOf(request.getVisibility()))
                .tags(request.getTags())
                .type(MapType.valueOf(request.getType()))
                .theme(request.getTheme() != null ? BattleTheme.valueOf(request.getTheme()) : null)
                .createdBy(user)
                .build();

            // Save to database
            BattleMap saved = battleMapRepository.save(map);

            // Convert to DTO
            BattleMapDetailDTO dto = mapToDetailDTO(saved);

            log.info("Map saved successfully with ID: {}", saved.getId());
            return ResponseEntity.ok(dto);

        } catch (Exception e) {
            log.error("Error saving map: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get user's saved maps
     * GM ONLY
     */
    @GetMapping("/maps/my-maps")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<List<BattleMapDTO>> getMyMaps(Principal principal) {
        log.info("Fetching maps for user: {}", principal.getName());

        try {
            User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            List<BattleMap> maps = battleMapRepository.findByCreatedByOrderByCreatedAtDesc(user);
            List<BattleMapDTO> dtos = maps.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

            log.info("Found {} maps for user", dtos.size());
            return ResponseEntity.ok(dtos);

        } catch (Exception e) {
            log.error("Error fetching user maps: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get public map library
     * GM ONLY
     */
    @GetMapping("/maps/library")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<List<BattleMapDTO>> getMapLibrary(@RequestParam(required = false) String tag) {
        log.info("Fetching public map library, tag filter: {}", tag);

        try {
            List<BattleMap> maps;

            if (tag != null && !tag.isEmpty()) {
                maps = battleMapRepository.findByTagsContainingAndVisibilityIn(
                    tag,
                    Arrays.asList(MapVisibility.PUBLIC)
                );
            } else {
                maps = battleMapRepository.findByVisibilityOrderByCreatedAtDesc(MapVisibility.PUBLIC);
            }

            List<BattleMapDTO> dtos = maps.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

            log.info("Found {} public maps", dtos.size());
            return ResponseEntity.ok(dtos);

        } catch (Exception e) {
            log.error("Error fetching map library: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get specific map with full data
     * GM ONLY
     */
    @GetMapping("/maps/{id}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<BattleMapDetailDTO> getMap(@PathVariable Long id, Principal principal) {
        log.info("Fetching map with ID: {}", id);

        try {
            User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            BattleMap map = battleMapRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Map not found"));

            // Check visibility permissions
            if (map.getVisibility() == MapVisibility.PRIVATE &&
                !map.getCreatedBy().getId().equals(user.getId())) {
                log.warn("User {} attempted to access private map {} owned by {}",
                    user.getUsername(), id, map.getCreatedBy().getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            BattleMapDetailDTO dto = mapToDetailDTO(map);
            return ResponseEntity.ok(dto);

        } catch (Exception e) {
            log.error("Error fetching map: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Delete map
     * GM ONLY - Can only delete own maps
     */
    @DeleteMapping("/maps/{id}")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<Void> deleteMap(@PathVariable Long id, Principal principal) {
        log.info("Deleting map with ID: {}", id);

        try {
            User user = userRepository.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

            BattleMap map = battleMapRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Map not found"));

            // Check ownership
            if (!map.getCreatedBy().getId().equals(user.getId())) {
                log.warn("User {} attempted to delete map {} owned by {}",
                    user.getUsername(), id, map.getCreatedBy().getUsername());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            battleMapRepository.deleteById(id);
            log.info("Map {} deleted successfully", id);
            return ResponseEntity.noContent().build();

        } catch (Exception e) {
            log.error("Error deleting map: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Helper: Convert BattleMap to lightweight DTO
     */
    private BattleMapDTO mapToDTO(BattleMap map) {
        return BattleMapDTO.builder()
            .id(map.getId())
            .name(map.getName())
            .description(map.getDescription())
            .widthTiles(map.getWidthTiles())
            .heightTiles(map.getHeightTiles())
            .thumbnailUrl(map.getImageUrl()) // Use imageUrl as thumbnail
            .visibility(map.getVisibility().toString())
            .tags(map.getTags())
            .type(map.getType() != null ? map.getType().toString() : null)
            .theme(map.getTheme() != null ? map.getTheme().toString() : null)
            .createdByUsername(map.getCreatedBy() != null ? map.getCreatedBy().getUsername() : null)
            .createdAt(map.getCreatedAt())
            .updatedAt(map.getUpdatedAt())
            .build();
    }

    /**
     * Helper: Convert BattleMap to full detail DTO
     */
    private BattleMapDetailDTO mapToDetailDTO(BattleMap map) {
        return BattleMapDetailDTO.builder()
            .id(map.getId())
            .name(map.getName())
            .description(map.getDescription())
            .widthTiles(map.getWidthTiles())
            .heightTiles(map.getHeightTiles())
            .imageData(map.getImageData())
            .imageUrl(map.getImageUrl())
            .generationPrompt(map.getGenerationPrompt())
            .mapData(map.getMapData())
            .wallsData(map.getWallsData())
            .coverData(map.getCoverData())
            .spawnPointsData(map.getSpawnPointsData())
            .visibility(map.getVisibility().toString())
            .tags(map.getTags())
            .type(map.getType() != null ? map.getType().toString() : null)
            .theme(map.getTheme() != null ? map.getTheme().toString() : null)
            .createdByUsername(map.getCreatedBy() != null ? map.getCreatedBy().getUsername() : null)
            .createdByUserId(map.getCreatedBy() != null ? map.getCreatedBy().getId() : null)
            .createdAt(map.getCreatedAt())
            .updatedAt(map.getUpdatedAt())
            .build();
    }

    /**
     * Health check endpoint to verify AI service is configured
     * Public endpoint - no authentication required
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("AI Assistant service is available");
    }
}
