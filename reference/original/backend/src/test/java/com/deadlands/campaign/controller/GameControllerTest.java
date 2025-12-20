package com.deadlands.campaign.controller;

import com.deadlands.campaign.dto.TokenMoveRequest;
import com.deadlands.campaign.dto.TokenMovedEvent;
import com.deadlands.campaign.model.Character;
import com.deadlands.campaign.model.User;
import com.deadlands.campaign.repository.CharacterRepository;
import com.deadlands.campaign.repository.UserRepository;
import com.deadlands.campaign.service.GameStateService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;

import java.security.Principal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GameController.
 *
 * Tests WebSocket message handlers for the shared game world:
 * - Token movement validation (bounds, ownership)
 * - Player join/leave events
 * - Authorization checks (player vs GM)
 *
 * Uses @SpringBootTest with @AutoConfigureMockMvc for full integration testing.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameControllerTest {

    @Autowired
    private GameController gameController;

    @MockBean
    private CharacterRepository characterRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private GameStateService gameStateService;

    private User playerUser;
    private User gmUser;
    private Character playerCharacter;
    private Principal playerPrincipal;
    private Principal gmPrincipal;
    private TokenMoveRequest validMoveRequest;

    @BeforeEach
    void setUp() {
        // Create player user
        playerUser = User.builder()
                .id(1L)
                .username("player1")
                .email("player1@example.com")
                .password("encoded-password")
                .role(User.Role.PLAYER)
                .active(true)
                .build();

        // Create GM user
        gmUser = User.builder()
                .id(2L)
                .username("gamemaster")
                .email("gm@example.com")
                .password("encoded-password")
                .role(User.Role.GAME_MASTER)
                .active(true)
                .build();

        // Create character owned by player
        playerCharacter = Character.builder()
                .id(100L)
                .name("Test Character")
                .player(playerUser)
                .build();

        // Create mock principals
        playerPrincipal = () -> "player1";
        gmPrincipal = () -> "gamemaster";

        // Create valid move request
        validMoveRequest = new TokenMoveRequest();
        validMoveRequest.setTokenId("100");
        validMoveRequest.setTokenType("PLAYER");
        validMoveRequest.setFromX(10);
        validMoveRequest.setFromY(10);
        validMoveRequest.setToX(15);
        validMoveRequest.setToY(15);
    }

    // ==================== TOKEN MOVEMENT TESTS ====================

    @Test
    @DisplayName("handleTokenMove - Valid move by character owner succeeds")
    void handleTokenMove_validMoveByOwner_succeeds() {
        // Arrange
        when(characterRepository.findById(100L)).thenReturn(Optional.of(playerCharacter));
        when(userRepository.findByUsername("player1")).thenReturn(Optional.of(playerUser));

        // Act
        TokenMovedEvent event = gameController.handleTokenMove(validMoveRequest, playerPrincipal);

        // Assert
        assertThat(event).isNotNull();
        assertThat(event.getTokenId()).isEqualTo("100");
        assertThat(event.getTokenType()).isEqualTo("PLAYER");
        assertThat(event.getMovedBy()).isEqualTo("player1");
        assertThat(event.getGridX()).isEqualTo(15);
        assertThat(event.getGridY()).isEqualTo(15);
        assertThat(event.getTimestamp()).isGreaterThan(0);

        verify(characterRepository, times(1)).findById(100L);
        verify(userRepository, times(1)).findByUsername("player1");
    }

    @Test
    @DisplayName("handleTokenMove - GM can move any character")
    void handleTokenMove_gmCanMoveAnyCharacter_succeeds() {
        // Arrange
        when(characterRepository.findById(100L)).thenReturn(Optional.of(playerCharacter));
        when(userRepository.findByUsername("gamemaster")).thenReturn(Optional.of(gmUser));

        // Act
        TokenMovedEvent event = gameController.handleTokenMove(validMoveRequest, gmPrincipal);

        // Assert
        assertThat(event).isNotNull();
        assertThat(event.getMovedBy()).isEqualTo("gamemaster");
        verify(characterRepository, times(1)).findById(100L);
        verify(userRepository, times(1)).findByUsername("gamemaster");
    }

    @Test
    @DisplayName("handleTokenMove - Player cannot move another player's character")
    void handleTokenMove_playerCannotMoveOthersCharacter_throwsAccessDenied() {
        // Arrange
        User otherPlayer = User.builder()
                .id(3L)
                .username("player2")
                .email("player2@example.com")
                .role(User.Role.PLAYER)
                .build();

        when(characterRepository.findById(100L)).thenReturn(Optional.of(playerCharacter));
        when(userRepository.findByUsername("player2")).thenReturn(Optional.of(otherPlayer));

        Principal otherPrincipal = () -> "player2";

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(validMoveRequest, otherPrincipal))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("does not own character");

        verify(characterRepository, times(1)).findById(100L);
        verify(userRepository, times(1)).findByUsername("player2");
    }

    @Test
    @DisplayName("handleTokenMove - Character not found throws IllegalArgumentException")
    void handleTokenMove_characterNotFound_throwsIllegalArgument() {
        // Arrange
        when(characterRepository.findById(999L)).thenReturn(Optional.empty());

        TokenMoveRequest invalidRequest = new TokenMoveRequest();
        invalidRequest.setTokenId("999");
        invalidRequest.setTokenType("PLAYER");
        invalidRequest.setFromX(10);
        invalidRequest.setFromY(10);
        invalidRequest.setToX(15);
        invalidRequest.setToY(15);

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(invalidRequest, playerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Character not found");

        verify(characterRepository, times(1)).findById(999L);
    }

    @Test
    @DisplayName("handleTokenMove - Invalid character ID format throws IllegalArgumentException")
    void handleTokenMove_invalidCharacterIdFormat_throwsIllegalArgument() {
        // Arrange
        TokenMoveRequest invalidRequest = new TokenMoveRequest();
        invalidRequest.setTokenId("not-a-number");
        invalidRequest.setTokenType("PLAYER");
        invalidRequest.setFromX(10);
        invalidRequest.setFromY(10);
        invalidRequest.setToX(15);
        invalidRequest.setToY(15);

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(invalidRequest, playerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid character ID format");

        verify(characterRepository, never()).findById(anyLong());
    }

    // ==================== MOVEMENT BOUNDS VALIDATION TESTS ====================

    @Test
    @DisplayName("handleTokenMove - Move to negative X coordinate throws IllegalArgumentException")
    void handleTokenMove_negativeX_throwsIllegalArgument() {
        // Arrange
        validMoveRequest.setToX(-1);
        validMoveRequest.setToY(10);

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(validMoveRequest, playerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("out of bounds");
    }

    @Test
    @DisplayName("handleTokenMove - Move to negative Y coordinate throws IllegalArgumentException")
    void handleTokenMove_negativeY_throwsIllegalArgument() {
        // Arrange
        validMoveRequest.setToX(10);
        validMoveRequest.setToY(-1);

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(validMoveRequest, playerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("out of bounds");
    }

    @Test
    @DisplayName("handleTokenMove - Move to X > 199 throws IllegalArgumentException")
    void handleTokenMove_xTooLarge_throwsIllegalArgument() {
        // Arrange
        validMoveRequest.setToX(200);
        validMoveRequest.setToY(10);

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(validMoveRequest, playerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("out of bounds");
    }

    @Test
    @DisplayName("handleTokenMove - Move to Y > 199 throws IllegalArgumentException")
    void handleTokenMove_yTooLarge_throwsIllegalArgument() {
        // Arrange
        validMoveRequest.setToX(10);
        validMoveRequest.setToY(200);

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(validMoveRequest, playerPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("out of bounds");
    }

    @Test
    @DisplayName("handleTokenMove - Move to (0,0) is valid")
    void handleTokenMove_moveToOrigin_succeeds() {
        // Arrange
        validMoveRequest.setToX(0);
        validMoveRequest.setToY(0);
        when(characterRepository.findById(100L)).thenReturn(Optional.of(playerCharacter));
        when(userRepository.findByUsername("player1")).thenReturn(Optional.of(playerUser));

        // Act
        TokenMovedEvent event = gameController.handleTokenMove(validMoveRequest, playerPrincipal);

        // Assert
        assertThat(event).isNotNull();
        assertThat(event.getGridX()).isEqualTo(0);
        assertThat(event.getGridY()).isEqualTo(0);
    }

    @Test
    @DisplayName("handleTokenMove - Move to (199,199) is valid")
    void handleTokenMove_moveToMaxBounds_succeeds() {
        // Arrange
        validMoveRequest.setToX(199);
        validMoveRequest.setToY(199);
        when(characterRepository.findById(100L)).thenReturn(Optional.of(playerCharacter));
        when(userRepository.findByUsername("player1")).thenReturn(Optional.of(playerUser));

        // Act
        TokenMovedEvent event = gameController.handleTokenMove(validMoveRequest, playerPrincipal);

        // Assert
        assertThat(event).isNotNull();
        assertThat(event.getGridX()).isEqualTo(199);
        assertThat(event.getGridY()).isEqualTo(199);
    }

    // ==================== ENEMY TOKEN TESTS ====================

    @Test
    @DisplayName("handleTokenMove - ENEMY tokens do not require ownership validation")
    void handleTokenMove_enemyToken_noOwnershipCheck() {
        // Arrange
        TokenMoveRequest enemyRequest = new TokenMoveRequest();
        enemyRequest.setTokenId("999");
        enemyRequest.setTokenType("ENEMY");
        enemyRequest.setFromX(10);
        enemyRequest.setFromY(10);
        enemyRequest.setToX(15);
        enemyRequest.setToY(15);

        // Act
        TokenMovedEvent event = gameController.handleTokenMove(enemyRequest, playerPrincipal);

        // Assert
        assertThat(event).isNotNull();
        assertThat(event.getTokenType()).isEqualTo("ENEMY");

        // Verify ownership check was NOT performed
        verify(characterRepository, never()).findById(anyLong());
        verify(userRepository, never()).findByUsername(anyString());
    }

    // ==================== PLAYER JOIN TESTS ====================

    @Test
    @DisplayName("handlePlayerJoin - Returns valid JSON with username and timestamp")
    void handlePlayerJoin_returnsValidJson() {
        // Act
        String result = gameController.handlePlayerJoin(playerPrincipal);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result).contains("\"event\":\"player_joined\"");
        assertThat(result).contains("\"username\":\"player1\"");
        assertThat(result).contains("\"timestamp\":");
    }

    // ==================== PLAYER LEAVE TESTS ====================

    @Test
    @DisplayName("handlePlayerLeave - Returns valid JSON with username and timestamp")
    void handlePlayerLeave_returnsValidJson() {
        // Act
        String result = gameController.handlePlayerLeave(playerPrincipal);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result).contains("\"event\":\"player_left\"");
        assertThat(result).contains("\"username\":\"player1\"");
        assertThat(result).contains("\"timestamp\":");
    }

    // ==================== PING TESTS ====================

    @Test
    @DisplayName("handlePing - Returns pong with username and timestamp")
    void handlePing_returnsPong() {
        // Act
        String result = gameController.handlePing(playerPrincipal);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result).contains("\"event\":\"pong\"");
        assertThat(result).contains("\"username\":\"player1\"");
        assertThat(result).contains("\"timestamp\":");
    }

    // ==================== AUTHORIZATION EDGE CASES ====================

    @Test
    @DisplayName("handleTokenMove - Character with null player cannot be moved by non-GM")
    void handleTokenMove_characterWithNullPlayer_throwsAccessDenied() {
        // Arrange
        Character npcCharacter = Character.builder()
                .id(200L)
                .name("NPC Character")
                .player(null) // No player owner
                .build();

        TokenMoveRequest npcRequest = new TokenMoveRequest();
        npcRequest.setTokenId("200");
        npcRequest.setTokenType("PLAYER");
        npcRequest.setFromX(10);
        npcRequest.setFromY(10);
        npcRequest.setToX(15);
        npcRequest.setToY(15);

        when(characterRepository.findById(200L)).thenReturn(Optional.of(npcCharacter));
        when(userRepository.findByUsername("player1")).thenReturn(Optional.of(playerUser));

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(npcRequest, playerPrincipal))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("does not own character");
    }

    @Test
    @DisplayName("handleTokenMove - Character with null player CAN be moved by GM")
    void handleTokenMove_characterWithNullPlayer_gmCanMove() {
        // Arrange
        Character npcCharacter = Character.builder()
                .id(200L)
                .name("NPC Character")
                .player(null) // No player owner
                .build();

        TokenMoveRequest npcRequest = new TokenMoveRequest();
        npcRequest.setTokenId("200");
        npcRequest.setTokenType("PLAYER");
        npcRequest.setFromX(10);
        npcRequest.setFromY(10);
        npcRequest.setToX(15);
        npcRequest.setToY(15);

        when(characterRepository.findById(200L)).thenReturn(Optional.of(npcCharacter));
        when(userRepository.findByUsername("gamemaster")).thenReturn(Optional.of(gmUser));

        // Act
        TokenMovedEvent event = gameController.handleTokenMove(npcRequest, gmPrincipal);

        // Assert
        assertThat(event).isNotNull();
        assertThat(event.getMovedBy()).isEqualTo("gamemaster");
    }

    @Test
    @DisplayName("handleTokenMove - User not found throws IllegalArgumentException")
    void handleTokenMove_userNotFound_throwsIllegalArgument() {
        // Arrange
        when(characterRepository.findById(100L)).thenReturn(Optional.of(playerCharacter));
        when(userRepository.findByUsername("unknownuser")).thenReturn(Optional.empty());

        Principal unknownPrincipal = () -> "unknownuser";

        // Act & Assert
        assertThatThrownBy(() -> gameController.handleTokenMove(validMoveRequest, unknownPrincipal))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");
    }
}
