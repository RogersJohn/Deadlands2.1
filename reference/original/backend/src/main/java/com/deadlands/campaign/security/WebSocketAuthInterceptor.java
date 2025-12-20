package com.deadlands.campaign.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

/**
 * Intercepts WebSocket STOMP messages to authenticate users via JWT token.
 *
 * Authentication Flow:
 * 1. Client sends CONNECT frame with Authorization header
 * 2. Extract JWT token from header
 * 3. Validate token using JwtTokenProvider
 * 4. Set authentication in Spring Security context
 * 5. Allow connection if valid, reject if invalid
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private CustomUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            // Extract Authorization header from STOMP CONNECT frame
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                try {
                    // Validate token
                    if (jwtTokenProvider.validateToken(token)) {
                        String username = jwtTokenProvider.getUsernameFromToken(token);

                        // Load user details
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                        // Create authentication
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails,
                                        null,
                                        userDetails.getAuthorities()
                                );

                        // Set authentication in accessor (available to message handlers)
                        accessor.setUser(authentication);

                        // Also set in Security Context
                        SecurityContextHolder.getContext().setAuthentication(authentication);

                        logger.info("[WebSocket] Authenticated user: {}", username);
                    } else {
                        logger.warn("[WebSocket] Invalid JWT token in WebSocket connection");
                    }
                } catch (Exception e) {
                    logger.error("[WebSocket] Error authenticating WebSocket connection", e);
                }
            } else {
                logger.warn("[WebSocket] No Authorization header in CONNECT frame");
            }
        }

        return message;
    }
}
