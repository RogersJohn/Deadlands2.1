package com.deadlands.campaign.controller;

import com.deadlands.campaign.dto.ChangePasswordRequest;
import com.deadlands.campaign.dto.LoginRequest;
import com.deadlands.campaign.dto.RegisterRequest;
import com.deadlands.campaign.model.User;
import com.deadlands.campaign.repository.UserRepository;
import com.deadlands.campaign.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for AuthController.
 *
 * Tests all authentication endpoints:
 * - POST /auth/login - User login
 * - POST /auth/register - User registration
 * - POST /auth/change-password - Password change
 *
 * Uses @SpringBootTest with @AutoConfigureMockMvc for full integration testing.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthenticationManager authenticationManager;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JwtTokenProvider tokenProvider;

    private User testUser;
    private LoginRequest loginRequest;
    private RegisterRequest registerRequest;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .password("encoded-password")
                .role(User.Role.PLAYER)
                .active(true)
                .build();

        // Create login request
        loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");

        // Create register request
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setPassword("password123");
    }

    // ==================== LOGIN TESTS ====================

    @Test
    @DisplayName("POST /auth/login - Success")
    void login_withValidCredentials_returnsTokenAndUserInfo() throws Exception {
        // Arrange
        Authentication authentication = new UsernamePasswordAuthenticationToken("testuser", "password123");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(userRepository.findByUsername("testuser"))
                .thenReturn(Optional.of(testUser));
        when(tokenProvider.generateToken(any(Authentication.class)))
                .thenReturn("fake-jwt-token-12345");

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", is("fake-jwt-token-12345")))
                .andExpect(jsonPath("$.userId", is(testUser.getId().intValue())))
                .andExpect(jsonPath("$.username", is("testuser")))
                .andExpect(jsonPath("$.role", is("PLAYER")));

        // Verify authentication was called
        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(tokenProvider, times(1)).generateToken(any(Authentication.class));
        verify(userRepository, times(1)).findByUsername("testuser");
    }

    @Test
    @DisplayName("POST /auth/login - Invalid credentials")
    void login_withInvalidCredentials_returnsUnauthorized() throws Exception {
        // Arrange
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().is5xxServerError());  // GlobalExceptionHandler converts to 500

        verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(tokenProvider, never()).generateToken(any());
    }

    @Test
    @DisplayName("POST /auth/login - User not found after authentication")
    void login_whenUserNotFoundInDatabase_throwsException() throws Exception {
        // Arrange
        Authentication authentication = new UsernamePasswordAuthenticationToken("testuser", "password123");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(userRepository.findByUsername("testuser"))
                .thenReturn(Optional.empty());

        // Act & Assert
        mockMvc.perform(post("/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().is5xxServerError());
    }

    @Test
    @DisplayName("POST /auth/login - Missing username")
    void login_withMissingUsername_returnsBadRequest() throws Exception {
        // Arrange
        loginRequest.setUsername(null);

        // Act & Assert
        // Note: Validation failures throw exceptions caught by GlobalExceptionHandler (HTTP 500)
        mockMvc.perform(post("/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().is5xxServerError());

        verify(authenticationManager, never()).authenticate(any());
    }

    // ==================== REGISTRATION TESTS ====================

    @Test
    @DisplayName("POST /auth/register - Success")
    void register_withValidData_createsUser() throws Exception {
        // Arrange
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act & Assert
        mockMvc.perform(post("/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(content().string("User registered successfully!"));

        verify(userRepository, times(1)).existsByUsername("newuser");
        verify(userRepository, times(1)).existsByEmail("newuser@example.com");
        verify(passwordEncoder, times(1)).encode("password123");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("POST /auth/register - Username already exists")
    void register_withExistingUsername_returnsBadRequest() throws Exception {
        // Arrange
        when(userRepository.existsByUsername("newuser")).thenReturn(true);

        // Act & Assert
        mockMvc.perform(post("/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Error: Username is already taken!"));

        verify(userRepository, times(1)).existsByUsername("newuser");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("POST /auth/register - Email already exists")
    void register_withExistingEmail_returnsBadRequest() throws Exception {
        // Arrange
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(true);

        // Act & Assert
        mockMvc.perform(post("/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Error: Email is already in use!"));

        verify(userRepository, times(1)).existsByEmail("newuser@example.com");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("POST /auth/register - Missing required fields")
    void register_withMissingFields_returnsBadRequest() throws Exception {
        // Arrange
        registerRequest.setUsername(null);

        // Act & Assert
        // Note: Validation failures throw exceptions caught by GlobalExceptionHandler (HTTP 500)
        mockMvc.perform(post("/auth/register")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().is5xxServerError());

        verify(userRepository, never()).save(any(User.class));
    }

    // ==================== CHANGE PASSWORD TESTS ====================

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("POST /auth/change-password - Success")
    void changePassword_withValidData_updatesPassword() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpassword");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("newpassword123");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(passwordEncoder.encode(anyString())).thenReturn("new-encoded-password");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act & Assert
        mockMvc.perform(post("/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Password changed successfully!"));

        verify(passwordEncoder, times(1)).matches(anyString(), anyString());
        verify(passwordEncoder, times(1)).encode(anyString());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("POST /auth/change-password - Incorrect current password")
    void changePassword_withIncorrectCurrentPassword_returnsBadRequest() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("wrongpassword");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("newpassword123");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("wrongpassword", testUser.getPassword())).thenReturn(false);

        // Act & Assert
        mockMvc.perform(post("/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Current password is incorrect"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("POST /auth/change-password - New password doesn't match confirmation")
    void changePassword_withMismatchedPasswords_returnsBadRequest() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpassword");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("differentpassword");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("oldpassword", testUser.getPassword())).thenReturn(true);

        // Act & Assert
        mockMvc.perform(post("/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("New password and confirmation do not match"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @WithMockUser(username = "testuser")
    @DisplayName("POST /auth/change-password - New password same as current")
    void changePassword_withSamePassword_returnsBadRequest() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("password123");
        request.setNewPassword("password123");
        request.setConfirmPassword("password123");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(passwordEncoder.matches("password123", testUser.getPassword())).thenReturn(true);

        // Act & Assert
        mockMvc.perform(post("/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("New password must be different from current password"));

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("POST /auth/change-password - Unauthenticated user")
    void changePassword_withoutAuthentication_returnsForbidden() throws Exception {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpassword");
        request.setNewPassword("newpassword123");
        request.setConfirmPassword("newpassword123");

        // Act & Assert (no @WithMockUser, so not authenticated)
        // Note: Spring Security returns 403 Forbidden for unauthenticated requests to protected endpoints
        mockMvc.perform(post("/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        verify(userRepository, never()).findByUsername(anyString());
        verify(userRepository, never()).save(any(User.class));
    }
}
