package com.deadlands.campaign.controller;

import com.deadlands.campaign.dto.ChangeMapRequest;
import com.deadlands.campaign.model.GameState;
import com.deadlands.campaign.model.TokenPosition;
import com.deadlands.campaign.service.GameStateService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for GameStateController.
 *
 * Tests REST endpoints:
 * - GET /api/game/state - Get current game state
 * - POST /api/game/map/change - Change map (GM only)
 * - POST /api/game/reset - Reset game (GM only)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GameStateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GameStateService gameStateService;

    private GameState mockGameState;
    private List<TokenPosition> mockPositions;

    @BeforeEach
    void setUp() {
        // Create mock game state
        mockGameState = GameState.builder()
                .id(1L)
                .turnNumber(3)
                .turnPhase("player")
                .currentMap("saloon_interior")
                .lastActivity(LocalDateTime.now())
                .tokenPositions(new ArrayList<>())
                .build();

        // Create mock token positions
        mockPositions = new ArrayList<>();
        mockPositions.add(TokenPosition.builder()
                .id(1L)
                .tokenId("100")
                .tokenType("PLAYER")
                .gridX(50)
                .gridY(75)
                .lastMovedBy("player1")
                .lastMoved(LocalDateTime.now())
                .build());
        mockPositions.add(TokenPosition.builder()
                .id(2L)
                .tokenId("200")
                .tokenType("PLAYER")
                .gridX(60)
                .gridY(80)
                .lastMovedBy("player2")
                .lastMoved(LocalDateTime.now())
                .build());
    }

    // ==================== GET GAME STATE TESTS ====================

    @Test
    @DisplayName("GET /api/game/state - Returns game state with all token positions")
    @WithMockUser(username = "player1", roles = {"PLAYER"})
    void getGameState_returnsStateWithPositions() throws Exception {
        // Arrange
        when(gameStateService.getFullGameState()).thenReturn(mockGameState);
        when(gameStateService.getAllTokenPositions()).thenReturn(mockPositions);

        // Act & Assert
        mockMvc.perform(get("/api/game/state"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.turnNumber", is(3)))
                .andExpect(jsonPath("$.turnPhase", is("player")))
                .andExpect(jsonPath("$.currentMap", is("saloon_interior")))
                .andExpect(jsonPath("$.tokenPositions", hasSize(2)))
                .andExpect(jsonPath("$.tokenPositions[0].tokenId", is("100")))
                .andExpect(jsonPath("$.tokenPositions[0].tokenType", is("PLAYER")))
                .andExpect(jsonPath("$.tokenPositions[0].gridX", is(50)))
                .andExpect(jsonPath("$.tokenPositions[0].gridY", is(75)))
                .andExpect(jsonPath("$.tokenPositions[1].tokenId", is("200")));

        verify(gameStateService, times(1)).getFullGameState();
        verify(gameStateService, times(1)).getAllTokenPositions();
    }

    @Test
    @DisplayName("GET /api/game/state - Returns empty token list when no tokens present")
    @WithMockUser(username = "player1", roles = {"PLAYER"})
    void getGameState_noTokens_returnsEmptyList() throws Exception {
        // Arrange
        when(gameStateService.getFullGameState()).thenReturn(mockGameState);
        when(gameStateService.getAllTokenPositions()).thenReturn(new ArrayList<>());

        // Act & Assert
        mockMvc.perform(get("/api/game/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenPositions", hasSize(0)));
    }

    @Test
    @DisplayName("GET /api/game/state - Requires authentication (403 without auth)")
    void getGameState_noAuth_forbidden() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/game/state"))
                .andExpect(status().isForbidden());

        // Verify service was never called
        verify(gameStateService, never()).getFullGameState();
        verify(gameStateService, never()).getAllTokenPositions();
    }

    // ==================== CHANGE MAP TESTS ====================

    @Test
    @DisplayName("POST /api/game/map/change - GM can change map")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void changeMap_asGM_succeeds() throws Exception {
        // Arrange
        ChangeMapRequest request = new ChangeMapRequest("desert_canyon");
        doNothing().when(gameStateService).changeMap(anyString());

        // Act & Assert
        mockMvc.perform(post("/api/game/map/change")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Map changed to: desert_canyon")))
                .andExpect(content().string(containsString("All token positions cleared")));

        verify(gameStateService, times(1)).changeMap("desert_canyon");
    }

    @Test
    @DisplayName("POST /api/game/map/change - Player cannot change map (403 Forbidden)")
    @WithMockUser(username = "player1", roles = {"PLAYER"})
    void changeMap_asPlayer_forbidden() throws Exception {
        // Arrange
        ChangeMapRequest request = new ChangeMapRequest("desert_canyon");

        // Act & Assert
        mockMvc.perform(post("/api/game/map/change")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(gameStateService, never()).changeMap(anyString());
    }

    @Test
    @DisplayName("POST /api/game/map/change - Empty map ID returns 400")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void changeMap_emptyMapId_badRequest() throws Exception {
        // Arrange
        ChangeMapRequest request = new ChangeMapRequest("");

        // Act & Assert
        mockMvc.perform(post("/api/game/map/change")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("Map ID cannot be empty")));

        verify(gameStateService, never()).changeMap(anyString());
    }

    @Test
    @DisplayName("POST /api/game/map/change - Null map ID returns 400")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void changeMap_nullMapId_badRequest() throws Exception {
        // Arrange
        ChangeMapRequest request = new ChangeMapRequest(null);

        // Act & Assert
        mockMvc.perform(post("/api/game/map/change")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(gameStateService, never()).changeMap(anyString());
    }

    @Test
    @DisplayName("POST /api/game/map/change - Unauthenticated request returns 403")
    void changeMap_noAuth_forbidden() throws Exception {
        // Arrange
        ChangeMapRequest request = new ChangeMapRequest("desert_canyon");

        // Act & Assert
        mockMvc.perform(post("/api/game/map/change")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(gameStateService, never()).changeMap(anyString());
    }

    // ==================== RESET GAME STATE TESTS ====================

    @Test
    @DisplayName("POST /api/game/reset - GM can reset game state")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void resetGameState_asGM_succeeds() throws Exception {
        // Arrange
        doNothing().when(gameStateService).resetGameState();

        // Act & Assert
        mockMvc.perform(post("/api/game/reset")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Game state reset")))
                .andExpect(content().string(containsString("turn reset to 1")));

        verify(gameStateService, times(1)).resetGameState();
    }

    @Test
    @DisplayName("POST /api/game/reset - Player cannot reset game (403 Forbidden)")
    @WithMockUser(username = "player1", roles = {"PLAYER"})
    void resetGameState_asPlayer_forbidden() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/game/reset")
                        .with(csrf()))
                .andExpect(status().isForbidden());

        verify(gameStateService, never()).resetGameState();
    }

    @Test
    @DisplayName("POST /api/game/reset - Unauthenticated request returns 403")
    void resetGameState_noAuth_forbidden() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/game/reset")
                        .with(csrf()))
                .andExpect(status().isForbidden());

        verify(gameStateService, never()).resetGameState();
    }

    // ==================== ADVANCE TURN TESTS ====================

    @Test
    @DisplayName("POST /api/game/turn/advance - GM can advance turn")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void advanceTurn_asGM_succeeds() throws Exception {
        // Arrange
        GameState advancedState = GameState.builder()
                .id(1L)
                .turnNumber(3)
                .turnPhase("enemy")
                .currentMap("saloon_interior")
                .lastActivity(LocalDateTime.now())
                .tokenPositions(new ArrayList<>())
                .build();

        when(gameStateService.advanceTurn()).thenReturn(advancedState);
        when(gameStateService.getAllTokenPositions()).thenReturn(mockPositions);

        // Act & Assert
        mockMvc.perform(post("/api/game/turn/advance")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.turnNumber", is(3)))
                .andExpect(jsonPath("$.turnPhase", is("enemy")))
                .andExpect(jsonPath("$.currentMap", is("saloon_interior")))
                .andExpect(jsonPath("$.tokenPositions", hasSize(2)));

        verify(gameStateService, times(1)).advanceTurn();
        verify(gameStateService, times(1)).getAllTokenPositions();
    }

    @Test
    @DisplayName("POST /api/game/turn/advance - Advances from player to enemy phase")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void advanceTurn_playerPhase_advancesToEnemy() throws Exception {
        // Arrange
        GameState advancedState = GameState.builder()
                .id(1L)
                .turnNumber(5)
                .turnPhase("enemy")
                .currentMap("saloon_interior")
                .lastActivity(LocalDateTime.now())
                .tokenPositions(new ArrayList<>())
                .build();

        when(gameStateService.advanceTurn()).thenReturn(advancedState);
        when(gameStateService.getAllTokenPositions()).thenReturn(new ArrayList<>());

        // Act & Assert
        mockMvc.perform(post("/api/game/turn/advance")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.turnNumber", is(5)))
                .andExpect(jsonPath("$.turnPhase", is("enemy")));
    }

    @Test
    @DisplayName("POST /api/game/turn/advance - Advances from resolution to player and increments turn")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void advanceTurn_resolutionPhase_advancesToPlayerAndIncrementsTurn() throws Exception {
        // Arrange
        GameState advancedState = GameState.builder()
                .id(1L)
                .turnNumber(6)
                .turnPhase("player")
                .currentMap("saloon_interior")
                .lastActivity(LocalDateTime.now())
                .tokenPositions(new ArrayList<>())
                .build();

        when(gameStateService.advanceTurn()).thenReturn(advancedState);
        when(gameStateService.getAllTokenPositions()).thenReturn(new ArrayList<>());

        // Act & Assert
        mockMvc.perform(post("/api/game/turn/advance")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.turnNumber", is(6)))
                .andExpect(jsonPath("$.turnPhase", is("player")));
    }

    @Test
    @DisplayName("POST /api/game/turn/advance - Player cannot advance turn (403 Forbidden)")
    @WithMockUser(username = "player1", roles = {"PLAYER"})
    void advanceTurn_asPlayer_forbidden() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/game/turn/advance")
                        .with(csrf()))
                .andExpect(status().isForbidden());

        verify(gameStateService, never()).advanceTurn();
    }

    @Test
    @DisplayName("POST /api/game/turn/advance - Unauthenticated request returns 403")
    void advanceTurn_noAuth_forbidden() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/game/turn/advance")
                        .with(csrf()))
                .andExpect(status().isForbidden());

        verify(gameStateService, never()).advanceTurn();
    }

    @Test
    @DisplayName("POST /api/game/turn/advance - Returns full game state with token positions")
    @WithMockUser(username = "gamemaster", roles = {"GAME_MASTER"})
    void advanceTurn_returnsFullStateWithTokens() throws Exception {
        // Arrange
        GameState advancedState = GameState.builder()
                .id(1L)
                .turnNumber(10)
                .turnPhase("resolution")
                .currentMap("desert_canyon")
                .lastActivity(LocalDateTime.now())
                .tokenPositions(new ArrayList<>())
                .build();

        when(gameStateService.advanceTurn()).thenReturn(advancedState);
        when(gameStateService.getAllTokenPositions()).thenReturn(mockPositions);

        // Act & Assert
        mockMvc.perform(post("/api/game/turn/advance")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.turnNumber", is(10)))
                .andExpect(jsonPath("$.turnPhase", is("resolution")))
                .andExpect(jsonPath("$.currentMap", is("desert_canyon")))
                .andExpect(jsonPath("$.tokenPositions", hasSize(2)))
                .andExpect(jsonPath("$.tokenPositions[0].tokenId", is("100")))
                .andExpect(jsonPath("$.tokenPositions[1].tokenId", is("200")));
    }
}
