const { setWorldConstructor, Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { Builder, Browser } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const axios = require('axios');

// Set default timeout to 60 seconds for all steps
setDefaultTimeout(60000);

// Configuration
const config = {
  seleniumHubUrl: process.env.SELENIUM_HUB_URL || 'http://localhost:4444',
  frontendUrl: process.env.FRONTEND_URL || 'https://deadlands-frontend-production.up.railway.app',
  apiUrl: process.env.API_URL || 'https://deadlands-campaign-manager-production.up.railway.app/api',
  headless: process.env.HEADLESS === 'true',
  devtools: process.env.DEVTOOLS === 'true',
  slowMo: parseInt(process.env.SLOW_MO || '0'),
};

class CustomWorld {
  constructor({ attach, parameters }) {
    this.attach = attach;
    this.parameters = parameters;
    this.browsers = {}; // Store multiple browser instances
    this.pages = {}; // Store page objects for each browser
    this.testData = {}; // Store test data
    this.config = config;
    this.createdCharacters = []; // Track characters created during this test
    this.authTokens = {}; // Store auth tokens for cleanup
  }

  // Create a new browser instance with retry logic
  async createBrowser(browserName, maxRetries = 10) {
    const chromeOptions = new chrome.Options();

    if (this.config.headless) {
      chromeOptions.addArguments('--headless');
    }

    chromeOptions.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'
    );

    // Enable DevTools if requested
    if (this.config.devtools) {
      chromeOptions.addArguments('--auto-open-devtools-for-tabs');
      console.log(`⚙️  DevTools will auto-open for browser '${browserName}'`);
    }

    // Enable browser console logs (using modern API)
    chromeOptions.setLoggingPrefs({
      browser: 'ALL',
      driver: 'INFO'
    });

    // Retry logic for connecting to Selenium Grid
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const driver = await new Builder()
          .forBrowser(Browser.CHROME)
          .setChromeOptions(chromeOptions)
          .usingServer(this.config.seleniumHubUrl)
          .build();

        // Set implicit wait and page load timeout
        await driver.manage().setTimeouts({
          implicit: 20000,
          pageLoad: 30000
        });

        this.browsers[browserName] = driver;
        console.log(`Browser '${browserName}' created successfully on attempt ${attempt}`);
        return driver;
      } catch (error) {
        lastError = error;
        const isConnectionError =
          error.code === 'ECONNREFUSED' ||
          (error.message && error.message.includes('ECONNREFUSED'));

        if (isConnectionError && attempt < maxRetries) {
          console.log(`Failed to connect to Selenium Grid (attempt ${attempt}/${maxRetries}), retrying in 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (attempt >= maxRetries) {
          throw lastError;
        } else {
          throw error;
        }
      }
    }
    throw lastError;
  }

  // Get existing browser or create new one
  async getBrowser(browserName) {
    if (!this.browsers[browserName]) {
      await this.createBrowser(browserName);
    }
    return this.browsers[browserName];
  }

  // Close a specific browser
  async closeBrowser(browserName) {
    if (this.browsers[browserName]) {
      await this.browsers[browserName].quit();
      delete this.browsers[browserName];
      delete this.pages[browserName];
    }
  }

  // Close all browsers
  async closeAllBrowsers() {
    for (const browserName of Object.keys(this.browsers)) {
      await this.closeBrowser(browserName);
    }
  }

  // Use existing test accounts (no creation needed)
  async createTestAccount(username, email, password) {
    // NOTE: Test accounts already exist in production database
    // e2e_testgm, e2e_player1, e2e_player2 were created via SQL scripts
    console.log(`Using existing test account: ${username}`);
    return { message: 'Using existing account', username };
  }

  // Promote user to GM role via API
  async promoteToGM(username) {
    // This would require a backend admin endpoint or direct database access
    // For now, we'll log a warning
    console.warn(`TODO: Implement GM promotion for ${username}`);
  }

  // Create character for user via API
  async createCharacter(token, characterData) {
    try {
      const response = await axios.post(
        `${this.config.apiUrl}/characters`,
        characterData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log(`Character created: ${characterData.name}`);

      // Track created character for cleanup
      if (response.data && response.data.id) {
        this.createdCharacters.push({
          id: response.data.id,
          name: response.data.name,
          token: token
        });
        console.log(`Tracked character ${response.data.name} (ID: ${response.data.id}) for cleanup`);
      }

      return response.data;
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = typeof errorData === 'string' ? errorData : errorData?.message || JSON.stringify(errorData);

      // If character already exists or any 400 error, try to fetch existing character
      if (error.response?.status === 400) {
        console.log(`Character may already exist for ${characterData.name}, attempting to fetch...`);
        try {
          const getResponse = await axios.get(
            `${this.config.apiUrl}/characters`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const existingChar = getResponse.data.find(char => char.name === characterData.name);
          if (existingChar) {
            console.log(`Using existing character: ${characterData.name} (will NOT cleanup - existed before test)`);
            return existingChar;
          }
        } catch (fetchError) {
          console.error('Failed to fetch existing characters:', fetchError.message);
        }
      }

      console.error(`Failed to create character ${characterData.name}:`, error.response?.status, errorMessage);
      throw error;
    }
  }

  // Login and get token
  async login(username, password) {
    try {
      const response = await axios.post(`${this.config.apiUrl}/auth/login`, {
        username,
        password,
      });
      return response.data.token;
    } catch (error) {
      console.error(`Login failed for ${username}:`, error.message);
      throw error;
    }
  }
}

setWorldConstructor(CustomWorld);

// Global hooks
BeforeAll(async function () {
  console.log('Starting E2E test suite...');
  console.log('Config:', config);
});

AfterAll(async function () {
  console.log('E2E test suite completed');
});

// Scenario hooks
Before(async function () {
  // Reset test data for each scenario
  this.testData = {};
  this.createdCharacters = [];
  this.authTokens = {};
});

After(async function ({ result, pickle }) {
  // Take screenshot on failure
  if (result.status === 'FAILED') {
    for (const [browserName, driver] of Object.entries(this.browsers)) {
      try {
        const screenshot = await driver.takeScreenshot();
        this.attach(screenshot, 'image/png');
      } catch (error) {
        console.error(`Failed to take screenshot for ${browserName}:`, error.message);
      }
    }
  }

  // CRITICAL: Clean up created test data
  if (this.createdCharacters && this.createdCharacters.length > 0) {
    console.log(`\nCleaning up ${this.createdCharacters.length} test character(s)...`);
    for (const char of this.createdCharacters) {
      try {
        await axios.delete(
          `${this.config.apiUrl}/characters/${char.id}`,
          { headers: { Authorization: `Bearer ${char.token}` } }
        );
        console.log(`✓ Deleted test character: ${char.name} (ID: ${char.id})`);
      } catch (error) {
        console.warn(`✗ Failed to cleanup character ${char.name} (ID: ${char.id}):`, error.message);
      }
    }
    console.log(`Cleanup complete.\n`);
  }

  // Close all browsers after each scenario
  await this.closeAllBrowsers();
});

module.exports = { CustomWorld, config };
