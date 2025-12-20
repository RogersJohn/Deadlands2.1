/**
 * Manual Testing Launcher
 *
 * Launches 3 incognito Chrome browsers with auto-login:
 * 1. Game Master (gamemaster)
 * 2. Player 1 (e2e_player1)
 * 3. Player 2 (e2e_player2)
 *
 * Defaults to PRODUCTION environment (Railway deployment)
 *
 * Usage:
 *   node launch-test-scenario.js                    (production)
 *   FRONTEND_URL=http://localhost:3000 API_URL=http://localhost:8080/api node launch-test-scenario.js (local)
 */

const puppeteer = require('puppeteer');

// Configuration - defaults to production
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://deadlands-frontend-production.up.railway.app';
const API_URL = process.env.API_URL || 'https://deadlands-campaign-manager-production.up.railway.app/api';

// Test accounts (production credentials)
const accounts = [
  {
    username: 'gamemaster',
    password: 'Test123!',
    role: 'GAME_MASTER',
    displayName: 'GM',
    characterName: null // GM doesn't need a character
  },
  {
    username: 'e2e_player1',
    password: 'Test123!',
    role: 'PLAYER',
    displayName: 'Player 1',
    characterName: null // Will select first available character
  },
  {
    username: 'e2e_player2',
    password: 'Test123!',
    role: 'PLAYER',
    displayName: 'Player 2',
    characterName: null // Will select second available character
  }
];

/**
 * Launch a browser and auto-login
 */
async function launchBrowser(account, index) {
  console.log(`\n[${account.displayName}] Launching browser...`);

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--incognito',
      `--window-position=${index * 640},0`,
      '--window-size=640,900',
      '--disable-blink-features=AutomationControlled'
    ],
    defaultViewport: null
  });

  const page = await browser.newPage();

  try {
    // Navigate to login page
    console.log(`[${account.displayName}] Navigating to ${FRONTEND_URL}/login...`);
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });

    // Wait for login form (Material-UI TextFields)
    await page.waitForSelector('input', { timeout: 15000 });

    // Fill in login credentials
    console.log(`[${account.displayName}] Filling login form...`);

    // Find the username input (first input or one with label "Username")
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].type(account.username, { delay: 30 });
      await inputs[1].type(account.password, { delay: 30 });
    } else {
      throw new Error('Could not find username/password inputs');
    }

    // Click login button
    console.log(`[${account.displayName}] Clicking login button...`);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });

    console.log(`[${account.displayName}] ✅ Logged in successfully!`);

    // Navigate to appropriate page based on role
    if (account.role === 'GAME_MASTER') {
      console.log(`[${account.displayName}] Navigating to dashboard...`);
      await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle0' });
    } else {
      console.log(`[${account.displayName}] Navigating to character selection...`);
      await page.goto(`${FRONTEND_URL}/character-select`, { waitUntil: 'networkidle0' });

      // Wait for character cards to load
      try {
        await page.waitForSelector('[role="radiogroup"]', { timeout: 10000 });

        // Wait a bit for cards to fully render
        await page.waitForTimeout(1000);

        // Find all character cards and select the first available one
        const characterCards = await page.$$('[role="radio"]');

        if (characterCards.length > 0) {
          // Select based on player index (Player 1 gets first, Player 2 gets second if available)
          const playerIndex = account.displayName === 'Player 1' ? 0 : 1;
          const cardIndex = Math.min(playerIndex, characterCards.length - 1);
          const selectedCard = characterCards[cardIndex];

          const cardText = await selectedCard.evaluate(el => el.textContent);
          console.log(`[${account.displayName}] Selecting character: ${cardText.substring(0, 50)}...`);
          await selectedCard.click();

          // Wait for select button to be enabled
          await page.waitForTimeout(500);

          // Click the "Select Character" button
          const selectButton = await page.$('button:not([disabled])');
          if (selectButton) {
            const buttonText = await selectButton.evaluate(el => el.textContent);
            if (buttonText.includes('Select')) {
              console.log(`[${account.displayName}] Clicking Select Character button...`);
              await selectButton.click();
              await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
              console.log(`[${account.displayName}] ✅ Character selected!`);
            }
          }
        } else {
          console.log(`[${account.displayName}] ⚠️  No characters available. User may need to create one first.`);
        }
      } catch (e) {
        console.log(`[${account.displayName}] ⚠️  Character selection page not found or no characters available.`);
        console.log(`[${account.displayName}]    This player may need to create a character first.`);
      }
    }

    console.log(`[${account.displayName}] 🎮 Ready for testing!`);

  } catch (error) {
    console.error(`[${account.displayName}] ❌ Error:`, error.message);
    console.log(`[${account.displayName}] Browser left open for manual investigation.`);
  }

  // Keep browser open - don't close it
  console.log(`[${account.displayName}] Browser will stay open. Close manually when done testing.`);
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('  Deadlands Manual Testing Launcher');
  console.log('========================================');
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`API URL: ${API_URL}`);
  console.log('');
  console.log('Launching 3 incognito browsers...');
  console.log('- Browser 1: Game Master (gamemaster)');
  console.log('- Browser 2: Player 1 (e2e_player1)');
  console.log('- Browser 3: Player 2 (e2e_player2)');
  console.log('');
  console.log('To use localhost instead, run:');
  console.log('  FRONTEND_URL=http://localhost:3000 API_URL=http://localhost:8080/api node launch-test-scenario.js');
  console.log('');

  // Launch all browsers in parallel
  try {
    await Promise.all(
      accounts.map((account, index) => launchBrowser(account, index))
    );

    console.log('\n========================================');
    console.log('✅ All browsers launched successfully!');
    console.log('========================================');
    console.log('\nBrowsers will stay open for testing.');
    console.log('Close them manually when done.');
    console.log('\nPress Ctrl+C to exit this script (browsers will remain open).\n');

  } catch (error) {
    console.error('\n❌ Error launching browsers:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { launchBrowser };
