package com.deadlands.campaign.service;

import com.deadlands.campaign.model.Character;
import com.deadlands.campaign.model.GameState;
import com.deadlands.campaign.model.TokenPosition;
import com.deadlands.campaign.repository.CharacterRepository;
import com.deadlands.campaign.repository.GameStateRepository;
import com.deadlands.campaign.repository.TokenPositionRepository;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service for managing the global game state.
 *
 * Handles:
 * - Loading/creating the singleton GameState
 * - Updating token positions
 * - Changing maps (clears all token positions)
 * - Resetting game state
 */
@Service
public class GameStateService {

    private static final Logger logger = LoggerFactory.getLogger(GameStateService.class);
    private static final Long GAME_STATE_ID = 1L;

    @Autowired
    private GameStateRepository gameStateRepository;

    @Autowired
    private TokenPositionRepository tokenPositionRepository;

    @Autowired
    private CharacterRepository characterRepository;

    /**
     * Get the singleton game state, creating it if it doesn't exist.
     *
     * @return The global GameState
     */
    @Transactional
    public GameState getOrCreateGameState() {
        Optional<GameState> existing = gameStateRepository.findById(GAME_STATE_ID);

        if (existing.isPresent()) {
            return existing.get();
        }

        // Create initial game state
        GameState newState = GameState.builder()
                .id(GAME_STATE_ID)
                .turnNumber(1)
                .turnPhase("player")
                .currentMap(null)
                .lastActivity(LocalDateTime.now())
                .build();

        logger.info("[GameStateService] Creating new game state (singleton)");
        return gameStateRepository.save(newState);
    }

    /**
     * Update or create a token position on the map.
     *
     * @param tokenId The unique token identifier
     * @param tokenType The type ('PLAYER', 'ENEMY', 'NPC')
     * @param gridX X coordinate (0-199)
     * @param gridY Y coordinate (0-199)
     * @param movedBy Username who moved the token
     * @return The updated TokenPosition
     */
    @Transactional
    public TokenPosition updateTokenPosition(String tokenId, String tokenType, Integer gridX, Integer gridY, String movedBy) {
        GameState gameState = getOrCreateGameState();

        // Check if position already exists
        Optional<TokenPosition> existing = tokenPositionRepository.findByTokenId(tokenId);

        TokenPosition position;
        if (existing.isPresent()) {
            // Update existing position
            position = existing.get();
            position.updatePosition(gridX, gridY, movedBy);
            logger.debug("[GameStateService] Updated token {} position to ({}, {})", tokenId, gridX, gridY);
        } else {
            // Create new position
            TokenPosition.TokenPositionBuilder builder = TokenPosition.builder()
                    .tokenId(tokenId)
                    .tokenType(tokenType)
                    .gridX(gridX)
                    .gridY(gridY)
                    .lastMovedBy(movedBy)
                    .gameState(gameState)
                    .lastMoved(LocalDateTime.now());

            // Link to Character if this is a PLAYER token
            if ("PLAYER".equals(tokenType)) {
                try {
                    Long characterId = Long.parseLong(tokenId);
                    Optional<Character> character = characterRepository.findById(characterId);
                    character.ifPresent(builder::character);
                } catch (NumberFormatException e) {
                    logger.warn("[GameStateService] Invalid character ID format for PLAYER token: {}", tokenId);
                }
            }

            position = builder.build();
            logger.info("[GameStateService] Created new token position: {} at ({}, {})", tokenId, gridX, gridY);
        }

        // Save position
        position = tokenPositionRepository.save(position);

        // Update game state last activity
        gameState.setLastActivity(LocalDateTime.now());
        gameStateRepository.save(gameState);

        return position;
    }

    /**
     * Get all current token positions on the map.
     *
     * @return List of all token positions
     */
    public List<TokenPosition> getAllTokenPositions() {
        GameState gameState = getOrCreateGameState();
        return gameState.getTokenPositions();
    }

    /**
     * Get a specific token position by token ID.
     *
     * @param tokenId The unique token identifier
     * @return Optional containing the position if found
     */
    public Optional<TokenPosition> getTokenPosition(String tokenId) {
        return tokenPositionRepository.findByTokenId(tokenId);
    }

    /**
     * Remove a token from the map.
     * Used when a character is deleted or leaves the game.
     *
     * @param tokenId The unique token identifier
     */
    @Transactional
    public void removeToken(String tokenId) {
        if (tokenPositionRepository.existsByTokenId(tokenId)) {
            tokenPositionRepository.deleteByTokenId(tokenId);
            logger.info("[GameStateService] Removed token: {}", tokenId);

            // Update game state last activity
            GameState gameState = getOrCreateGameState();
            gameState.setLastActivity(LocalDateTime.now());
            gameStateRepository.save(gameState);
        }
    }

    /**
     * Change the current map.
     *
     * CRITICAL: This clears ALL token positions, including tokens for players
     * who are not currently logged in. This ensures no tokens carry over between maps.
     *
     * @param newMapId The new map identifier
     */
    @Transactional
    public void changeMap(String newMapId) {
        logger.info("[GameStateService] Changing map from {} to {} - CLEARING ALL TOKEN POSITIONS",
                getCurrentMap().orElse("none"), newMapId);

        GameState gameState = getOrCreateGameState();

        // Clear all token positions (including offline players)
        gameState.clearAllTokenPositions();
        tokenPositionRepository.deleteAll();

        // Update map
        gameState.setCurrentMap(newMapId);
        gameState.setLastActivity(LocalDateTime.now());

        gameStateRepository.save(gameState);

        logger.info("[GameStateService] Map changed to: {} - All {} token(s) cleared",
                newMapId, tokenPositionRepository.count());
    }

    /**
     * Get the current map identifier.
     *
     * @return Optional containing the current map ID if set
     */
    public Optional<String> getCurrentMap() {
        GameState gameState = getOrCreateGameState();
        return Optional.ofNullable(gameState.getCurrentMap());
    }

    /**
     * Update turn information (number and phase).
     *
     * @param turnNumber The new turn number
     * @param turnPhase The new phase ('player', 'enemy', 'resolution')
     */
    @Transactional
    public void updateTurn(Integer turnNumber, String turnPhase) {
        GameState gameState = getOrCreateGameState();
        gameState.setTurnNumber(turnNumber);
        gameState.setTurnPhase(turnPhase);
        gameState.setLastActivity(LocalDateTime.now());
        gameStateRepository.save(gameState);

        logger.debug("[GameStateService] Updated turn: {} ({})", turnNumber, turnPhase);
    }

    /**
     * Advance to the next turn phase.
     * Cycles through: player -> enemy -> resolution -> next turn (player)
     *
     * @return The updated GameState
     */
    @Transactional
    public GameState advanceTurn() {
        GameState gameState = getOrCreateGameState();
        String currentPhase = gameState.getTurnPhase();
        int currentTurn = gameState.getTurnNumber();

        String nextPhase;
        int nextTurn = currentTurn;

        switch (currentPhase) {
            case "player":
                nextPhase = "enemy";
                break;
            case "enemy":
                nextPhase = "resolution";
                break;
            case "resolution":
                nextPhase = "player";
                nextTurn = currentTurn + 1;
                break;
            default:
                // Default to player phase if unknown
                nextPhase = "player";
        }

        gameState.setTurnNumber(nextTurn);
        gameState.setTurnPhase(nextPhase);
        gameState.setLastActivity(LocalDateTime.now());
        gameStateRepository.save(gameState);

        logger.info("[GameStateService] Advanced turn: {} ({}) -> {} ({})",
                currentTurn, currentPhase, nextTurn, nextPhase);

        return gameState;
    }

    /**
     * Reset the entire game state.
     * Clears all token positions and resets turn to 1.
     * Does NOT change the current map.
     */
    @Transactional
    public void resetGameState() {
        logger.info("[GameStateService] Resetting game state");

        GameState gameState = getOrCreateGameState();

        // Clear all token positions
        gameState.clearAllTokenPositions();
        tokenPositionRepository.deleteAll();

        // Reset turn to 1
        gameState.setTurnNumber(1);
        gameState.setTurnPhase("player");
        gameState.setLastActivity(LocalDateTime.now());

        gameStateRepository.save(gameState);

        logger.info("[GameStateService] Game state reset complete");
    }

    /**
     * Get the full game state including all token positions.
     *
     * @return The complete GameState with all positions loaded
     */
    public GameState getFullGameState() {
        return getOrCreateGameState();
    }
}
