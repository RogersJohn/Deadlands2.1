# Deadlands V2 - Task Queue (Hybrid Architecture)

Last updated: 2026-01-17
Total tasks: 20
Completed: 1
In Progress: 0
Stuck: 0

---

## PHASE 1: Infrastructure Setup

### Task 001: Project Scaffolding
- [x] Complete
- **Branch:** feature/001-scaffolding
- **Description:** Create Spring Boot 3.2 + React 18 + TypeScript project structure with layer architecture
- **Acceptance Criteria:**
  - Spring Boot app starts on port 8080
  - React app starts on port 3000
  - TypeScript strict mode enabled
  - ESLint + Prettier configured
  - Backend has /health endpoint
  - Frontend displays "Hello Deadlands"
  - Layer packages exist: intent, rules, override, persistence, api, config
- **Tests Required:**
  - Backend health endpoint test
  - Frontend renders without errors
- **Dependencies:** None

### Task 002: Docker Configuration
- [ ] Incomplete
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
- [ ] Incomplete
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

---

## PHASE 2: Database & Auth

### Task 005: Database Schema
- [ ] Incomplete
- **Branch:** feature/005-database
- **Description:** Port and clean up database schema from original. Use Flyway migrations.
- **Acceptance Criteria:**
  - Flyway configured
  - Users table with roles (PLAYER, GAME_MASTER)
  - Characters table with proper structure
  - Wiki tables preserved from original
  - Reference data tables (skills, edges, hindrances, etc.)
  - All migrations run successfully
- **Tests Required:**
  - Migrations run on fresh database
  - Schema matches expected structure
- **Dependencies:** Task 002

### Task 006: Authentication System
- [ ] Incomplete
- **Branch:** feature/006-auth
- **Description:** JWT auth with Spring Security. Port from original but clean up.
- **Acceptance Criteria:**
  - POST /auth/register creates user
  - POST /auth/login returns JWT
  - Protected endpoints require valid JWT
  - Role-based access (PLAYER vs GAME_MASTER)
  - Password hashing with BCrypt
  - Token refresh mechanism
  - Constructor injection throughout (no @Autowired fields)
- **Tests Required:**
  - Registration works
  - Login returns valid token
  - Protected endpoint rejects invalid token
  - Role checks work
- **Dependencies:** Task 005

### Task 007: Frontend Auth Flow
- [ ] Incomplete
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

---

## PHASE 3: Wiki System (Port Working Code)

### Task 008: Wiki Backend
- [ ] Incomplete
- **Branch:** feature/008-wiki-backend
- **Description:** Port wiki functionality from original. This worked well - preserve the approach.
- **Acceptance Criteria:**
  - CRUD endpoints for wiki entries
  - Markdown content storage
  - Permission-based visibility (PUBLIC, CHARACTER_SPECIFIC, PRIVATE)
  - Category/tag support
  - Search functionality
  - Access grant system (WikiAccess entity)
- **Tests Required:**
  - Create/read/update/delete wiki entry
  - Permission filtering works
  - Search returns correct results
  - Access grants work correctly
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

---

## PHASE 4: Layer Architecture Implementation

### Task 010: Intent Layer (Java)
- [ ] Incomplete
- **Branch:** feature/010-intent-layer
- **Description:** Java implementation of intent validation. Maps to existing TypeScript interfaces in src/intent/
- **Acceptance Criteria:**
  - Intent record/class with structural validation
  - IntentValidator service
  - ValidationResult as data (VALID, INVALID, AMBIGUOUS)
  - Structural validation only (field presence, format)
  - NO permission checks or game rules in this layer
  - Boundary tests prove layer isolation
- **Tests Required:**
  - Intent validation passes regardless of actor/phase combination
  - Invalid structure returns INVALID with reasons
  - Tests verify layer contains no semantic logic
- **Dependencies:** Task 001

### Task 011: Rules Layer (Java)
- [ ] Incomplete
- **Branch:** feature/011-rules-layer
- **Description:** Java rules engine for semantic validation
- **Acceptance Criteria:**
  - RulesEngine service
  - Deterministic, side-effect free
  - Violations as data (not exceptions)
  - Permission checks (can this actor do this?)
  - Game rules (is this action allowed in this phase?)
  - Boundary tests prove layer handles semantics only
- **Tests Required:**
  - Same input always produces same output
  - Violations returned as data objects
  - No side effects during rule evaluation
- **Dependencies:** Task 010

### Task 012: GM Override Layer (Java)
- [ ] Incomplete
- **Branch:** feature/012-override-layer
- **Description:** Per ADR-0020: GM Override implementation
- **Acceptance Criteria:**
  - Override decision objects
  - Append-only audit chain
  - Warning semantics (overrides don't hide violations)
  - Explicit, auditable overrides
  - GM-only access
- **Tests Required:**
  - Override audit trail is complete
  - Cannot modify past overrides
  - Warning semantics preserved
- **Dependencies:** Task 011

### Task 013: Layer Integration Tests
- [ ] Incomplete
- **Branch:** feature/013-layer-integration
- **Description:** End-to-end tests for intent → rules → override pipeline
- **Acceptance Criteria:**
  - Full pipeline tests
  - Boundary enforcement verified
  - No boundary drift
- **Tests Required:**
  - Intent → Rules → Override flow works
  - Each layer boundary is tested
- **Dependencies:** Task 012

---

## PHASE 5: Reference Data & Character Model

### Task 014: Reference Data System
- [ ] Incomplete
- **Branch:** feature/014-reference-data
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

### Task 015: Character Model Design
- [ ] Incomplete
- **Branch:** feature/015-character-model
- **Description:** Design clean character model using layer architecture. Savage Worlds structure.
- **Acceptance Criteria:**
  - Character entity with proper relationships
  - Attributes (Agility, Smarts, Spirit, Strength, Vigor) as embedded object
  - Skills with die type + modifier
  - Edges/Hindrances as many-to-many with character-specific notes
  - Derived stats auto-calculated via rules layer (Pace, Parry, Toughness, Charisma)
  - Wounds/Fatigue tracking
  - XP and Rank tracking
  - Equipment with weight/cost
  - Arcane powers if applicable
  - Intent validation for character changes
  - Rules validation for character integrity
- **Tests Required:**
  - Character creation with all fields
  - Derived stat calculations correct
  - Relationship integrity maintained
  - Intent/Rules layers properly engaged
- **Dependencies:** Task 013, Task 014

### Task 016: Character CRUD Backend
- [ ] Incomplete
- **Branch:** feature/016-character-crud
- **Description:** REST endpoints for character management, using layer architecture
- **Acceptance Criteria:**
  - GET /api/characters (list, filtered by user for players)
  - GET /api/characters/{id} (detail with computed stats)
  - POST /api/characters (create via intent → rules pipeline)
  - PUT /api/characters/{id} (update via intent → rules pipeline)
  - DELETE /api/characters/{id} (GM only)
  - Proper validation via intent layer
  - Business rules via rules layer
  - GM overrides supported
- **Tests Required:**
  - All CRUD operations tested
  - Validation errors handled correctly
  - Authorization enforced
  - Layer pipeline engaged for each operation
- **Dependencies:** Task 015

---

## PHASE 6: Character UI

### Task 017: Character Sheet View
- [ ] Incomplete
- **Branch:** feature/017-character-sheet
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
- **Dependencies:** Task 016

### Task 018: Character Creation Wizard
- [ ] Incomplete
- **Branch:** feature/018-chargen-wizard
- **Description:** Multi-step character creation using layer architecture
- **Acceptance Criteria:**
  - Step 1: Name, concept, background text
  - Step 2: Race selection with descriptions and bonuses
  - Step 3: Attribute allocation with point-buy
  - Step 4: Skill selection with point-buy
  - Step 5: Edges/Hindrances selection with requirements
  - Step 6: Equipment purchase
  - Step 7: Arcane powers (if applicable)
  - Step 8: Review and finalize
  - Each step uses intent validation
  - Final character validated through rules layer
  - Progress saved between steps
- **Tests Required:**
  - Wizard navigation works
  - Point limits enforced via rules layer
  - Final character is valid
- **Dependencies:** Task 016

---

## COMPLETION

When all tasks are complete:
1. Update PROGRESS.md with final summary
2. Create release tag v2.0.0
3. Document any remaining issues in STUCK.md
4. Create README with setup instructions
