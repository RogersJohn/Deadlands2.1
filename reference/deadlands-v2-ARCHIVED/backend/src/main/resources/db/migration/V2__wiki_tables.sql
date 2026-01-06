-- V2: Wiki System Tables
-- Preserves the working wiki structure from original

-- Wiki entry visibility levels
-- PUBLIC: Visible to all users
-- CHARACTER_SPECIFIC: Visible to character owner and GM
-- PRIVATE: GM only, can grant access to specific users

CREATE TABLE wiki_entries (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    content TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'OTHER',
    visibility VARCHAR(30) NOT NULL DEFAULT 'PUBLIC',
    related_character_id BIGINT,
    sort_order INTEGER DEFAULT 0,
    created_by_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Categories: CHARACTER_BIO, CAMPAIGN_LORE, LOCATION, SESSION_NOTE, RULES, OTHER
-- Visibility: PUBLIC, CHARACTER_SPECIFIC, PRIVATE

CREATE INDEX idx_wiki_entries_slug ON wiki_entries(slug);
CREATE INDEX idx_wiki_entries_category ON wiki_entries(category);
CREATE INDEX idx_wiki_entries_visibility ON wiki_entries(visibility);
CREATE INDEX idx_wiki_entries_related_character ON wiki_entries(related_character_id);

-- Wiki access grants (for PRIVATE entries)
CREATE TABLE wiki_access (
    id BIGSERIAL PRIMARY KEY,
    wiki_entry_id BIGINT NOT NULL REFERENCES wiki_entries(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by_id BIGINT REFERENCES users(id),
    grant_reason VARCHAR(255),
    granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wiki_entry_id, user_id)
);

CREATE INDEX idx_wiki_access_entry ON wiki_access(wiki_entry_id);
CREATE INDEX idx_wiki_access_user ON wiki_access(user_id);

-- Add full-text search capability
CREATE INDEX idx_wiki_entries_search ON wiki_entries USING gin(to_tsvector('english', title || ' ' || COALESCE(content, '')));
