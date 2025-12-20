-- V3: Reference Data Tables
-- Savage Worlds / Deadlands reference data from sourcebooks

-- Skill references
CREATE TABLE skill_references (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    linked_attribute VARCHAR(20) NOT NULL,
    description TEXT,
    is_core BOOLEAN DEFAULT FALSE,
    sourcebook VARCHAR(100) DEFAULT 'Savage Worlds Core'
);

CREATE INDEX idx_skill_refs_attribute ON skill_references(linked_attribute);
CREATE INDEX idx_skill_refs_core ON skill_references(is_core);

-- Edge references
CREATE TABLE edge_references (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    requirements TEXT,
    effects TEXT,
    description TEXT,
    sourcebook VARCHAR(100) DEFAULT 'Savage Worlds Core'
);

-- Categories: BACKGROUND, COMBAT, LEADERSHIP, POWER, PROFESSIONAL, SOCIAL, WEIRD, LEGENDARY
CREATE INDEX idx_edge_refs_category ON edge_references(category);

-- Hindrance references
CREATE TABLE hindrance_references (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    severity VARCHAR(10) NOT NULL,
    effects TEXT,
    description TEXT,
    sourcebook VARCHAR(100) DEFAULT 'Savage Worlds Core'
);

-- Severity: MINOR, MAJOR
CREATE INDEX idx_hindrance_refs_severity ON hindrance_references(severity);

-- Equipment references
CREATE TABLE equipment_references (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    cost VARCHAR(50),
    weight DECIMAL(10,2),
    damage VARCHAR(50),
    armor_value INTEGER,
    range VARCHAR(50),
    rof VARCHAR(20),
    shots INTEGER,
    min_strength VARCHAR(10),
    notes TEXT,
    description TEXT,
    sourcebook VARCHAR(100) DEFAULT 'Deadlands Core'
);

-- Categories: MELEE_WEAPON, RANGED_WEAPON, ARMOR, GEAR, MOUNT, VEHICLE
CREATE INDEX idx_equipment_refs_category ON equipment_references(category);
CREATE INDEX idx_equipment_refs_name ON equipment_references(name);

-- Arcane power references
CREATE TABLE arcane_power_references (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    rank VARCHAR(20) NOT NULL DEFAULT 'NOVICE',
    power_points VARCHAR(20) NOT NULL,
    range VARCHAR(50),
    duration VARCHAR(100),
    trappings TEXT,
    description TEXT,
    sourcebook VARCHAR(100) DEFAULT 'Savage Worlds Core'
);

-- Rank: NOVICE, SEASONED, VETERAN, HEROIC, LEGENDARY
CREATE INDEX idx_power_refs_rank ON arcane_power_references(rank);

-- Race references (for Deadlands: Human variants, etc.)
CREATE TABLE race_references (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    abilities TEXT,
    description TEXT,
    sourcebook VARCHAR(100) DEFAULT 'Deadlands Core'
);

-- Arcane background references
CREATE TABLE arcane_background_references (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    skill_name VARCHAR(100) NOT NULL,
    starting_powers INTEGER NOT NULL DEFAULT 3,
    starting_power_points INTEGER NOT NULL DEFAULT 10,
    description TEXT,
    sourcebook VARCHAR(100) DEFAULT 'Deadlands Core'
);
