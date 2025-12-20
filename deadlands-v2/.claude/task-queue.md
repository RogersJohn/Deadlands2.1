# Deadlands V2 - Task Queue

Last updated: 2025-12-20
Total tasks: 25
Completed: 6
In Progress: 0
Stuck: 0

---

## PHASE 0: Infrastructure

### Task 001: Project Scaffolding
- [x] Complete
- **Branch:** feature/001-scaffolding
- **Description:** Create Spring Boot 3.2 + React 18 + TypeScript project structure with proper configs
- **Acceptance Criteria:**
  - Spring Boot app starts on port 8080
  - React app starts on port 3000
  - TypeScript strict mode enabled
  - ESLint + Prettier configured
  - Backend can serve a /health endpoint
  - Frontend can display "Hello Deadlands"
- **Tests Required:**
  - Backend health endpoint test
  - Frontend renders without errors
- **Dependencies:** None

### Task 002: Docker Configuration
- [x] Complete
- **Branch:** feature/002-docker
- **Description:** Dockerfiles for frontend/backend + docker-compose for local dev
- **Acceptance Criteria:**
  - `docker-compose up` starts full stack
  - PostgreSQL container included
  - Hot reload works in dev mode
  - Containers build successfully
- **Tests Required:**
  - docker-compose up succeeds
  - Services communicate correctly
- **Dependencies:** Task 001

### Task 003: GitHub Actions CI
- [x] Complete
- **Branch:** feature/003-ci
- **Description:** CI pipeline that runs tests and linting on PRs
- **Acceptance Criteria:**
  - Runs on all PRs to main
  - Backend tests run
  - Frontend tests run
  - Linting runs
  - Fails fast on errors
  - Status checks required for merge
- **Tests Required:**
  - CI runs on this PR itself
- **Dependencies:** Task 001

### Task 004: Railway Deployment Setup
- [ ] Incomplete
- **Branch:** feature/004-railway
- **Description:** Configure Railway for auto-deploy on main + preview deploys on PRs
- **Acceptance Criteria:**
  - railway.json configured
  - Main branch deploys to production URL
  - PRs deploy to preview URLs
  - Environment variables documented
  - Deploy succeeds
- **Tests Required:**
  - Deployment completes
  - Health endpoint accessible on deployed URL
- **Dependencies:** Task 002, Task 003

### Task 005: Database Schema
- [x] Complete
- **Branch:** feature/005-database
- **Description:** Port and clean up database schema from original. Use Flyway migrations.
- **Acceptance Criteria:**
  - Flyway configured
  - Users table with roles (PLAYER, GM)
  - Characters table with proper structure
  - Wiki tables preserved from original
  - Reference data tables (skills, edges, hindrances, etc.)
  - All migrations run successfully
- **Tests Required:**
  - Migrations run on fresh database
  - Schema matches expected structure
- **Dependencies:** Task 002

---

## PHASE 1: Core Features + Wiki (Port Working Code)

### Task 006: Authentication System
- [x] Complete
- **Branch:** feature/006-auth
- **Description:** JWT auth with Spring Security. Port from original but clean up.
- **Acceptance Criteria:**
  - POST /auth/register creates user
  - POST /auth/login returns JWT
  - Protected endpoints require valid JWT
  - Role-based access (PLAYER vs GM)
  - Password hashing with BCrypt
  - Token refresh mechanism
- **Tests Required:**
  - Registration works
  - Login returns valid token
  - Protected endpoint rejects invalid token
  - Role checks work
- **Dependencies:** Task 005

### Task 007: Frontend Auth Flow
- [x] Complete
- **Branch:** feature/007-frontend-auth
- **Description:** Login/register pages, auth context, protected routes
- **Acceptance Criteria:**
  - Login page functional
  - Register page functional
  - Auth state persisted in localStorage
  - Protected routes redirect to login
  - Logout clears state
  - API client includes auth header
- **Tests Required:**
  - Login flow works end-to-end
  - Protected route redirects when not logged in
- **Dependencies:** Task 006

### Task 008: Wiki Backend
- [ ] Incomplete
- **Branch:** feature/008-wiki-backend
- **Description:** Port wiki functionality from original. This worked well - preserve the approach.
- **Acceptance Criteria:**
  - CRUD endpoints for wiki entries
  - Markdown content storage
  - Permission-based visibility (public/private/GM-only)
  - Category/tag support
  - Search functionality
- **Tests Required:**
  - Create/read/update/delete wiki entry
  - Permission filtering works
  - Search returns correct results
- **Dependencies:** Task 006

### Task 009: Wiki Frontend
- [ ] Incomplete
- **Branch:** feature/009-wiki-frontend
- **Description:** Port wiki UI from original. Preserve the good UX.
- **Acceptance Criteria:**
  - Wiki entry list view
  - Wiki entry detail view with Markdown rendering
  - Create/edit forms (GM only for private content)
  - Category navigation
  - Search interface
  - Western theme styling consistent with original
- **Tests Required:**
  - Wiki pages render correctly
  - CRUD operations work from UI
- **Dependencies:** Task 008

### Task 010: Reference Data System
- [ ] Incomplete
- **Branch:** feature/010-reference-data
- **Description:** Port reference data (skills, edges, hindrances, equipment, powers) from original
- **Acceptance Criteria:**
  - All reference tables seeded with Deadlands data
  - Public GET endpoints for each reference type
  - Tooltip/lookup component for frontend
  - Data matches original sourcebook entries
- **Tests Required:**
  - All reference endpoints return data
  - Data integrity verified
- **Dependencies:** Task 005

---

## PHASE 2: Character System (Complete Rebuild)

### Task 011: Character Model Design
- [ ] Incomplete
- **Branch:** feature/011-character-model
- **Description:** Design clean character model. The original was weak - start fresh with proper Savage Worlds structure.
- **Acceptance Criteria:**
  - Character entity with proper relationships
  - Attributes (Agility, Smarts, Spirit, Strength, Vigor) as embedded object
  - Skills with die type + modifier
  - Edges/Hindrances as many-to-many with character-specific notes
  - Derived stats auto-calculated (Pace, Parry, Toughness, Charisma)
  - Wounds/Fatigue tracking
  - XP and Rank tracking
  - Equipment with weight/cost
  - Arcane powers if applicable
- **Tests Required:**
  - Character creation with all fields
  - Derived stat calculations correct
  - Relationship integrity maintained
- **Dependencies:** Task 010

### Task 012: Character CRUD Backend
- [ ] Incomplete
- **Branch:** feature/012-character-crud
- **Description:** REST endpoints for character management
- **Acceptance Criteria:**
  - GET /api/characters (list, filtered by user for players)
  - GET /api/characters/{id} (detail)
  - POST /api/characters (create)
  - PUT /api/characters/{id} (update)
  - DELETE /api/characters/{id} (GM only)
  - Proper validation on all inputs
  - Error responses are helpful
- **Tests Required:**
  - All CRUD operations tested
  - Validation errors handled correctly
  - Authorization enforced
- **Dependencies:** Task 011

### Task 013: Character Creation Wizard - Step 1-3
- [ ] Incomplete
- **Branch:** feature/013-chargen-basics
- **Description:** First 3 steps of character creation: Concept, Race, Attributes
- **Acceptance Criteria:**
  - Step 1: Name, concept, background text
  - Step 2: Race selection with descriptions and bonuses applied
  - Step 3: Attribute allocation with point-buy system
  - Progress saved between steps
  - Validation prevents invalid states
  - Clear UI feedback
- **Tests Required:**
  - Wizard navigation works
  - Attribute point limits enforced
  - Race bonuses applied correctly
- **Dependencies:** Task 012

### Task 014: Character Creation Wizard - Step 4-6
- [ ] Incomplete
- **Branch:** feature/014-chargen-skills
- **Description:** Steps 4-6: Skills, Edges, Hindrances
- **Acceptance Criteria:**
  - Step 4: Skill selection with point-buy, linked attribute shown
  - Step 5: Edge selection with requirement validation
  - Step 6: Hindrance selection with point tracking
  - Edge requirements checked (attribute/skill prerequisites)
  - Hindrance points fuel edge purchases correctly
  - Tooltips show full descriptions from reference data
- **Tests Required:**
  - Skill point limits enforced
  - Edge requirements validated
  - Hindrance/Edge point economy correct
- **Dependencies:** Task 013

### Task 015: Character Creation Wizard - Step 7-9
- [ ] Incomplete
- **Branch:** feature/015-chargen-gear
- **Description:** Steps 7-9: Equipment, Powers (if arcane), Review/Finalize
- **Acceptance Criteria:**
  - Step 7: Equipment purchase with starting funds
  - Step 8: Arcane power selection (conditional on having arcane background)
  - Step 9: Full character review, calculated stats shown, confirm creation
  - Weight/encumbrance tracked
  - Power points shown if applicable
  - Final validation before save
- **Tests Required:**
  - Equipment cost/weight calculated
  - Powers only shown for arcane characters
  - Final character saves correctly
- **Dependencies:** Task 014

### Task 016: Character Sheet View
- [ ] Incomplete
- **Branch:** feature/016-character-sheet
- **Description:** Read-only character sheet display with all information
- **Acceptance Criteria:**
  - Clean, readable layout (Western theme)
  - All attributes and skills displayed with die codes
  - Edges and Hindrances listed with descriptions
  - Equipment with stats
  - Derived stats prominent
  - Wounds/Fatigue tracking visible
  - Arcane powers if applicable
  - Print-friendly option
- **Tests Required:**
  - All character data renders
  - Styling matches theme
- **Dependencies:** Task 012

### Task 017: Character Edit Mode
- [ ] Incomplete
- **Branch:** feature/017-character-edit
- **Description:** Edit existing characters with proper validation
- **Acceptance Criteria:**
  - Edit mode toggle on character sheet
  - All fields editable (respecting game rules)
  - XP expenditure interface for advancement
  - Validation prevents invalid changes
  - Save/cancel with confirmation
  - Audit log of changes (optional)
- **Tests Required:**
  - Edit and save works
  - Validation prevents bad data
- **Dependencies:** Task 016

---

## PHASE 3: AI Integration (Complete Rebuild)

### Task 018: AI Service Architecture
- [ ] Incomplete
- **Branch:** feature/018-ai-architecture
- **Description:** Clean AI integration using Anthropic Claude API properly
- **Acceptance Criteria:**
  - AI service abstraction layer
  - Anthropic Claude API client
  - Proper prompt templates stored separately
  - Rate limiting and error handling
  - Response caching where appropriate
  - Cost tracking/logging
  - Configurable model selection
- **Tests Required:**
  - API client connects successfully
  - Error handling works
  - Rate limiting prevents overuse
- **Dependencies:** Task 006

### Task 019: NPC Generation
- [ ] Incomplete
- **Branch:** feature/019-npc-generation
- **Description:** AI-powered NPC generation with game-appropriate stats
- **Acceptance Criteria:**
  - Generate NPC from description/role
  - Stats conform to Savage Worlds rules
  - Personality and background generated
  - Equipment appropriate to role
  - Save generated NPC to database
  - Regenerate option
- **Tests Required:**
  - NPC generation returns valid character
  - Stats are rule-legal
- **Dependencies:** Task 018, Task 011

### Task 020: GM Assistant - Rules Lookup
- [ ] Incomplete
- **Branch:** feature/020-rules-lookup
- **Description:** AI-powered rules lookup using reference data + general knowledge
- **Acceptance Criteria:**
  - Chat interface for rules questions
  - Searches reference data first
  - Falls back to AI knowledge for edge cases
  - Citations to sourcebooks where possible
  - GM-only feature
- **Tests Required:**
  - Common rules questions answered correctly
  - Reference data cited when applicable
- **Dependencies:** Task 018, Task 010

### Task 021: Encounter Generation
- [ ] Incomplete
- **Branch:** feature/021-encounters
- **Description:** AI-generated encounters with appropriate challenge
- **Acceptance Criteria:**
  - Input: party composition, difficulty, theme
  - Output: enemies with stats, tactics, terrain suggestions
  - Balance calculations based on party
  - Save encounter for reuse
  - Integration with combat tracker (Phase 4)
- **Tests Required:**
  - Encounters generate successfully
  - Enemy stats are valid
- **Dependencies:** Task 019

---

## PHASE 4: Game Engine (Complete Rebuild)

### Task 022: Dice Rolling System
- [ ] Incomplete
- **Branch:** feature/022-dice
- **Description:** Proper Savage Worlds dice roller with exploding dice, wild die, etc.
- **Acceptance Criteria:**
  - Roll any die type (d4, d6, d8, d10, d12, d20)
  - Exploding dice (acing) implemented
  - Wild Die for Wild Cards
  - Raise calculation
  - Roll history
  - Skill/attribute rolls with modifiers
  - Damage rolls
  - Backend validation of rolls (prevent cheating)
- **Tests Required:**
  - Exploding dice work
  - Wild die applies correctly
  - Raise calculation correct
- **Dependencies:** Task 001

### Task 023: Combat Tracker Backend
- [ ] Incomplete
- **Branch:** feature/023-combat-backend
- **Description:** Turn-based combat management system
- **Acceptance Criteria:**
  - Initiative with card-based system (Savage Worlds)
  - Turn order management
  - Action tracking (standard, free, movement)
  - Wound application
  - Status effects (Shaken, etc.)
  - Combat log
  - WebSocket for real-time updates
- **Tests Required:**
  - Initiative dealt correctly
  - Turn order follows rules
  - Wounds apply correctly
- **Dependencies:** Task 022, Task 011

### Task 024: Combat Tracker Frontend
- [ ] Incomplete
- **Branch:** feature/024-combat-frontend
- **Description:** Interactive combat interface
- **Acceptance Criteria:**
  - Initiative order display with cards
  - Current turn highlighted
  - Quick action buttons (attack, defend, move)
  - Dice roller integration
  - Wound tracking per character
  - Status effect indicators
  - GM controls (advance turn, add combatants)
  - Player view (their character + visible enemies)
- **Tests Required:**
  - Combat flows correctly
  - Real-time updates work
- **Dependencies:** Task 023

### Task 025: Battle Map (Basic)
- [ ] Incomplete
- **Branch:** feature/025-battlemap
- **Description:** Simple tactical grid for combat visualization
- **Acceptance Criteria:**
  - Grid-based map
  - Token placement for characters/enemies
  - Movement with range display
  - Terrain markers (cover, difficult terrain)
  - Fog of war for players
  - GM can reveal/hide areas
  - Save/load map configurations
- **Tests Required:**
  - Token movement works
  - Fog of war functions correctly
- **Dependencies:** Task 024

---

## COMPLETION

When all tasks are complete:
1. Update PROGRESS.md with final summary
2. Create release tag v2.0.0
3. Document any remaining issues in STUCK.md
4. Create README with setup instructions
