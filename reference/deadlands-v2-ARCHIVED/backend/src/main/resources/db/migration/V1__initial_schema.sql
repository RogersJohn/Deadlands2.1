-- V1: Initial Schema
-- This creates the base tables for Deadlands V2

-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'PLAYER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create index for username lookups
CREATE INDEX idx_users_username ON users(username);

-- Insert default GM user (password: admin123)
-- BCrypt hash of 'admin123'
INSERT INTO users (username, password, email, role)
VALUES ('gamemaster', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'gm@deadlands.local', 'GAME_MASTER');
