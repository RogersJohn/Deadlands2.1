# Original Deadlands Campaign Manager - Analysis

**Analyzed:** 2025-12-20
**Source:** https://github.com/RogersJohn/deadlands-campaign-manager

---

## Executive Summary

The original codebase is a Spring Boot 3.2 + React 18 application for managing a Deadlands TTRPG campaign. The wiki system is well-designed and should be preserved. The character generation, AI integration, and game engine require complete rebuilds.

---

## What's Worth Keeping

### 1. Wiki System (GOOD)

**Backend: `WikiController.java`, `WikiEntry.java`, `WikiAccess.java`**

Strengths:
- Clean permission model with three visibility levels: `PUBLIC`, `CHARACTER_SPECIFIC`, `PRIVATE`
- GM can grant/revoke access to specific users
- Character-linked entries (auto-visible to character owner)
- Markdown content storage (50KB limit)
- Category system: `CHARACTER_BIO`, `CAMPAIGN_LORE`, `LOCATION`, `SESSION_NOTE`, `OTHER`
- Slug-based URL-friendly identifiers
- Sort ordering within categories

**Preserve:**
- The three-tier visibility model
- Access grant system (WikiAccess entity)
- Character-linked entries concept
- Markdown storage approach
- Category enum structure

### 2. Reference Data System (GOOD)

**Files:** `ReferenceDataController.java`, `*Reference.java` entities

Strengths:
- Comprehensive Deadlands sourcebook data
- 500+ reference entries (skills, edges, hindrances, equipment, powers)
- Separate reference entities for clean data management
- Tooltip integration with frontend

**Preserve:**
- Reference data schema structure
- Separation between reference data and character data
- The seeding approach via data.sql

### 3. Authentication Pattern (ADEQUATE)

**Files:** `AuthController.java`, `SecurityConfig.java`

Strengths:
- JWT-based authentication
- Role-based access (PLAYER, GAME_MASTER)
- BCrypt password hashing
- Rate limiting with Bucket4j

**Improve:**
- Token refresh mechanism needs cleanup
- Should use constructor injection (currently uses @Autowired fields in some places)

---

## What's Broken and Why

### 1. Character System (WEAK - REBUILD)

**Problems identified:**

a) **Mixed Die Notation Systems**
   - Has both Savage Worlds attributes (`agilityDie`, `smartsDie`, etc.)
   - AND legacy Deadlands Classic attributes (`cognitionDie`, `deftnessDie`, etc.)
   - Creates confusion and data inconsistency

b) **Derived Stats Not Properly Calculated**
   - Parry, Toughness, Charisma stored as fields but calculation logic scattered
   - No single source of truth for derived stat formulas

c) **Character Creation Wizard Issues**
   - 9 steps is too many for good UX
   - Point-buy validation is fragile
   - Edge requirement checking is incomplete
   - No proper transaction handling for multi-step creation

d) **Equipment/Skill Relationships**
   - Skills stored as separate entities but poorly linked
   - Equipment doesn't properly integrate with character stats

**Rebuild approach:**
- Savage Worlds ONLY (remove legacy Deadlands Classic)
- Attributes as embedded object, not separate fields
- Derived stats calculated via service layer, never stored
- Consolidate wizard to fewer, better-designed steps
- Proper validation service for character integrity

### 2. AI Integration (WEAK - REBUILD)

**Problems identified:**

a) **Tight Coupling**
   - `AIGameMasterService` directly calls Anthropic/OpenAI APIs
   - No abstraction layer for switching providers
   - No proper error handling or fallbacks

b) **Prompt Management**
   - Prompts embedded in Java code as strings
   - No versioning or A/B testing capability
   - No token usage tracking

c) **Image Generation**
   - Uses external Replicate API
   - Integration is brittle and often fails
   - Should be optional/secondary feature

d) **Map Generation**
   - JSON schema for maps embedded in prompts
   - Validation of AI responses is minimal
   - Frontend can crash on malformed responses

**Rebuild approach:**
- Abstract AI service layer (support multiple providers)
- Prompts stored in separate template files
- Proper cost/usage tracking
- Structured output validation
- Rate limiting per user
- Caching for repeated queries

### 3. Game Engine (WEAK - REBUILD)

**Problems identified:**

a) **Dice Rolling**
   - `SavageWorldsRules.ts` - Actually decent implementation
   - BUT: Not validated on backend (cheating possible)
   - No roll history persistence

b) **Combat Tracker**
   - WebSocket integration is fragile
   - State synchronization issues between players
   - Initiative card system incomplete

c) **Battle Map**
   - Heavy frontend-only implementation
   - Token positions not persisted properly
   - Fog of war logic is buggy

d) **Turn Management**
   - Recently refactored but still has sync issues
   - No proper state machine for combat phases

**Rebuild approach:**
- Dice rolls validated on backend
- Proper state machine for combat
- WebSocket with reconnection handling
- Persistent game state in database
- Separation: tactical data vs visual rendering

---

## Database Schema to Preserve

### Core Tables (Keep Structure)
```sql
-- Users & Auth
users (id, username, password, email, role, created_at)

-- Wiki System
wiki_entries (id, title, slug, content, category, visibility,
              related_character_id, sort_order, created_at, updated_at)
wiki_access (id, wiki_entry_id, user_id, granted_by_id,
             grant_reason, granted_at)

-- Reference Data
skill_references (id, name, attribute, description, sourcebook)
edge_references (id, name, requirements, effects, description, sourcebook)
hindrance_references (id, name, type, effects, description, sourcebook)
equipment_references (id, name, cost, weight, damage, range, description)
arcane_power_references (id, name, rank, power_points, range,
                         duration, description)
```

### Tables to Redesign
```sql
-- Characters (simplify)
characters (id, name, player_id, race, concept,
            attributes_json, -- embedded object
            xp_total, xp_spent,
            notes, image_url, is_npc,
            created_at, updated_at, deleted_at)

-- Skills/Edges/etc (many-to-many with character)
character_skills (character_id, skill_ref_id, die_value, notes)
character_edges (character_id, edge_ref_id, notes)
character_hindrances (character_id, hindrance_ref_id, notes)
character_equipment (character_id, equipment_ref_id, quantity, notes)
character_powers (character_id, power_ref_id, trappings)

-- Game State (redesign completely)
game_state (id, current_phase, active_character_id,
            round_number, illumination, updated_at)
combat_participants (game_state_id, character_id,
                     initiative_card, position_x, position_y,
                     wounds, is_shaken, status_effects)
```

---

## API Contracts to Maintain

### Authentication (Keep As-Is)
```
POST /auth/register - { username, password, email }
POST /auth/login - { username, password } -> { token, user }
```

### Wiki (Keep As-Is)
```
GET  /wiki - List visible entries
GET  /wiki/slug/{slug} - Get by slug
GET  /wiki/category/{category} - Filter by category
POST /wiki/{id}/grant-access/{userId} - GM: Grant access
DELETE /wiki/{id}/revoke-access/{userId} - GM: Revoke
```

### Reference Data (Keep As-Is)
```
GET /api/reference/skills
GET /api/reference/edges
GET /api/reference/hindrances
GET /api/reference/equipment
GET /api/reference/powers
```

### Characters (Redesign)
```
GET    /api/characters - List (filtered by role)
GET    /api/characters/{id} - Get with computed stats
POST   /api/characters - Create (validated)
PUT    /api/characters/{id} - Update (validated)
DELETE /api/characters/{id} - Soft delete (GM only)
```

### Game Engine (New Design)
```
GET  /api/game/state - Current game state
POST /api/game/combat/start - Start combat
POST /api/game/combat/initiative - Deal cards
POST /api/game/combat/next-turn - Advance turn
POST /api/game/roll - Validated dice roll
WebSocket /ws/game - Real-time updates
```

---

## Key Learnings

1. **Keep It Simple:** The wiki works because it's simple. Character system is complex and broken.

2. **Server Authority:** All game mechanics must be validated server-side. Client is for display only.

3. **State Management:** Pick one pattern and stick with it. Original has React Query + Zustand + local state chaos.

4. **AI Integration:** Make it optional and well-abstracted. Don't let AI failures break core functionality.

5. **WebSocket:** Needs proper reconnection, state reconciliation, and offline handling.

---

## Files to Reference During Build

| Feature | Original File | Notes |
|---------|--------------|-------|
| Wiki Controller | `WikiController.java` | Port with cleanup |
| Wiki Model | `WikiEntry.java` | Port directly |
| Wiki Access | `WikiAccess.java` | Port directly |
| Reference Data | `ReferenceDataController.java` | Port with constructor injection |
| Skill Reference | `SkillReference.java` | Port directly |
| Edge Reference | `EdgeReference.java` | Port directly |
| Dice Rules | `SavageWorldsRules.ts` | Port to backend too |
| Auth Controller | `AuthController.java` | Port with cleanup |
| Security Config | `SecurityConfig.java` | Port with updates |

---

*Analysis complete. Ready to begin rebuild.*
