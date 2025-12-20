# Combat Initiative E2E Tests

Automated end-to-end tests for the Savage Worlds card-based initiative system.

## Overview

These tests verify the complete combat flow:
1. GM starts combat with NPCs
2. Cards are dealt to all combatants
3. Initiative tracker displays combatants sorted by card value
4. GM cycles through turns
5. New rounds deal new cards
6. GM ends combat

## Test Scenarios

| Tag | Scenario | Description |
|-----|----------|-------------|
| `@critical @combat @initiative` | GM starts combat | Start combat, enter NPCs, deal cards |
| `@critical @combat @turn-order` | Cycle through turns | End turns, trigger new round |
| `@combat @end-combat` | End combat | Click End Combat, confirm dialog |
| `@combat @force-new-round` | Force new round | GM forces new round mid-combat |
| `@combat @card-display` | Card display | Verify cards show value and suit |
| `@combat @active-indicator` | Active combatant | Verify gold border, pulsing dot |
| `@combat @full-flow` | Complete flow | Full combat from start to end |

## Prerequisites

- Docker and docker-compose installed
- Node.js 18+ (for local runs)
- Backend and frontend running (or using Railway production)

## Running Tests

### Option 1: Docker (Recommended)

```bash
# Windows
run-combat-tests.bat

# Linux/Mac
./run-combat-tests.sh
```

This will:
1. Start Selenium Grid with Chrome browsers
2. Wait for the grid to be ready
3. Run all combat tests
4. Clean up containers

### Option 2: Full Docker Compose

```bash
# Run all tests in containers
docker-compose up --abort-on-container-exit

# Clean up
docker-compose down -v
```

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Run combat tests only
npx cucumber-js --tags @combat features/combat-initiative.feature

# Run critical tests only
npx cucumber-js --tags @critical features/combat-initiative.feature

# Run with debug output
npm run test:debug -- --tags @combat
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | Railway production | Target frontend URL |
| `API_URL` | Railway production | Target API URL |
| `SELENIUM_HUB_URL` | http://localhost:4444 | Selenium Grid URL |
| `HEADLESS` | true | Run browsers headless |

### Testing Against Local Development

```bash
# Windows
set FRONTEND_URL=http://localhost:3000
set API_URL=http://localhost:8080/api
run-combat-tests.bat

# Linux/Mac
FRONTEND_URL=http://localhost:3000 API_URL=http://localhost:8080/api ./run-combat-tests.sh
```

## Test Accounts

The tests use the following account:
- **GM Account:** `gamemaster` / `password`

## Architecture

```
test/e2e/
├── features/
│   ├── combat-initiative.feature    # Test scenarios
│   ├── step_definitions/
│   │   └── combat_initiative_steps.js  # Step implementations
│   └── support/
│       └── pages/
│           ├── GMControlPanelPage.js   # GM panel page object
│           └── InitiativeTrackerPage.js # Initiative tracker page object
├── docker-compose.yml               # Selenium Grid config
├── Dockerfile                       # Test runner container
├── run-combat-tests.sh             # Linux/Mac runner
├── run-combat-tests.bat            # Windows runner
└── COMBAT_TESTS_README.md          # This file
```

## Page Objects

### GMControlPanelPage

Combat-related methods:
- `hasCombatSection()` - Check if combat section is visible
- `getCombatStatus()` - Get "No Combat" or "Round N"
- `clickStartCombat()` - Start combat flow
- `enterNPCNames(names)` - Enter NPC names
- `clickDealCards()` - Deal cards to start
- `startCombatWithNPCs(names)` - Complete workflow
- `clickEndTurnForActive()` - End current turn
- `clickForceNewRound()` - Force new round
- `endCombat()` - End combat with confirm

### InitiativeTrackerPage

- `getCombatantCount()` - Number of combatants
- `getCombatantNames()` - List of names
- `hasCardsDisplayed()` - Check for cards
- `hasActiveIndicator()` - Check for active styling
- `getRoundNumber()` - Current round
- `isCombatActive()` - Check combat status

## Troubleshooting

### Selenium Grid Not Ready

If the grid takes too long to start:
```bash
docker-compose logs selenium-hub
```

### Tests Failing Locally

1. Ensure backend and frontend are running
2. Check the URLs match your local setup
3. Verify test accounts exist in the database

### Browser Issues

The tests use Chrome in headless mode. If you need to debug visually:
```bash
# Set headless to false
HEADLESS=false npx cucumber-js --tags @combat
```

## CI/CD Integration

For GitHub Actions:
```yaml
- name: Run Combat E2E Tests
  run: |
    cd test/e2e
    docker-compose up -d selenium-hub chrome-gm
    sleep 10
    npm test -- --tags @combat
    docker-compose down
```
