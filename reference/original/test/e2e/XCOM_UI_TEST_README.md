# XCOM UI Layout E2E Tests

## Overview

This test suite validates the new XCOM-style UI redesign for the Deadlands Campaign Manager game arena. The tests verify that the interface provides maximum map visibility (85-90% of screen) with a clean, professional tactical game layout.

## Test Coverage

### 1. Layout Structure Tests (`@xcom-layout @critical`)
- **Top Bar**: Title, turn indicator, settings gear icon
- **Game Canvas**: Occupies 85-90% of screen using flexGrow
- **Bottom Action Bar**: Character info, health, movement, weapon, actions
- **No Sidebars**: Validates old left/right sidebars are removed

### 2. Settings Menu Tests (`@settings-menu`, `@settings-functionality`)
- **Opens/Closes**: Gear icon click and close on outside click
- **Camera Controls**: Follow vs Manual modes
- **Range Toggles**: Weapon Ranges and Movement Ranges show/hide
- **Illumination**: 4 levels (Bright, Dim, Dark, Pitch Black)

### 3. Action Bar Tests (`@action-bar`)
- **Character Display**: Portrait and name
- **Health System**: Health bar with X/Y format, color changes by percentage
- **Wounds Tracking**: Displays wound count
- **Movement Budget**: Shows remaining movement with visual bar
- **Weapon Selector**: Dropdown with all equipped weapons and stats (DMG, RNG, ROF)
- **Actions Button**: Access to combat actions
- **Turn Number**: Current turn display

### 4. Turn Indicator Tests (`@turn-indicator`)
- **Player Phase**: "YOUR TURN" in blue
- **Enemy Phase**: "ENEMY TURN" in red
- **Victory**: "VICTORY!" in green
- **Defeat**: "DEFEAT" in gray

### 5. Responsive Layout Tests (`@responsive`)
- **Fixed Heights**: Top bar and action bar have fixed heights
- **Flex Canvas**: Game canvas uses flexGrow to fill remaining space
- **No Overlap**: Components don't overlap
- **Coherent Layout**: Visual hierarchy is maintained

### 6. Integration Tests (`@integration`)
- **Component Positioning**: Top bar at top, canvas in middle, action bar at bottom
- **Character Selection**: Pre-game character grid still works
- **Full Flow**: Select character → XCOM layout loads → All components functional

## File Structure

```
test/e2e/
├── features/
│   ├── xcom-ui-layout.feature           # Gherkin scenarios for XCOM UI
│   ├── multiplayer-token-sync.feature   # Existing multiplayer tests
│   ├── support/
│   │   ├── pages/
│   │   │   ├── GameArenaPage.js         # Updated with XCOM locators
│   │   │   ├── BasePage.js              # Base page object
│   │   │   └── LoginPage.js             # Login page object
│   │   └── world.js                     # Cucumber world config
│   └── step_definitions/
│       ├── xcom_ui_steps.js             # Step definitions for XCOM tests
│       └── multiplayer_steps.js         # Existing multiplayer steps
└── XCOM_UI_TEST_README.md               # This file
```

## New Page Object Methods

### GameArenaPage.js - XCOM UI Methods

**Layout Checks:**
- `isXCOMLayoutDisplayed()` - Validates top bar, canvas, action bar present
- `isTopBarVisible()` - Checks top bar visibility
- `isActionBarVisible()` - Checks action bar visibility
- `areOldSidebarsPresent()` - Verifies old sidebars removed

**Top Bar:**
- `getArenaTitle()` - Gets "Deadlands Arena" title text
- `getTurnIndicatorText()` - Gets turn phase text ("YOUR TURN", etc.)
- `isSettingsGearIconVisible()` - Checks settings icon
- `clickSettingsGear()` - Opens settings menu

**Settings Menu:**
- `isSettingsMenuOpen()` - Checks if menu is open
- `selectCameraMode(mode)` - Select "follow" or "manual"
- `toggleWeaponRanges(show)` - Show/hide weapon ranges
- `toggleMovementRanges(show)` - Show/hide movement ranges
- `selectIllumination(level)` - Select "BRIGHT", "DIM", "DARK", "PITCH_BLACK"
- `clickOutsideSettingsMenu()` - Close menu

**Canvas:**
- `getCanvasHeight()` - Get canvas pixel height
- `getViewportHeight()` - Get browser viewport height
- `getCanvasScreenPercentage()` - Calculate canvas % of screen

**Action Bar:**
- `getCharacterName()` - Get character name from action bar
- `getHealthText()` - Get health in "X/Y" format
- `getWoundsCount()` - Get wound count
- `getMovementBudgetText()` - Get movement text
- `getSelectedWeaponName()` - Get currently selected weapon
- `clickWeaponSelector()` - Open weapon dropdown
- `clickActionsButton()` - Click actions button
- `getTurnNumber()` - Get current turn number
- `getHealthBarColor()` - Get health bar background color

**Character Selection:**
- `isCharacterSelectionVisible()` - Check if character grid shown
- `selectCharacter(index)` - Select character by index
- `waitForXCOMLayout(timeout)` - Wait for XCOM layout to load

## Running the Tests

### Prerequisites

```bash
# Install dependencies (from project root)
cd test/e2e
npm install
```

### Run All XCOM UI Tests

```bash
# Run all XCOM UI tests
npm test -- --tags "@xcom-layout"

# Run critical tests only
npm test -- --tags "@xcom-layout and @critical"

# Run settings menu tests
npm test -- --tags "@settings-menu or @settings-functionality"

# Run action bar tests
npm test -- --tags "@action-bar"
```

### Run Specific Scenarios

```bash
# Run single scenario
npm test -- --name "Game Arena displays XCOM-style layout with all components"

# Run with specific browser
BROWSER=chrome npm test -- --tags "@xcom-layout"
BROWSER=firefox npm test -- --tags "@xcom-layout"
```

### Debug Mode

```bash
# Run with headful browser (see UI)
HEADLESS=false npm test -- --tags "@xcom-layout"

# Run with screenshots on failure
SCREENSHOTS=true npm test -- --tags "@xcom-layout"
```

## Test Data Requirements

### Test Accounts
- `e2e_testgm` - Game Master account (password: `Test123!`)
- `e2e_player1` - Player account (password: `Test123!`)
- `e2e_player2` - Player account (password: `Test123!`)

These accounts should have characters created with:
- Character portraits
- Equipped weapons (at least 2 for weapon selector tests)
- Full health and movement on initial load

### Database Setup

The tests expect the following data:
1. **Characters**: Each test account should have 1+ characters
2. **Weapons**: Characters should have multiple weapons equipped
3. **Game State**: New game sessions should start with full health/movement

## Expected Results

### Success Criteria

All tests should pass with:
- ✅ Top bar visible with all components
- ✅ Canvas occupies 85-90% of screen height
- ✅ Action bar visible with character info, health, movement, weapon
- ✅ Settings menu opens/closes correctly
- ✅ All settings controls functional
- ✅ No old sidebars present
- ✅ Turn indicator shows correct phase
- ✅ Character selection works before arena load

### Performance Expectations

- **Layout Load Time**: < 2 seconds
- **Settings Menu Open**: < 300ms
- **Character Selection**: < 1 second to enter arena
- **No Console Errors**: Browser console should be clean

## Troubleshooting

### Common Issues

**1. Elements Not Found**
```
Error: Unable to locate element: [data-testid="settings-gear"]
```
**Solution**: Update locators in GameArenaPage.js to match actual component structure. The XCOM components may not have data-testid attributes yet.

**2. Canvas Percentage Test Fails**
```
Expected canvas to occupy 85-90%, but got 60%
```
**Solution**: Check that GameArena.tsx has `flexGrow: 1` on canvas container and that top/bottom bars have fixed heights.

**3. Settings Menu Won't Open**
```
Settings menu did not open after clicking gear icon
```
**Solution**: Verify SettingsMenu component is properly imported and the gear icon button has correct onClick handler.

**4. Old Sidebars Still Present**
```
Expected left sidebar to not exist, but found it
```
**Solution**: Ensure lines 308-846 of GameArena.tsx were properly replaced with XCOM layout code.

### Debug Commands

```bash
# Check if XCOM layout is rendered
npm test -- --tags "@xcom-layout and @critical" --format progress

# Take screenshots of failures
SCREENSHOTS=true npm test -- --tags "@xcom-layout"

# Run in visible browser to debug
HEADLESS=false npm test -- --tags "@xcom-layout"

# Get console logs
npm test -- --tags "@xcom-layout" --format json > test-results.json
```

## Continuous Integration

### GitHub Actions

Add to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests - XCOM UI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'frontend/src/game/**'
      - 'test/e2e/**'
  pull_request:
    branches: [ main ]

jobs:
  xcom-ui-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd test/e2e
          npm install

      - name: Run XCOM UI tests
        run: |
          cd test/e2e
          npm test -- --tags "@xcom-layout and @critical"
        env:
          BASE_URL: ${{ secrets.E2E_BASE_URL }}

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots
          path: test/e2e/screenshots/
```

## Maintenance

### When UI Changes

If the XCOM UI layout changes:

1. **Update Locators**: Modify `GameArenaPage.js` constructor with new selectors
2. **Update Feature File**: Add/modify scenarios in `xcom-ui-layout.feature`
3. **Update Step Definitions**: Add new steps in `xcom_ui_steps.js`
4. **Run Tests**: Validate all tests still pass
5. **Update Documentation**: Keep this README in sync

### Adding New Tests

To add new XCOM UI test scenarios:

1. Add scenario to `xcom-ui-layout.feature`:
   ```gherkin
   @ui @xcom-layout @new-feature
   Scenario: New feature works correctly
     Given user is in game arena
     When user performs action
     Then expected result occurs
   ```

2. Add step definitions to `xcom_ui_steps.js` if needed
3. Add page object methods to `GameArenaPage.js` if needed
4. Run and validate

## Test Metrics

### Current Coverage (as of 2025-11-17)

- **Total Scenarios**: 14
- **Critical Scenarios**: 3
- **Settings Tests**: 4
- **Action Bar Tests**: 5
- **Integration Tests**: 2

### Test Categories

| Category | Count | Tags |
|----------|-------|------|
| Critical Path | 3 | `@critical` |
| Settings Menu | 4 | `@settings-menu`, `@settings-functionality` |
| Action Bar | 5 | `@action-bar` |
| Turn Indicator | 1 | `@turn-indicator` |
| Responsive | 1 | `@responsive` |
| Comparison | 1 | `@comparison` |
| Accessibility | 1 | `@accessibility` |
| Integration | 2 | `@integration`, `@character-selection` |

## Related Documentation

- [UI_REDESIGN_OPTIONS.md](../../UI_REDESIGN_OPTIONS.md) - Design rationale for XCOM layout
- [XCOM_LAYOUT_REPLACEMENT.txt](../../XCOM_LAYOUT_REPLACEMENT.txt) - Implementation guide
- [NEXT_SESSION.md](../../NEXT_SESSION.md) - Implementation status
- [E2E Testing Guide](./README.md) - General E2E test documentation

## Support

For questions or issues with the XCOM UI tests:
1. Check troubleshooting section above
2. Review test output and screenshots
3. Verify GameArena.tsx has correct XCOM layout
4. Check browser console for errors
5. Create issue in GitHub with test output and screenshots

---

**Last Updated**: 2025-11-17
**Test Suite Version**: 1.0.0
**Compatible with**: Deadlands Campaign Manager v1.x with XCOM UI redesign
