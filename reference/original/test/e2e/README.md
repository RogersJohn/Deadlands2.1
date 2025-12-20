# Deadlands E2E Automated Tests

**Status:** ✅ Production-Ready (Expanded Test Suite) | **Updated:** 2025-11-18

Comprehensive automated end-to-end tests for multiplayer functionality, game state persistence, and GM administrative controls using Selenium WebDriver, Cucumber BDD, and Docker.

## Current Status (2025-11-18)

**Framework:** ✅ Complete and production-ready
**Tests:** ✅ 28 scenarios covering multiplayer sync, persistence, and GM controls
**Recent Updates:** 🆕 Added game state persistence and GM Control Panel tests

**Test Coverage:**
- ✅ Multiplayer token synchronization (7 scenarios)
- ✅ Game state persistence and database integration (8 scenarios)
- ✅ GM Control Panel functionality (13 scenarios)
- **Total:** 28 scenarios, ~150 step definitions, ~2,500 lines of test code

**Test Infrastructure:**
- ✅ Selenium Grid (Hub + 3 Chrome nodes)
- ✅ 77 Cucumber step definitions
- ✅ Page Object Model architecture
- ✅ Docker Compose orchestration
- ✅ Test accounts created in Railway production
- ✅ 60-second timeout configuration
- ✅ Valid CSS selectors (no jQuery dependencies)
- ✅ Rate limiting adjusted (30 logins/10 min)

**To Run Tests Again:**
```bash
cd test/e2e
docker-compose down -v && docker-compose up --abort-on-container-exit --build
```

## Features

- **Automated Browser Control**: Selenium WebDriver controls real Chrome browsers
- **BDD Scenarios**: Human-readable Cucumber feature files
- **Docker Containerization**: Tests run in isolated Docker containers
- **Parallel Execution**: Run multiple browsers simultaneously
- **Visual Testing**: Validates token colors, positions, and synchronization
- **Comprehensive Coverage**: Tests WebSocket connections, token movements, game state persistence

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local execution)
- Deployed application or local dev environment running

### Run Tests in Docker (Recommended)

```bash
cd test/e2e

# Start Selenium Grid and run tests
docker-compose up --abort-on-container-exit

# Clean up after tests
docker-compose down -v
```

### Run Tests Locally

```bash
cd test/e2e

# Install dependencies
npm install

# Run all tests
npm test

# Run tests in headless mode
npm run test:headless

# Run specific feature files
npx cucumber-js features/multiplayer-token-sync.feature
npx cucumber-js features/game-state-persistence.feature
npx cucumber-js features/gm-control-panel.feature

# Run specific scenario by tag
npx cucumber-js --tags @critical
npx cucumber-js --tags @persistence
npx cucumber-js --tags @gm-panel
```

## Test Architecture

```
test/e2e/
├── features/
│   ├── multiplayer-token-sync.feature    # Multiplayer WebSocket tests (7 scenarios)
│   ├── game-state-persistence.feature    # 🆕 Persistence & database tests (8 scenarios)
│   ├── gm-control-panel.feature          # 🆕 GM admin panel tests (13 scenarios)
│   ├── step_definitions/
│   │   ├── multiplayer_steps.js          # Multiplayer step implementations
│   │   ├── persistence_steps.js          # 🆕 Persistence step implementations
│   │   └── gm_control_steps.js           # 🆕 GM panel step implementations
│   └── support/
│       ├── world.js                      # Test context & browser management
│       └── pages/                         # Page Object Model
│           ├── BasePage.js
│           ├── LoginPage.js
│           ├── GameArenaPage.js          # Main game arena (Phaser canvas)
│           └── GMControlPanelPage.js     # GM admin panel page object
├── reports/                               # Test reports (generated)
├── cucumber.js                            # Cucumber configuration
├── docker-compose.yml                     # Docker test environment
├── Dockerfile                             # Test runner container
└── package.json                           # Dependencies
```

## Environment Variables

Configure tests via environment variables:

```bash
# Frontend URL (default: Railway production)
FRONTEND_URL=https://deadlands-frontend-production.up.railway.app

# Backend API URL (default: Railway production)
API_URL=https://deadlands-campaign-manager-production-053e.up.railway.app/api

# Selenium Hub URL (default: localhost)
SELENIUM_HUB_URL=http://localhost:4444

# Headless mode (default: true for Docker)
HEADLESS=true
```

## New Test Scenarios (2025-11-18)

### Game State Persistence (@persistence)

**File:** `features/game-state-persistence.feature` (8 scenarios)

Tests backend persistence and database integration:
- Token positions persist across page refresh
- Late-joining players see existing tokens
- Token ownership validation (players can only move their own tokens)
- GM authority (can move any token)
- Database state loading on arena entry
- Movement bounds validation (0-199 grid)
- Multi-player state recovery
- WebSocket + database synchronization

### GM Control Panel (@gm-panel)

**File:** `features/gm-control-panel.feature` (13 scenarios)

Tests GM-only administrative interface:
- Panel visibility (role-based access control)
- Real-time game state display (map, turn, token count)
- Map change functionality (clears all tokens including offline players)
- Game reset functionality
- UI workflows with confirmation dialogs
- Notification feedback system
- Real-time panel updates as players join/move
- Keyboard accessibility
- Styling validation

### Page Objects Added

- **GMControlPanelPage.js** (300 lines): Complete page object for GM admin panel
  - Methods: `changeMap()`, `resetGame()`, `getGameState()`, `waitForNotification()`

## Existing Test Scenarios

### Critical Path (@critical)

1. **Two players see each other's token movements in real-time**
   - 2 players log in and access arena
   - Each player moves token
   - Verify both see each other's movements

### WebSocket Tests (@websocket)

2. **WebSocket connection status is visible**
   - Player accesses arena
   - Verify WebSocket connects
   - Check console logs

### Edge Cases (@edge-case)

3. **Token movement synchronization with 3 simultaneous players**
   - 3 players access arena
   - All move at once
   - Verify all see all movements

### Visual Tests (@visual)

4. **Remote player tokens have distinct visual styling**
   - Verify local token is dark blue (#4169e1)
   - Verify remote tokens are light blue (#00bfff), 70% opacity
   - Verify username labels appear

### Session Management (@session-management)

5. **Player joining mid-game sees existing player tokens**
   - Player 1 moves before Player 2 joins
   - Verify Player 2 sees Player 1's current position

### Error Handling (@error-handling)

6. **Graceful handling of WebSocket disconnection**
   - Simulate network interruption
   - Verify automatic reconnection

### Performance (@performance)

7. **System handles rapid token movements smoothly**
   - Player makes 10 rapid movements
   - Verify all sync without loss

## Docker Selenium Grid

The Docker setup includes:

- **Selenium Hub**: Coordinates browser nodes (port 4444)
- **3x Chrome Nodes**: One for GM, two for players
- **Test Runner**: Executes Cucumber scenarios

Architecture:

```
┌─────────────────┐
│  Test Runner    │ ◄── Executes Cucumber scenarios
│  (Node.js)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Selenium Hub   │ ◄── Manages browser sessions
│  (port 4444)    │
└────────┬────────┘
         │
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Chrome │ │ Chrome │ │ Chrome │ ◄── Isolated browsers
│  (GM)  │ │ (P1)   │ │ (P2)   │
└────────┘ └────────┘ └────────┘
```

## Viewing Test Reports

After test execution:

```bash
# HTML report
open reports/cucumber-report.html

# JSON report (for CI/CD integration)
cat reports/cucumber-report.json
```

## Debugging Failed Tests

### View Browser Screens

When running locally (not headless):

```bash
HEADLESS=false npm test
```

### Check Selenium Grid Console

```bash
# Open in browser
open http://localhost:4444/ui

# View active sessions
curl http://localhost:4444/status | jq
```

### View Container Logs

```bash
# All containers
docker-compose logs

# Specific service
docker-compose logs selenium-hub
docker-compose logs e2e-tests
```

### Screenshots on Failure

Failed tests automatically capture screenshots in the test reports.

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run E2E tests
        run: |
          cd test/e2e
          docker-compose up --abort-on-container-exit
      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test/e2e/reports/
```

## Extending Tests

### Add New Scenario

1. Add to `features/multiplayer-token-sync.feature`:

```gherkin
Scenario: My new test
  Given preconditions
  When actions
  Then assertions
```

2. Implement missing steps in `step_definitions/multiplayer_steps.js`:

```javascript
When('new action happens', async function () {
  // Implementation
});
```

### Add New Page Object

1. Create `features/support/pages/NewPage.js`:

```javascript
const BasePage = require('./BasePage');
const { By } = require('selenium-webdriver');

class NewPage extends BasePage {
  constructor(driver) {
    super(driver);
    this.newElement = By.css('.new-element');
  }

  async doSomething() {
    await this.click(this.newElement);
  }
}

module.exports = NewPage;
```

2. Use in step definitions:

```javascript
const NewPage = require('../support/pages/NewPage');

Given('I am on new page', async function () {
  const newPage = new NewPage(await this.getBrowser('main'));
  await newPage.doSomething();
});
```

## Troubleshooting

### Tests timing out

- Increase timeout in `cucumber.js`
- Check if application is accessible
- Verify Selenium Hub is running

### Browsers not starting

- Ensure Docker has enough resources (4GB+ RAM)
- Check `docker-compose logs selenium-hub`
- Verify ports 4442, 4443, 4444 are available

### WebSocket connection failures

- Verify backend is deployed and running
- Check CORS configuration allows frontend URL
- Inspect browser console in screenshots

### Element not found errors

- Update selectors in Page Objects
- Add explicit waits: `await page.waitForElement(locator)`
- Check if UI has changed

## Performance Tuning

### Run Specific Scenarios

```bash
# By tag
npx cucumber-js --tags @critical

# By name
npx cucumber-js --name "Two players"

# Specific feature
npx cucumber-js features/multiplayer-token-sync.feature:12
```

### Parallel Execution

```bash
# Run 3 scenarios in parallel
npx cucumber-js --parallel 3
```

### Faster Feedback

```bash
# Fail fast - stop on first failure
npx cucumber-js --fail-fast
```

## Metrics

Track test metrics:

- **Execution Time**: `cat reports/cucumber-report.json | jq '.duration'`
- **Pass Rate**: Check HTML report
- **Flakiness**: Re-run failed tests: `npx cucumber-js @rerun`

---

**Maintained by**: Deadlands Development Team
**Last Updated**: 2025-11-18
**Test Framework Version**: 2.0.0
**Total Test Scenarios**: 28 (7 multiplayer + 8 persistence + 13 GM panel)
