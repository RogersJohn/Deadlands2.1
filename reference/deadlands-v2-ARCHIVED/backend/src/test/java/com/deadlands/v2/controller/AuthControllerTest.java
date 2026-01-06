package com.deadlands.v2.controller;

import com.deadlands.v2.dto.LoginRequest;
import com.deadlands.v2.dto.RegisterRequest;
import com.deadlands.v2.entity.Role;
import com.deadlands.v2.entity.User;
import com.deadlands.v2.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    void register_WithValidData_ReturnsTokens() throws Exception {
        RegisterRequest request = new RegisterRequest("testuser", "password123", "test@example.com");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("testuser"))
                .andExpect(jsonPath("$.user.email").value("test@example.com"))
                .andExpect(jsonPath("$.user.role").value("PLAYER"));
    }

    @Test
    void register_WithDuplicateUsername_ReturnsBadRequest() throws Exception {
        // Create existing user
        User existingUser = new User("testuser", passwordEncoder.encode("password"), "existing@example.com", Role.PLAYER);
        userRepository.save(existingUser);

        RegisterRequest request = new RegisterRequest("testuser", "password123", "new@example.com");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username already exists"));
    }

    @Test
    void register_WithInvalidData_ReturnsValidationError() throws Exception {
        RegisterRequest request = new RegisterRequest("ab", "short", "invalid-email");

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isNotEmpty());
    }

    @Test
    void login_WithValidCredentials_ReturnsTokens() throws Exception {
        // Create user
        User user = new User("testuser", passwordEncoder.encode("password123"), "test@example.com", Role.PLAYER);
        userRepository.save(user);

        LoginRequest request = new LoginRequest("testuser", "password123");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("testuser"));
    }

    @Test
    void login_WithInvalidCredentials_ReturnsUnauthorized() throws Exception {
        // Create user
        User user = new User("testuser", passwordEncoder.encode("password123"), "test@example.com", Role.PLAYER);
        userRepository.save(user);

        LoginRequest request = new LoginRequest("testuser", "wrongpassword");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_WithValidToken_ReturnsSuccess() throws Exception {
        // Register user to get token
        RegisterRequest registerRequest = new RegisterRequest("testuser", "password123", "test@example.com");

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String response = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(response).get("accessToken").asText();

        // Access health endpoint (always public) - test that auth header doesn't break it
        mockMvc.perform(get("/health")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void protectedEndpoint_WithInvalidToken_ReturnsUnauthorized() throws Exception {
        // Try to access a protected endpoint with invalid token
        mockMvc.perform(get("/api/characters")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedEndpoint_WithoutToken_ReturnsUnauthorized() throws Exception {
        // Try to access a protected endpoint without token
        mockMvc.perform(get("/api/characters"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshToken_WithValidRefreshToken_ReturnsNewAccessToken() throws Exception {
        // Register user to get tokens
        RegisterRequest registerRequest = new RegisterRequest("testuser", "password123", "test@example.com");

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String response = result.getResponse().getContentAsString();
        String refreshToken = objectMapper.readTree(response).get("refreshToken").asText();

        // Refresh token
        mockMvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\": \"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("testuser"));
    }

    @Test
    void gmEndpoint_WithPlayerRole_ReturnsForbidden() throws Exception {
        // Register player user
        RegisterRequest registerRequest = new RegisterRequest("player", "password123", "player@example.com");

        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String response = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(response).get("accessToken").asText();

        // Try to access GM-only endpoint
        mockMvc.perform(get("/api/admin/test")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
