package com.deadlands.campaign.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestURI = request.getRequestURI();
        String method = request.getMethod();
        String origin = request.getHeader("Origin");

        // Always log for diagnosing 403 issues (can disable after fix)
        log.info("[JWT-FILTER] {} {} | Origin: {}", method, requestURI, origin);

        try {
            String jwt = getJwtFromRequest(request);
            boolean hasToken = StringUtils.hasText(jwt);

            log.info("[JWT-FILTER] Token present: {} | Token length: {}",
                    hasToken, hasToken ? jwt.length() : 0);

            if (hasToken) {
                boolean isValid = tokenProvider.validateToken(jwt);
                log.info("[JWT-FILTER] Token valid: {}", isValid);

                if (isValid) {
                    String username = tokenProvider.getUsernameFromToken(jwt);
                    log.info("[JWT-FILTER] Username from token: {}", username);

                    UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);
                    log.info("[JWT-FILTER] UserDetails loaded - Username: {}, Authorities: {}",
                            userDetails.getUsername(), userDetails.getAuthorities());

                    UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.info("[JWT-FILTER] Authentication SET in SecurityContext");
                } else {
                    log.warn("[JWT-FILTER] Token validation FAILED for URI: {}", requestURI);
                }
            } else {
                log.info("[JWT-FILTER] No token provided for URI: {}", requestURI);
            }
        } catch (Exception ex) {
            log.error("[JWT-FILTER] Exception during authentication: {} - {}",
                    ex.getClass().getSimpleName(), ex.getMessage());
            logger.error("Could not set user authentication in security context", ex);
        }

        // Log final authentication state
        var auth = SecurityContextHolder.getContext().getAuthentication();
        log.info("[JWT-FILTER] Final auth state - Authenticated: {}, Principal: {}, Authorities: {}",
                auth != null && auth.isAuthenticated(),
                auth != null ? auth.getName() : "NULL",
                auth != null ? auth.getAuthorities() : "NULL");

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
