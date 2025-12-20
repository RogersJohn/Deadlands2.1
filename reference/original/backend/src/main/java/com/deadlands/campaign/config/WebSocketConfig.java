package com.deadlands.campaign.config;

import com.deadlands.campaign.security.WebSocketAuthInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket configuration for real-time multiplayer synchronization.
 *
 * Architecture: Single Shared World
 * - All players connect to the same game space (no session management)
 * - Clients connect via STOMP over WebSocket at /ws endpoint
 * - Simple in-memory message broker handles pub/sub messaging
 * - /topic/game/* for broadcasts to all connected players
 * - /queue/* for private messages to individual users
 * - /app/* prefix for client messages to server
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for pub/sub messaging
        // /topic: broadcast to all connected players (e.g., /topic/game/moves, /topic/game/turn)
        // /queue: private messages to individual users (e.g., /user/queue/pong)
        config.enableSimpleBroker("/topic", "/queue");

        // Prefix for messages FROM client TO server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint at /ws
        // SockJS fallback for browsers that don't support WebSocket
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOrigins.split(","))
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Register authentication interceptor for WebSocket connections
        // This validates JWT tokens in STOMP CONNECT frames
        registration.interceptors(webSocketAuthInterceptor);
    }
}
