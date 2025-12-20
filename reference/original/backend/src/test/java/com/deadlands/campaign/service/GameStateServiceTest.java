package com.deadlands.campaign.service;

import com.deadlands.campaign.model.Character;
import com.deadlands.campaign.model.GameState;
import com.deadlands.campaign.model.TokenPosition;
import com.deadlands.campaign.repository.CharacterRepository;
import com.deadlands.campaign.repository.GameStateRepository;
import com.deadlands.campaign.repository.TokenPositionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GameStateService.
 *
 * Tests:
 * - Singleton game state creation/loading
 * - Token position persistence
 * - Map changing (clears all tokens including offline players)
 * - Game state reset
 */
@SpringBootTest
@ActiveProfiles("test")
class GameStateServiceTest {

    @Autowired
    private GameStateService gameStateService;

    @MockBean
    private GameStateRepository gameStateRepository;

    @MockBean
    private TokenPositionRepository tokenPositionRepository;

    @MockBean
    private CharacterRepository characterRepository;

    private GameState mockGameState;
    private Character mockCharacter;

    @BeforeEach
    void setUp() {
        // Create mock game state
        mockGameState = GameState.builder()
                .id(1L)
                .turnNumber(5)
                .turnPhase("player")
                .currentMap("saloon_interior")
                .lastActivity(LocalDateTime.now())
                .tokenPositions(new ArrayList<>())
                .build();

        // Create mock character
        mockCharacter = Character.builder()
                .id(100L)
                .name("Test Character")
                .build();
    }

    // ==================== GET OR CREATE GAME STATE TESTS ====================

    @Test
    @DisplayName("getOrCreateGameState - Returns existing game state if present")
    void getOrCreateGameState_existingState_returnsState() {
        // Arrange
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));

        // Act
        GameState result = gameStateService.getOrCreateGameState();

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getTurnNumber()).isEqualTo(5);
        verify(gameStateRepository, times(1)).findById(1L);
        verify(gameStateRepository, never()).save(any());
    }

    @Test
    @DisplayName("getOrCreateGameState - Creates new game state if none exists")
    void getOrCreateGameState_noState_createsNew() {
        // Arrange
        when(gameStateRepository.findById(1L)).thenReturn(Optional.empty());
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        GameState result = gameStateService.getOrCreateGameState();

        // Assert
        assertThat(result).isNotNull();
        verify(gameStateRepository, times(1)).findById(1L);
        verify(gameStateRepository, times(1)).save(any(GameState.class));
    }

    // ==================== UPDATE TOKEN POSITION TESTS ====================

    @Test
    @DisplayName("updateTokenPosition - Creates new position for new token")
    void updateTokenPosition_newToken_createsPosition() {
        // Arrange
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(tokenPositionRepository.findByTokenId("100")).thenReturn(Optional.empty());
        when(characterRepository.findById(100L)).thenReturn(Optional.of(mockCharacter));
        when(tokenPositionRepository.save(any(TokenPosition.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        TokenPosition result = gameStateService.updateTokenPosition("100", "PLAYER", 50, 75, "player1");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTokenId()).isEqualTo("100");
        assertThat(result.getTokenType()).isEqualTo("PLAYER");
        assertThat(result.getGridX()).isEqualTo(50);
        assertThat(result.getGridY()).isEqualTo(75);
        assertThat(result.getLastMovedBy()).isEqualTo("player1");
        verify(tokenPositionRepository, times(1)).save(any(TokenPosition.class));
    }

    @Test
    @DisplayName("updateTokenPosition - Updates existing position")
    void updateTokenPosition_existingToken_updatesPosition() {
        // Arrange
        TokenPosition existingPosition = TokenPosition.builder()
                .id(1L)
                .tokenId("100")
                .tokenType("PLAYER")
                .gridX(10)
                .gridY(20)
                .lastMovedBy("player1")
                .gameState(mockGameState)
                .build();

        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(tokenPositionRepository.findByTokenId("100")).thenReturn(Optional.of(existingPosition));
        when(tokenPositionRepository.save(any(TokenPosition.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        TokenPosition result = gameStateService.updateTokenPosition("100", "PLAYER", 50, 75, "player1");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getGridX()).isEqualTo(50);
        assertThat(result.getGridY()).isEqualTo(75);
        verify(tokenPositionRepository, times(1)).save(any(TokenPosition.class));
    }

    @Test
    @DisplayName("updateTokenPosition - ENEMY tokens don't link to character")
    void updateTokenPosition_enemyToken_noCharacterLink() {
        // Arrange
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(tokenPositionRepository.findByTokenId("enemy_1")).thenReturn(Optional.empty());
        when(tokenPositionRepository.save(any(TokenPosition.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        TokenPosition result = gameStateService.updateTokenPosition("enemy_1", "ENEMY", 30, 40, "gamemaster");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTokenId()).isEqualTo("enemy_1");
        assertThat(result.getTokenType()).isEqualTo("ENEMY");
        assertThat(result.getCharacter()).isNull();
        verify(characterRepository, never()).findById(anyLong());
    }

    // ==================== CHANGE MAP TESTS ====================

    @Test
    @DisplayName("changeMap - Clears all token positions including offline players")
    void changeMap_clearsAllTokens() {
        // Arrange
        List<TokenPosition> positions = new ArrayList<>();
        positions.add(TokenPosition.builder().tokenId("100").build());
        positions.add(TokenPosition.builder().tokenId("200").build());
        positions.add(TokenPosition.builder().tokenId("300").build());
        mockGameState.setTokenPositions(positions);

        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        gameStateService.changeMap("desert_canyon");

        // Assert
        assertThat(mockGameState.getCurrentMap()).isEqualTo("desert_canyon");
        assertThat(mockGameState.getTokenPositions()).isEmpty();
        verify(tokenPositionRepository, times(1)).deleteAll();
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    @Test
    @DisplayName("changeMap - Updates map ID correctly")
    void changeMap_updatesMapId() {
        // Arrange
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        gameStateService.changeMap("new_map_123");

        // Assert
        assertThat(mockGameState.getCurrentMap()).isEqualTo("new_map_123");
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    // ==================== GET TOKEN POSITIONS TESTS ====================

    @Test
    @DisplayName("getAllTokenPositions - Returns all positions from game state")
    void getAllTokenPositions_returnsAllPositions() {
        // Arrange
        List<TokenPosition> positions = new ArrayList<>();
        positions.add(TokenPosition.builder().tokenId("100").gridX(10).gridY(20).build());
        positions.add(TokenPosition.builder().tokenId("200").gridX(30).gridY(40).build());
        mockGameState.setTokenPositions(positions);

        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));

        // Act
        List<TokenPosition> result = gameStateService.getAllTokenPositions();

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getTokenId()).isEqualTo("100");
        assertThat(result.get(1).getTokenId()).isEqualTo("200");
    }

    @Test
    @DisplayName("getTokenPosition - Returns specific token position")
    void getTokenPosition_tokenExists_returnsPosition() {
        // Arrange
        TokenPosition position = TokenPosition.builder()
                .tokenId("100")
                .gridX(50)
                .gridY(75)
                .build();

        when(tokenPositionRepository.findByTokenId("100")).thenReturn(Optional.of(position));

        // Act
        Optional<TokenPosition> result = gameStateService.getTokenPosition("100");

        // Assert
        assertThat(result).isPresent();
        assertThat(result.get().getTokenId()).isEqualTo("100");
    }

    // ==================== REMOVE TOKEN TESTS ====================

    @Test
    @DisplayName("removeToken - Deletes token position")
    void removeToken_tokenExists_deletesPosition() {
        // Arrange
        when(tokenPositionRepository.existsByTokenId("100")).thenReturn(true);
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        gameStateService.removeToken("100");

        // Assert
        verify(tokenPositionRepository, times(1)).deleteByTokenId("100");
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    @Test
    @DisplayName("removeToken - Does nothing if token doesn't exist")
    void removeToken_tokenNotFound_doesNothing() {
        // Arrange
        when(tokenPositionRepository.existsByTokenId("999")).thenReturn(false);

        // Act
        gameStateService.removeToken("999");

        // Assert
        verify(tokenPositionRepository, never()).deleteByTokenId(anyString());
    }

    // ==================== RESET GAME STATE TESTS ====================

    @Test
    @DisplayName("resetGameState - Clears all positions and resets turn to 1")
    void resetGameState_resetsToInitialState() {
        // Arrange
        List<TokenPosition> positions = new ArrayList<>();
        positions.add(TokenPosition.builder().tokenId("100").build());
        mockGameState.setTokenPositions(positions);
        mockGameState.setTurnNumber(10);

        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        gameStateService.resetGameState();

        // Assert
        assertThat(mockGameState.getTurnNumber()).isEqualTo(1);
        assertThat(mockGameState.getTurnPhase()).isEqualTo("player");
        assertThat(mockGameState.getTokenPositions()).isEmpty();
        verify(tokenPositionRepository, times(1)).deleteAll();
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    // ==================== UPDATE TURN TESTS ====================

    @Test
    @DisplayName("updateTurn - Updates turn number and phase")
    void updateTurn_updatesTurnInfo() {
        // Arrange
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        gameStateService.updateTurn(10, "enemy");

        // Assert
        assertThat(mockGameState.getTurnNumber()).isEqualTo(10);
        assertThat(mockGameState.getTurnPhase()).isEqualTo("enemy");
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    // ==================== ADVANCE TURN TESTS ====================

    @Test
    @DisplayName("advanceTurn - Advances from player to enemy phase")
    void advanceTurn_playerPhase_advancesToEnemy() {
        // Arrange
        mockGameState.setTurnNumber(5);
        mockGameState.setTurnPhase("player");
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        GameState result = gameStateService.advanceTurn();

        // Assert
        assertThat(result.getTurnNumber()).isEqualTo(5);
        assertThat(result.getTurnPhase()).isEqualTo("enemy");
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    @Test
    @DisplayName("advanceTurn - Advances from enemy to resolution phase")
    void advanceTurn_enemyPhase_advancesToResolution() {
        // Arrange
        mockGameState.setTurnNumber(5);
        mockGameState.setTurnPhase("enemy");
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        GameState result = gameStateService.advanceTurn();

        // Assert
        assertThat(result.getTurnNumber()).isEqualTo(5);
        assertThat(result.getTurnPhase()).isEqualTo("resolution");
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    @Test
    @DisplayName("advanceTurn - Advances from resolution to player phase and increments turn")
    void advanceTurn_resolutionPhase_advancesToPlayerAndIncrementsTurn() {
        // Arrange
        mockGameState.setTurnNumber(5);
        mockGameState.setTurnPhase("resolution");
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        GameState result = gameStateService.advanceTurn();

        // Assert
        assertThat(result.getTurnNumber()).isEqualTo(6);
        assertThat(result.getTurnPhase()).isEqualTo("player");
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    @Test
    @DisplayName("advanceTurn - Handles unknown phase by defaulting to player")
    void advanceTurn_unknownPhase_defaultsToPlayer() {
        // Arrange
        mockGameState.setTurnNumber(5);
        mockGameState.setTurnPhase("unknown");
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        GameState result = gameStateService.advanceTurn();

        // Assert
        assertThat(result.getTurnNumber()).isEqualTo(5);
        assertThat(result.getTurnPhase()).isEqualTo("player");
        verify(gameStateRepository, times(1)).save(mockGameState);
    }

    @Test
    @DisplayName("advanceTurn - Updates lastActivity timestamp")
    void advanceTurn_updatesLastActivity() {
        // Arrange
        LocalDateTime oldTimestamp = LocalDateTime.now().minusMinutes(10);
        mockGameState.setTurnNumber(5);
        mockGameState.setTurnPhase("player");
        mockGameState.setLastActivity(oldTimestamp);
        when(gameStateRepository.findById(1L)).thenReturn(Optional.of(mockGameState));
        when(gameStateRepository.save(any(GameState.class))).thenReturn(mockGameState);

        // Act
        GameState result = gameStateService.advanceTurn();

        // Assert
        assertThat(result.getLastActivity()).isAfter(oldTimestamp);
        verify(gameStateRepository, times(1)).save(mockGameState);
    }
}
