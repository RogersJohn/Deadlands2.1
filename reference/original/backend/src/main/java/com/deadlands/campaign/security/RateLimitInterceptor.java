package com.deadlands.campaign.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor that applies rate limiting to incoming HTTP requests.
 * Returns 429 Too Many Requests if rate limit is exceeded.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitService rateLimitService;

    public RateLimitInterceptor(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String ip = getClientIP(request);
        String path = request.getRequestURI();

        // Apply stricter rate limit for login endpoint
        if (path.contains("/auth/login")) {
            if (!rateLimitService.tryConsumeLogin(ip)) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too many login attempts. Please try again later.");
                return false;
            }
        } else {
            // Apply general rate limit for other endpoints
            if (!rateLimitService.tryConsume(ip)) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Rate limit exceeded. Please try again later.");
                return false;
            }
        }

        return true;
    }

    /**
     * Extract client IP address from request, considering proxy headers.
     */
    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        // X-Forwarded-For can contain multiple IPs, get the first one
        return xfHeader.split(",")[0];
    }
}
