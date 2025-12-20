package com.deadlands.campaign.controller;

import com.deadlands.campaign.dto.TokenMoveRequest;
import com.deadlands.campaign.dto.TokenMovedEvent;
import com.deadlands.campaign.model.Character;
import com.deadlands.campaign.model.User;
import com.deadlands.campaign.repository.CharacterRepository;
import com.deadlands.campaign.repository.UserRepository;
import com.deadlands.campaign.service.GameStateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Controller;

import java.security.Principal;

/**
 * WebSocket controller for real-time game events in the shared world.
 *
 * Architecture: Single Shared World
 * - All players connect to the same game space
 * - No session management - everyone sees everyone
 * - Token movements broadcast to all connected clients
 *
 * Message Flow:
 * 1. Client sends token move to /app/game/move
 * 2. Server validates and broadcasts to /topic/game/moves
 * 3. All connected clients receive the update
 */
@Controller
public class GameController {

    private static final Logger logger = LoggerFactory.getLogger(GameController.class);

    @Autowired
    private CharacterRepository characterRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameStateService gameStateService;

    /**
     * Handle token movement in the shared game world.
     *
     * Client sends: /app/game/move
     * Server broadcasts: /topic/game/moves
     *
     * @param request The token move request from the client
     * @param principal The authenticated user making the move
     * @return TokenMovedEvent broadcast to all clients
     */
    @MessageMapping("/game/move")
    @SendTo("/topic/game/moves")
    public TokenMovedEvent handleTokenMove(TokenMoveRequest request, Principal principal) {
        String username = principal != null ? principal.getName() : "Unknown";

        logger.info("[GameController] Token move received: {} moved token {} ({}) from ({},{}) to ({},{})",
                username,
                request.getTokenId(),
                request.getTokenType(),
                request.getFromX(),
                request.getFromY(),
                request.getToX(),
                request.getToY());

        // Validate movement bounds (0-199 grid)
        validateMovementBounds(request.getToX(), request.getToY());

        // Validate token ownership for PLAYER tokens
        if ("PLAYER".equals(request.getTokenType())) {
            validateTokenOwnership(request.getTokenId(), username);
        }

        // TODO: Future enhancements:
        // - Check if move is within movement budget
        // - Check for obstacles/walls
        // - Validate turn order

        // Persist to database (so position survives server restart)
        gameStateService.updateTokenPosition(
                request.getTokenId(),
                request.getTokenType(),
                request.getToX(),
                request.getToY(),
                username
        );

        // Create broadcast event
        TokenMovedEvent event = new TokenMovedEvent(
                request.getTokenId(),
                request.getTokenType(),
                username,
                request.getToX(),
                request.getToY(),
                System.currentTimeMillis()
        );

        logger.debug("[GameController] Broadcasting token move to all clients: {}", event);

        return event;
    }

    /**
     * Handle player joining the shared world.
     *
     * Client sends: /app/game/join
     * Server broadcasts: /topic/game/players
     *
     * @param principal The authenticated user joining
     * @return Join notification message
     */
    @MessageMapping("/game/join")
    @SendTo("/topic/game/players")
    public String handlePlayerJoin(Principal principal) {
        String username = principal != null ? principal.getName() : "Unknown";

        logger.info("[GameController] Player joined shared world: {}", username);

        return String.format("{\"event\":\"player_joined\",\"username\":\"%s\",\"timestamp\":%d}",
                username, System.currentTimeMillis());
    }

    /**
     * Handle player leaving the shared world.
     *
     * Client sends: /app/game/leave
     * Server broadcasts: /topic/game/players
     *
     * @param principal The authenticated user leaving
     * @return Leave notification message
     */
    @MessageMapping("/game/leave")
    @SendTo("/topic/game/players")
    public String handlePlayerLeave(Principal principal) {
        String username = principal != null ? principal.getName() : "Unknown";

        logger.info("[GameController] Player left shared world: {}", username);

        return String.format("{\"event\":\"player_left\",\"username\":\"%s\",\"timestamp\":%d}",
                username, System.currentTimeMillis());
    }

    /**
     * Ping endpoint to verify WebSocket connection.
     *
     * Client sends: /app/game/ping
     * Server responds: /user/queue/pong
     *
     * @param principal The authenticated user
     * @return Pong response
     */
    @MessageMapping("/game/ping")
    @SendToUser("/queue/pong")
    public String handlePing(Principal principal) {
        String username = principal != null ? principal.getName() : "Unknown";

        logger.debug("[GameController] Ping from {}", username);

        return String.format("{\"event\":\"pong\",\"username\":\"%s\",\"timestamp\":%d}",
                username, System.currentTimeMillis());
    }

    /**
     * Validate that the token movement is within valid grid bounds.
     *
     * @param x X coordinate
     * @param y Y coordinate
     * @throws IllegalArgumentException if coordinates are out of bounds
     */
    private void validateMovementBounds(int x, int y) {
        if (x < 0 || x > 199 || y < 0 || y > 199) {
            String message = String.format("Invalid move: coordinates (%d, %d) out of bounds (0-199)", x, y);
            logger.warn("[GameController] {}", message);
            throw new IllegalArgumentException(message);
        }
    }

    /**
     * Validate that the user owns the token they're trying to move.
     * Game Masters can move any token.
     *
     * @param tokenId The character ID being moved
     * @param username The username making the move
     * @throws AccessDeniedException if user doesn't own the token and isn't a GM
     * @throws IllegalArgumentException if character not found
     */
    private void validateTokenOwnership(String tokenId, String username) {
        try {
            Long characterId = Long.parseLong(tokenId);

            // Find the character
            Character character = characterRepository.findById(characterId)
                    .orElseThrow(() -> new IllegalArgumentException("Character not found: " + tokenId));

            // Find the user making the request
            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

            // Check if user is a Game Master (can move any token)
            if (user.getRole() == User.Role.GAME_MASTER) {
                logger.debug("[GameController] GM {} authorized to move any token", username);
                return;
            }

            // Check if user owns this character
            if (character.getPlayer() == null || !character.getPlayer().getId().equals(user.getId())) {
                String message = String.format("User %s does not own character %s", username, tokenId);
                logger.warn("[GameController] Authorization failed: {}", message);
                throw new AccessDeniedException(message);
            }

            logger.debug("[GameController] User {} authorized to move character {}", username, tokenId);

        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid character ID format: " + tokenId);
        }
    }
}
