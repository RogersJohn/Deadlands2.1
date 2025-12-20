# Character Selection E2E Tests

**Created:** 2025-11-22
**Purpose:** Automated testing for new character selection flow

---

## Test Coverage

### Feature: character-selection-flow.feature

**5 scenarios covering:**
1. ✅ Basic flow: Dashboard → Character Select → Arena
2. ✅ Character details display (Name, Archetype, Stats)
3. ✅ Back button navigation
4. ✅ No characters error handling
5. ✅ Character persistence in arena

**Tags:**
- `@critical` - Must pass before deployment
- `@character-selection` - All character selection tests
- `@ui` - UI verification tests
- `@navigation` - Navigation flow tests
- `@error-handling` - Error scenarios
- `@persistence` - State persistence tests

---

## Files Created

### Page Objects
1. **DashboardPage.js** - Dashboard interactions
   - `clickPlayGame()` - Navigate to character select
   - `clickNewCharacter()` - Navigate to character creation

2. **CharacterSelectPage.js** - Character selection screen
   - `selectCharacter(name)` - Select specific character
   - `selectFirstCharacter()` - Select first available
   - `getCharacterCards()` - Get all character cards
   - `getCharacterDetails()` - Extract character info
   - `clickBackToDashboard()` - Navigate back

### Step Definitions
3. **character_selection_steps.js** - 20+ step definitions
   - Login steps
   - Dashboard navigation
   - Character selection
   - Arena verification
   - Error handling

---

## Running Tests

### On Production (Railway)
```bash
cd test/e2e
npm test features/character-selection-flow.feature
```

### Run Specific Scenario
```bash
npm test -- --tags @critical
```

### Run All Character Selection Tests
```bash
npm test -- --tags @character-selection
```

### Run in Headless Mode
```bash
npm run test:headless features/character-selection-flow.feature
```

---

## Test Scenarios

### 1. Critical Path (@critical)
**Scenario:** Player selects character and enters arena
```gherkin
Given "e2e_player1" is logged in as Player
When the player clicks "Play Game" on the dashboard
Then the player should see the character selection screen
When the player selects a character
Then the player should be redirected to the arena
```

**Expected:** Smooth flow with no errors

---

### 2. UI Verification (@ui)
**Scenario:** Character selection screen displays character details
```gherkin
When the player navigates to "/character-select"
Then the character selection screen should show:
  | Name | Archetype | Pace | Parry | Toughness |
```

**Expected:** All character info visible and formatted correctly

---

### 3. Navigation (@navigation)
**Scenario:** Back button returns to dashboard
```gherkin
Given the player is on the character selection screen
When the player clicks "Back to Dashboard"
Then the player should be redirected to the dashboard
```

**Expected:** Clean navigation without errors

---

### 4. Error Handling (@error-handling)
**Scenario:** No characters available shows create prompt
```gherkin
Given "e2e_newplayer" is logged in with no characters
When the player navigates to "/character-select"
Then the player should see "No characters found"
And the player should see a "Create Character" button
```

**Expected:** Helpful error message with action button

---

### 5. Persistence (@persistence)
**Scenario:** Selected character persists during gameplay
```gherkin
Given the player has selected "Bob Cratchit" from character select
When the player enters the arena
Then the arena should show "Bob Cratchit" as the active character
```

**Expected:** Character state maintained in arena

---

## Prerequisites

### Test Accounts (Production)
These accounts must exist in Railway database:
- `e2e_testgm` / `Test123!` (GAME_MASTER role)
- `e2e_player1` / `Test123!` (PLAYER role, with characters)
- `e2e_newplayer` / `Test123!` (PLAYER role, NO characters)

### Characters
`e2e_player1` must have at least one character with:
- Name (e.g., "Bob Cratchit")
- Archetype
- Pace, Parry, Toughness stats

---

## Configuration

Tests use production URLs from `test/e2e/features/support/world.js`:
- **Frontend:** https://deadlands-frontend-production.up.railway.app
- **Backend:** https://deadlands-campaign-manager-production-053e.up.railway.app

---

## Troubleshooting

### Test fails: "No character cards found"
**Cause:** Character data missing for test account
**Fix:** Ensure `e2e_player1` has characters in production database

### Test fails: "Element not found"
**Cause:** Page loading too slowly or UI changed
**Fix:** Increase timeout or update selectors in CharacterSelectPage.js

### Test fails: "Login unsuccessful"
**Cause:** Test account doesn't exist or wrong password
**Fix:** Verify test accounts exist in production database

---

## Integration with CI/CD

### Add to GitHub Actions (Future)
```yaml
- name: Run Character Selection E2E Tests
  run: |
    cd test/e2e
    npm install
    npm test features/character-selection-flow.feature
```

### Run Before Deployment
```bash
npm test -- --tags @critical
```

Only deploy if critical tests pass.

---

## Extending Tests

### Adding New Scenarios
1. Add scenario to `character-selection-flow.feature`
2. Add step definitions to `character_selection_steps.js` if needed
3. Tag appropriately (`@critical`, `@character-selection`, etc.)

### Adding Page Object Methods
1. Add method to `CharacterSelectPage.js`
2. Use in step definitions
3. Keep selectors in page object, not step definitions

---

## Success Metrics

**Target:**
- ✅ All 5 scenarios passing
- ✅ Tests complete in < 60 seconds
- ✅ 0 flaky tests (consistent pass/fail)
- ✅ Coverage of happy path + 2 error scenarios

**Current Status:** Ready for first run

---

## Next Steps

1. **Run tests on production** to verify flow works
2. **Fix any failures** found in deployment
3. **Add to CI/CD pipeline** for automated regression testing
4. **Expand coverage** with edge cases (e.g., session timeout, network errors)

---

## Related Documentation

- **SESSION_2025-11-22_SUMMARY.md** - Why we created character selection
- **NEXT_SESSION.md** - Manual testing checklist
- **STATE_MANAGEMENT.md** - How selectedCharacter is stored

---

**Tests are ready to run on production deployment!** 🚀
