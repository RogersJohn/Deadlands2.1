-- V4: Character Tables
-- Clean Savage Worlds character structure

-- Characters table
CREATE TABLE characters (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    player_id BIGINT REFERENCES users(id),

    -- Basic info
    race_id BIGINT REFERENCES race_references(id),
    concept VARCHAR(255),
    background TEXT,

    -- Attributes stored as JSONB for flexibility
    -- Format: {"agility": 6, "smarts": 8, "spirit": 6, "strength": 4, "vigor": 6}
    -- Values represent die type (4, 6, 8, 10, 12)
    attributes JSONB NOT NULL DEFAULT '{"agility": 4, "smarts": 4, "spirit": 4, "strength": 4, "vigor": 4}',

    -- Derived stats (stored for quick access, recalculated on attribute change)
    pace INTEGER NOT NULL DEFAULT 6,
    parry INTEGER NOT NULL DEFAULT 2,
    toughness INTEGER NOT NULL DEFAULT 4,

    -- Experience
    xp_total INTEGER NOT NULL DEFAULT 0,
    rank VARCHAR(20) NOT NULL DEFAULT 'NOVICE',

    -- Combat state
    wounds INTEGER NOT NULL DEFAULT 0,
    fatigue INTEGER NOT NULL DEFAULT 0,
    is_shaken BOOLEAN NOT NULL DEFAULT FALSE,

    -- Arcane (if applicable)
    arcane_background_id BIGINT REFERENCES arcane_background_references(id),
    power_points_current INTEGER DEFAULT 0,
    power_points_max INTEGER DEFAULT 0,

    -- Resources
    money DECIMAL(12,2) DEFAULT 250.00,

    -- Character type
    is_npc BOOLEAN NOT NULL DEFAULT FALSE,
    is_wild_card BOOLEAN NOT NULL DEFAULT TRUE,

    -- Notes and image
    notes TEXT,
    image_url VARCHAR(500),

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Rank: NOVICE, SEASONED, VETERAN, HEROIC, LEGENDARY
CREATE INDEX idx_characters_player ON characters(player_id);
CREATE INDEX idx_characters_npc ON characters(is_npc);
CREATE INDEX idx_characters_deleted ON characters(deleted_at);

-- Character skills (many-to-many with die value)
CREATE TABLE character_skills (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    skill_ref_id BIGINT NOT NULL REFERENCES skill_references(id),
    die_type INTEGER NOT NULL DEFAULT 4,
    modifier INTEGER NOT NULL DEFAULT 0,
    notes VARCHAR(255),
    UNIQUE(character_id, skill_ref_id)
);

-- die_type: 4, 6, 8, 10, 12 (d4, d6, d8, d10, d12)
CREATE INDEX idx_char_skills_character ON character_skills(character_id);

-- Character edges
CREATE TABLE character_edges (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    edge_ref_id BIGINT NOT NULL REFERENCES edge_references(id),
    notes VARCHAR(255),
    acquired_at_xp INTEGER DEFAULT 0,
    UNIQUE(character_id, edge_ref_id)
);

CREATE INDEX idx_char_edges_character ON character_edges(character_id);

-- Character hindrances
CREATE TABLE character_hindrances (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    hindrance_ref_id BIGINT NOT NULL REFERENCES hindrance_references(id),
    notes VARCHAR(255),
    UNIQUE(character_id, hindrance_ref_id)
);

CREATE INDEX idx_char_hindrances_character ON character_hindrances(character_id);

-- Character equipment
CREATE TABLE character_equipment (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    equipment_ref_id BIGINT NOT NULL REFERENCES equipment_references(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(255)
);

CREATE INDEX idx_char_equipment_character ON character_equipment(character_id);

-- Character powers (for arcane characters)
CREATE TABLE character_powers (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    power_ref_id BIGINT NOT NULL REFERENCES arcane_power_references(id),
    trappings TEXT,
    notes VARCHAR(255),
    UNIQUE(character_id, power_ref_id)
);

CREATE INDEX idx_char_powers_character ON character_powers(character_id);

-- Add foreign key to wiki_entries for character-linked entries
ALTER TABLE wiki_entries
ADD CONSTRAINT fk_wiki_entries_character
FOREIGN KEY (related_character_id) REFERENCES characters(id) ON DELETE SET NULL;
