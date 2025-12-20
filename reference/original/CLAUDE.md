# Project Context for Claude

## Current Status (2025-11-23)

**Last Session:** Quick Wins Implementation (4 features completed)
**Next Priority:** Manual testing → Commit → Choose next MVP
**Build Status:** ✅ Frontend builds successfully (3,099 kB)

---

## What Was Just Done (Session 2025-11-23)

Implemented 4 high-ROI quick wins:

1. **Security Cleanup** - Moved migration scripts with credentials to archive/
2. **Arena Protection** - Redirect to /character-select if no character selected
3. **Illumination UI** - GM Control Panel dropdown for lighting control
4. **Character Delete** - Delete button with confirmation dialog

**All changes are frontend-only, no breaking changes.**

---

## Quick Start for Next Session

### Immediate Tasks
1. **Manual Testing** - Test the 4 quick wins (see NEXT_SESSION.md)
2. **Git Commit** - Commit if tests pass
3. **Choose Next Work** - Option A (E2E tests), B (Illumination WebSocket), or C (MVPs)

### Recommended Next Step
**Option B: Illumination WebSocket Broadcast** (1-2 hours)
- Extends quick win #3
- Makes illumination sync for all players
- Follows turn management pattern

---

## Important Files

### Start Here
- `NEXT_SESSION.md` - Action items and priorities
- `SESSION_2025-11-23.md` - What was just accomplished
- `QUICK_WINS_2025-11-23.md` - Detailed implementation guide

### Architecture Documentation
- `ARCHITECTURE_DECISIONS.md` - Why we made design choices
- `COMMON_PATTERNS.md` - How to implement features
- `STATE_MANAGEMENT.md` - When to use Zustand vs React Query

### Implementation References
- `TURN_MANAGEMENT_IMPLEMENTATION.md` - WebSocket pattern
- `TURN_MANAGEMENT_TESTS.md` - Testing guide
- `SECURITY.md` - Security best practices

---

## Current Architecture

**Single Persistent World** - No sessions, all players share one game state
**WebSocket Real-time Sync** - Turn changes, token positions, etc.
**State Management:**
- Zustand for global state (selectedCharacter, UI preferences)
- React Query for server state (characters, game state)
- useState for component-local state

**Authentication:** JWT bearer tokens, role-based access control

---

## Testing Infrastructure

**Backend Tests:** JUnit (77 tests, ~35-40% coverage)
**E2E Tests:** Cucumber/Selenium (33 turn management tests complete, others archived)
**Frontend Tests:** None yet (future work)

---

## Development Commands

```bash
# Start backend
cd backend
mvnw.cmd spring-boot:run

# Start frontend
cd frontend
npm run dev

# Build frontend
cd frontend
npm run build

# Run backend tests
cd backend
mvnw.cmd test
```

---

## Recent Sessions

### Session 2025-11-23 (This Session)
- 4 quick wins implemented
- Security cleanup
- Arena protection redirect
- Illumination UI control
- Character delete button

### Session 2025-11-22
- State management refactoring
- Character selection screen
- WebSocket hook extraction
- Architecture documentation

### Session 2025-11-19
- Turn management with WebSocket sync
- GM Control Panel (floating/draggable)
- Map coordinate display
- Session removal complete

---

## Known Issues

**None Currently** - All quick wins implemented cleanly

**Future Work:**
- Illumination not synced across players (local to GM only)
- E2E tests need rewrite for single world architecture

---

## Notes for Future Sessions

### Patterns to Follow
- WebSocket integration: See TURN_MANAGEMENT_IMPLEMENTATION.md
- GM-only features: Role-based rendering + backend @PreAuthorize
- Confirmation dialogs: Use Material-UI Dialog for destructive actions
- State management: See STATE_MANAGEMENT.md for guidelines

### Don't Repeat These Mistakes
- Don't hardcode credentials (use environment variables)
- Don't allow direct /arena navigation without character check
- Don't create duplicate WebSocket subscriptions
- Don't use sessions (single persistent world only)

---

## Test Accounts

**Local:**
- GM: `gamemaster` / `password`
- Player: `testplayer` / `password`

**Production:**
- GM: `gamemaster` / `Test123!`
- Players: `e2e_player1`, `e2e_player2` / `Test123!`

---

**For detailed next steps, see NEXT_SESSION.md**
