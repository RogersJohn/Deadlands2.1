# Testing Gaps & Priorities

**Date:** 2025-11-22
**Based On:** Full E2E test suite analysis
**Current Status:** 0/47 tests passing (all reference removed architecture)

---

## 🔴 Critical Gaps (Block Deployment)

### 1. **Multiplayer WebSocket Synchronization** - PRIORITY 1
**Status:** Tests exist but broken (session-based)
**Impact:** Core functionality untested
**Risk:** Multiplayer may not work in production

**Missing Coverage:**
- ✅ Test exists: Two players see each other's tokens
- ✅ Test exists: Token movements sync in real-time
- ✅ Test exists: WebSocket reconnection
- ❌ **All broken:** Reference old session architecture

**Action Required:**
```gherkin
# Rewrite to:
Scenario: Two players see each other in arena
  Given "e2e_testgm" logs in and selects character "GM Character"
  And "e2e_player1" logs in and selects character "Bob Cratchit"
  When both players navigate to "/arena"
  Then both should see each other's tokens on the map
```

**Files to Fix:**
- multiplayer-token-sync.feature
- multiplayer_steps.js

**Estimated Time:** 2 hours

---

### 2. **Character Selection Flow** - PRIORITY 2
**Status:** New tests created but not run
**Impact:** New core feature untested
**Risk:** Users may not be able to enter game

**Existing Coverage:**
✅ Test created: Dashboard → Character Select → Arena (5 scenarios)
❌ Not yet run against production

**Action Required:**
1. Run character-selection-flow.feature
2. Fix any failures
3. Verify all 5 scenarios pass

**Files:**
- character-selection-flow.feature ✅ Created
- CharacterSelectPage.js ✅ Created
- DashboardPage.js ✅ Created
- character_selection_steps.js ✅ Created

**Estimated Time:** 1 hour testing + fixes

---

### 3. **Game State Persistence** - PRIORITY 3
**Status:** Tests exist but broken
**Impact:** State may not survive server restarts
**Risk:** Players lose positions, game breaks

**Missing Coverage:**
- Token positions persist after restart
- Database saves token moves
- Map changes clear old positions
- Turn state persists

**Action Required:**
Rewrite game-state-persistence.feature for singleton GameState

**Estimated Time:** 2 hours

---

## 🟡 High Priority Gaps (Should Fix Soon)

### 4. **Zustand Store State Management** - NEW FEATURE
**Status:** No tests exist
**Impact:** Core state management untested
**Risk:** selectedCharacter may not persist, UI state bugs

**Missing Coverage:**
```gherkin
Scenario: Selected character persists in store
  Given player selects "Bob Cratchit" in character-select
  When player navigates to arena
  Then gameStore.selectedCharacter should be "Bob Cratchit"
  And character data should be available in arena

Scenario: UI preferences persist across page refreshes
  Given player toggles coordinate display OFF
  When player refreshes the page
  Then coordinate display should still be OFF

Scenario: Camera follow preference persists
  Given player disables camera follow
  When player enters arena
  Then camera should not follow token
```

**New Feature File Needed:** zustand-store.feature

**Estimated Time:** 2 hours (create + run)

---

### 5. **React Query Data Caching** - NEW FEATURE
**Status:** No tests exist
**Impact:** Data fetching untested
**Risk:** Performance issues, unnecessary API calls

**Missing Coverage:**
```gherkin
Scenario: Character list is cached
  Given player loads character-select page
  When player navigates back to dashboard
  And player returns to character-select
  Then no API call should be made (cache hit)

Scenario: Auto-refetch on window focus
  Given player is on character-select
  When player switches browser tabs
  And player returns after 10 seconds
  Then character list should refetch

Scenario: Loading states display correctly
  Given player loads character-select
  Then loading spinner should show
  When data loads
  Then character grid should display
```

**New Feature File Needed:** react-query-caching.feature

**Estimated Time:** 2 hours

---

### 6. **GM Control Panel** - PRIORITY 6
**Status:** Tests exist but broken
**Impact:** GM-only features untested
**Risk:** GMs can't control game

**Existing Tests (Broken):**
- GM panel displays for GM role only
- Map change functionality
- Game reset functionality

**Additional Missing:**
- Drag & drop panel movement
- Collapse/expand panel
- Panel position persists

**Action Required:**
- Fix existing gm-control-panel.feature
- Add new scenarios for draggable panel

**Estimated Time:** 2 hours

---

## 🟢 Medium Priority Gaps (Nice to Have)

### 7. **Error Handling & Edge Cases**
**Status:** No coverage
**Impact:** Users see cryptic errors
**Risk:** Poor UX, hard to debug issues

**Missing Coverage:**
```gherkin
Scenario: Redirect when no character selected
  Given player navigates directly to "/arena"
  Then player should be redirected to "/character-select"

Scenario: WebSocket connection failure
  When WebSocket connection fails
  Then user should see "Connection lost" message
  And WebSocket should attempt reconnection

Scenario: API 500 error on character fetch
  Given API returns 500 error
  Then user should see "Failed to load characters"
  And "Try Again" button should appear

Scenario: Network timeout
  Given slow network connection (5s delay)
  Then loading spinner should show for duration
  When timeout occurs (30s)
  Then error message should display
```

**New Feature File Needed:** error-handling.feature

**Estimated Time:** 3 hours

---

### 8. **Authentication & Authorization**
**Status:** Minimal coverage
**Impact:** Security untested
**Risk:** Unauthorized access, session issues

**Missing Coverage:**
```gherkin
Scenario: Invalid credentials show error
  When user enters wrong password
  Then "Invalid credentials" error should show

Scenario: JWT expiration redirects to login
  Given user's JWT expires
  When user navigates to arena
  Then user should be redirected to login

Scenario: GM-only routes block players
  Given player logs in (not GM)
  When player navigates to "/gm-tools"
  Then 403 Forbidden should display

Scenario: Protected routes require auth
  Given unauthenticated user
  When user navigates to "/arena"
  Then user should be redirected to "/login"
```

**New Feature File Needed:** authentication.feature

**Estimated Time:** 2 hours

---

### 9. **UI/UX Validation**
**Status:** Tests exist but broken
**Impact:** Visual regressions untested
**Risk:** UI breaks, poor UX

**Existing Tests (Broken - xcom-ui-layout.feature):**
- Top bar displays correctly
- Action bar at bottom
- Canvas fills middle space
- Health bar updates
- Movement budget displays
- Weapon selector works
- Turn indicator shows phase

**Action Required:**
- Update xcom-ui-layout.feature for new flow
- Add character-select UI validation

**Estimated Time:** 3 hours

---

## 🔵 Low Priority Gaps (Future)

### 10. **Performance Testing**
**Missing:**
- Page load time < 3s
- WebSocket message latency < 100ms
- 10 concurrent users supported
- Large character lists (100+) render

**Estimated Time:** 4 hours

---

### 11. **Accessibility**
**Missing:**
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader labels (aria-label)
- Focus management
- Color contrast (WCAG AA)

**Estimated Time:** 4 hours

---

### 12. **Mobile Responsiveness**
**Missing:**
- Character select on mobile (< 768px)
- Touch controls for arena
- Responsive layout breakpoints

**Estimated Time:** 3 hours

---

## 📊 Gap Analysis Summary

| Priority | Category | Tests Needed | Estimated Time |
|----------|----------|--------------|----------------|
| 🔴 Critical | Multiplayer Sync | Fix 7 scenarios | 2h |
| 🔴 Critical | Character Selection | Run 5 scenarios | 1h |
| 🔴 Critical | State Persistence | Fix 5 scenarios | 2h |
| 🟡 High | Zustand Store | Create 5 scenarios | 2h |
| 🟡 High | React Query | Create 5 scenarios | 2h |
| 🟡 High | GM Controls | Fix + add 5 scenarios | 2h |
| 🟢 Medium | Error Handling | Create 6 scenarios | 3h |
| 🟢 Medium | Auth & Security | Create 6 scenarios | 2h |
| 🟢 Medium | UI/UX | Fix 11 scenarios | 3h |
| 🔵 Low | Performance | Create 5 scenarios | 4h |
| 🔵 Low | Accessibility | Create 8 scenarios | 4h |
| 🔵 Low | Mobile | Create 5 scenarios | 3h |
| **TOTAL** | | **~73 scenarios** | **~30 hours** |

---

## 🎯 Recommended Test Plan

### Week 1: Critical (5 hours)
**Goal:** Core functionality tested
1. ✅ Run character-selection tests (1h)
2. Fix multiplayer-token-sync tests (2h)
3. Fix game-state-persistence tests (2h)

**Expected:** 17 scenarios passing

---

### Week 2: High Priority (6 hours)
**Goal:** New features tested
1. Create + run Zustand store tests (2h)
2. Create + run React Query tests (2h)
3. Fix + add GM control tests (2h)

**Expected:** 32 scenarios passing

---

### Week 3: Medium Priority (8 hours)
**Goal:** Polish & edge cases
1. Create error handling tests (3h)
2. Create auth/security tests (2h)
3. Fix UI/UX tests (3h)

**Expected:** 50+ scenarios passing

---

### Week 4: Low Priority (Optional)
**Goal:** Production-ready quality
1. Performance testing
2. Accessibility testing
3. Mobile testing

**Expected:** 65+ scenarios passing

---

## 💡 Quick Wins (Do First)

### 1. Run character-selection-flow.feature (30 min)
**Already created, just run it:**
```bash
cd test/e2e
npm test features/character-selection-flow.feature
```

**Expected:** 5/5 passing (if deployed correctly)

---

### 2. Fix ONE multiplayer test (1 hour)
**Pick simplest scenario:**
```gherkin
Scenario: Two players see each other in arena
```

**Update to new flow, run, verify it works.**

**Proof of concept:** Shows tests CAN work with new architecture

---

### 3. Add error handling for no character (30 min)
**Create simple test:**
```gherkin
Scenario: Arena redirects if no character selected
  Given user navigates to "/arena" directly
  Then user should be redirected to "/character-select"
```

**Easy to implement, high value**

---

## 📋 Test Creation Checklist

For each new test feature file:
- [ ] Write .feature file with scenarios
- [ ] Create page objects (if needed)
- [ ] Write step definitions
- [ ] Run tests locally
- [ ] Fix failures
- [ ] Verify 100% passing
- [ ] Document in CHARACTER_SELECTION_E2E_TESTS.md style
- [ ] Add to CI/CD pipeline

---

## 🚀 Success Metrics

### Target: End of Week 1
- ✅ 17+ scenarios passing
- ✅ Core multiplayer tested
- ✅ Character selection tested
- ✅ State persistence tested

### Target: End of Week 2
- ✅ 32+ scenarios passing
- ✅ All new features tested (Zustand, React Query)
- ✅ GM controls tested

### Target: End of Week 3
- ✅ 50+ scenarios passing
- ✅ Error handling covered
- ✅ Security tested
- ✅ UI validation complete

### Target: Production
- ✅ 95% pass rate (65+/~70 scenarios)
- ✅ All critical paths tested
- ✅ Automated in CI/CD
- ✅ Tests run on every deployment

---

**Next Action:** Run character-selection-flow.feature to get first wins! 🎯
