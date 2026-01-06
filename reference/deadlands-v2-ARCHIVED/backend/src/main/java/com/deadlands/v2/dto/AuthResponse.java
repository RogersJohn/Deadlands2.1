package com.deadlands.v2.dto;

import com.deadlands.v2.entity.Role;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        UserDto user
) {
    public record UserDto(
            Long id,
            String username,
            String email,
            Role role
    ) {}
}
