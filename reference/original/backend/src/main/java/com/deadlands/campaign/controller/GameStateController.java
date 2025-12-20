package com.deadlands.campaign.controller;

import com.deadlands.campaign.dto.ChangeMapRequest;
import com.deadlands.campaign.dto.CombatStateResponse;
import com.deadlands.campaign.dto.GameStateResponse;
import com.deadlands.campaign.dto.StartCombatRequest;
import com.deadlands.campaign.dto.TokenPositionDTO;
import com.deadlands.campaign.model.GameState;
import com.deadlands.campaign.model.TokenPosition;
import com.deadlands.campaign.service.GameStateService;
import com.deadlands.campaign.service.InitiativeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST controller for game state management.
 *
 * Endpoints:
 * - GET /api/game/state - Get current game state and all token positions
 * - POST /api/game/map/change - Change map (GM only, clears all tokens)
 * - POST /api/game/reset - Reset game state (GM only)
 *
 * Combat/Initiative Endpoints:
 * - GET /api/game/combat/state - Get current combat state and initiative order
 * - POST /api/game/combat/start - Start combat with specified characters (GM only)
 * - POST /api/game/combat/end - End combat (GM only)
 * - POST /api/game/combat/end-turn - End current character's turn
 * - POST /api/game/combat/new-round - Start a new round (GM only)
 */
@RestController
@RequestMapping("/api/game")
public class GameStateController {

    private static final Logger logger = LoggerFactory.getLogger(GameStateController.class);

    @Autowired
    private GameStateService gameStateService;

    @Autowired
    private InitiativeService initiativeService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Get the current game state including all token positions.
     *
     * This endpoint is used by:
     * - Players when they join the arena (to see existing tokens)
     * - Frontend to sync state after reconnection
     *
     * @return GameStateResponse with turn info and all token positions
     */
    @GetMapping("/state")
    public ResponseEntity<GameStateResponse> getGameState() {
        logger.info("[GameStateController] GET /api/game/state - Starting");

        try {
            GameState gameState = gameStateService.getFullGameState();
            logger.info("[GameStateController] Got game state: id={}", gameState.getId());

            List<TokenPosition> positions = gameStateService.getAllTokenPositions();
            logger.info("[GameStateController] Got {} token positions", positions.size());

            // Convert to DTOs
            List<TokenPositionDTO> positionDTOs = positions.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            GameStateResponse response = GameStateResponse.builder()
                    .turnNumber(gameState.getTurnNumber())
                    .turnPhase(gameState.getTurnPhase())
                    .currentMap(gameState.getCurrentMap())
                    .tokenPositions(positionDTOs)
                    .lastActivity(gameState.getLastActivity())
                    .build();

            logger.info("[GameStateController] Returning game state: turn {}, {} tokens",
                    gameState.getTurnNumber(), positionDTOs.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("[GameStateController] ERROR in getGameState: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Change the current map.
     *
     * IMPORTANT: This clears ALL token positions, including tokens for players
     * who are not currently logged in. This ensures no player tokens carry over
     * between maps.
     *
     * Only Game Masters can change maps.
     *
     * @param request The new map ID
     * @return Success message
     */
    @PostMapping("/map/change")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<String> changeMap(@RequestBody ChangeMapRequest request) {
        logger.info("[GameStateController] POST /api/game/map/change - GM changing map to: {}", request.getMapId());

        if (request.getMapId() == null || request.getMapId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Map ID cannot be empty");
        }

        gameStateService.changeMap(request.getMapId());

        String message = String.format("Map changed to: %s. All token positions cleared.", request.getMapId());
        logger.info("[GameStateController] {}", message);

        return ResponseEntity.ok(message);
    }

    /**
     * Reset the game state.
     *
     * Clears all token positions and resets turn to 1.
     * Does NOT change the current map.
     *
     * Only Game Masters can reset game state.
     *
     * @return Success message
     */
    @PostMapping("/reset")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<String> resetGameState() {
        logger.info("[GameStateController] POST /api/game/reset - GM resetting game state");

        gameStateService.resetGameState();

        String message = "Game state reset. All token positions cleared, turn reset to 1.";
        logger.info("[GameStateController] {}", message);

        return ResponseEntity.ok(message);
    }

    /**
     * Advance to the next turn phase.
     *
     * Cycles through: player -> enemy -> resolution -> next turn (player)
     *
     * Only Game Masters can advance turns.
     *
     * @return The updated game state response
     */
    @PostMapping("/turn/advance")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<GameStateResponse> advanceTurn() {
        logger.info("[GameStateController] POST /api/game/turn/advance - GM advancing turn");

        GameState gameState = gameStateService.advanceTurn();
        List<TokenPosition> positions = gameStateService.getAllTokenPositions();

        // Convert to DTOs
        List<TokenPositionDTO> positionDTOs = positions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        GameStateResponse response = GameStateResponse.builder()
                .turnNumber(gameState.getTurnNumber())
                .turnPhase(gameState.getTurnPhase())
                .currentMap(gameState.getCurrentMap())
                .tokenPositions(positionDTOs)
                .lastActivity(gameState.getLastActivity())
                .build();

        logger.info("[GameStateController] Turn advanced to {} ({})",
                gameState.getTurnNumber(), gameState.getTurnPhase());

        // Broadcast turn change to all connected clients
        messagingTemplate.convertAndSend("/topic/game/turn", response);
        logger.debug("[GameStateController] Broadcasted turn change to /topic/game/turn");

        return ResponseEntity.ok(response);
    }

    /**
     * Convert TokenPosition entity to DTO.
     */
    private TokenPositionDTO convertToDTO(TokenPosition position) {
        return TokenPositionDTO.builder()
                .tokenId(position.getTokenId())
                .tokenType(position.getTokenType())
                .gridX(position.getGridX())
                .gridY(position.getGridY())
                .lastMovedBy(position.getLastMovedBy())
                .lastMoved(position.getLastMoved())
                .characterId(position.getCharacter() != null ? position.getCharacter().getId() : null)
                .build();
    }

    // ==================== COMBAT/INITIATIVE ENDPOINTS ====================

    /**
     * Get the current combat state including initiative order.
     *
     * @return CombatStateResponse with round info and initiative order
     */
    @GetMapping("/combat/state")
    public ResponseEntity<CombatStateResponse> getCombatState() {
        logger.debug("[GameStateController] GET /api/game/combat/state");

        CombatStateResponse response = initiativeService.getCombatState();

        logger.info("[GameStateController] Combat state: active={}, round={}, {} combatants",
                response.isCombatActive(), response.getRoundNumber(),
                response.getInitiativeOrder() != null ? response.getInitiativeOrder().size() : 0);

        return ResponseEntity.ok(response);
    }

    /**
     * Start combat with the specified characters.
     *
     * Deals initiative cards to all participants and determines turn order.
     * Only Game Masters can start combat.
     *
     * @param request List of player character IDs and NPC names
     * @return CombatStateResponse with initiative order
     */
    @PostMapping("/combat/start")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<CombatStateResponse> startCombat(@RequestBody StartCombatRequest request) {
        logger.info("[GameStateController] POST /api/game/combat/start - Starting combat with {} players, {} NPCs",
                request.getPlayerCharacterIds() != null ? request.getPlayerCharacterIds().size() : 0,
                request.getNpcNames() != null ? request.getNpcNames().size() : 0);

        CombatStateResponse response = initiativeService.startCombat(
                request.getPlayerCharacterIds(),
                request.getNpcNames()
        );

        // Broadcast combat state to all connected clients
        messagingTemplate.convertAndSend("/topic/game/combat", response);
        logger.info("[GameStateController] Combat started! Broadcasted to /topic/game/combat");

        return ResponseEntity.ok(response);
    }

    /**
     * End combat entirely.
     *
     * Clears initiative order and combat state.
     * Only Game Masters can end combat.
     *
     * @return CombatStateResponse confirming combat ended
     */
    @PostMapping("/combat/end")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<CombatStateResponse> endCombat() {
        logger.info("[GameStateController] POST /api/game/combat/end - Ending combat");

        CombatStateResponse response = initiativeService.endCombat();

        // Broadcast combat end to all connected clients
        messagingTemplate.convertAndSend("/topic/game/combat", response);
        logger.info("[GameStateController] Combat ended! Broadcasted to /topic/game/combat");

        return ResponseEntity.ok(response);
    }

    /**
     * End the current character's turn.
     *
     * The character ID is taken from the request body.
     * Players can only end their own turn; GMs can end anyone's turn.
     *
     * @param request Map containing characterId (optional for NPC turns)
     * @return CombatStateResponse with updated initiative
     */
    @PostMapping("/combat/end-turn")
    public ResponseEntity<CombatStateResponse> endTurn(@RequestBody(required = false) Map<String, Object> request) {
        Long characterId = null;
        if (request != null && request.containsKey("characterId")) {
            Object id = request.get("characterId");
            if (id instanceof Number) {
                characterId = ((Number) id).longValue();
            } else if (id instanceof String) {
                characterId = Long.parseLong((String) id);
            }
        }

        logger.info("[GameStateController] POST /api/game/combat/end-turn - Character {} ending turn", characterId);

        CombatStateResponse response = initiativeService.endTurn(characterId);

        // Broadcast turn change to all connected clients
        messagingTemplate.convertAndSend("/topic/game/combat", response);
        logger.info("[GameStateController] Turn ended! Now {}'s turn. Broadcasted to /topic/game/combat",
                response.getActiveCharacterName());

        return ResponseEntity.ok(response);
    }

    /**
     * Start a new combat round.
     *
     * Deals new initiative cards to all participants.
     * Only Game Masters can force a new round (normally it auto-advances).
     *
     * @return CombatStateResponse with new initiative order
     */
    @PostMapping("/combat/new-round")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<CombatStateResponse> newRound() {
        logger.info("[GameStateController] POST /api/game/combat/new-round - Starting new round");

        GameState gameState = gameStateService.getOrCreateGameState();
        CombatStateResponse response = initiativeService.startNewRound(gameState);

        // Broadcast new round to all connected clients
        messagingTemplate.convertAndSend("/topic/game/combat", response);
        logger.info("[GameStateController] Round {} started! Broadcasted to /topic/game/combat",
                response.getRoundNumber());

        return ResponseEntity.ok(response);
    }

    /**
     * Add a combatant mid-combat (reinforcements).
     *
     * Only Game Masters can add combatants.
     *
     * @param request Map containing characterId (for players) or npcName (for NPCs)
     * @return CombatStateResponse with updated initiative
     */
    @PostMapping("/combat/add-combatant")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<CombatStateResponse> addCombatant(@RequestBody Map<String, Object> request) {
        Long characterId = null;
        String npcName = null;
        boolean isPlayer = false;

        if (request.containsKey("characterId")) {
            Object id = request.get("characterId");
            if (id instanceof Number) {
                characterId = ((Number) id).longValue();
            } else if (id instanceof String) {
                characterId = Long.parseLong((String) id);
            }
            isPlayer = true;
        }

        if (request.containsKey("npcName")) {
            npcName = (String) request.get("npcName");
            isPlayer = false;
        }

        logger.info("[GameStateController] POST /api/game/combat/add-combatant - Adding {} (player={})",
                characterId != null ? characterId : npcName, isPlayer);

        CombatStateResponse response = initiativeService.addCombatant(characterId, npcName, isPlayer);

        // Broadcast update to all connected clients
        messagingTemplate.convertAndSend("/topic/game/combat", response);

        return ResponseEntity.ok(response);
    }

    /**
     * Remove a combatant from combat (death, fled, etc.).
     *
     * Only Game Masters can remove combatants.
     *
     * @param request Map containing characterId (for players) or npcName (for NPCs)
     * @return CombatStateResponse with updated initiative
     */
    @PostMapping("/combat/remove-combatant")
    @PreAuthorize("hasRole('GAME_MASTER')")
    public ResponseEntity<CombatStateResponse> removeCombatant(@RequestBody Map<String, Object> request) {
        Long characterId = null;
        String npcName = null;

        if (request.containsKey("characterId")) {
            Object id = request.get("characterId");
            if (id instanceof Number) {
                characterId = ((Number) id).longValue();
            } else if (id instanceof String) {
                characterId = Long.parseLong((String) id);
            }
        }

        if (request.containsKey("npcName")) {
            npcName = (String) request.get("npcName");
        }

        logger.info("[GameStateController] POST /api/game/combat/remove-combatant - Removing {}",
                characterId != null ? characterId : npcName);

        CombatStateResponse response = initiativeService.removeCombatant(characterId, npcName);

        // Broadcast update to all connected clients
        messagingTemplate.convertAndSend("/topic/game/combat", response);

        return ResponseEntity.ok(response);
    }
}
