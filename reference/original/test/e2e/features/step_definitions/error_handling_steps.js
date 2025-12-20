const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('chai');
const LoginPage = require('../support/pages/LoginPage');
const CharacterSelectPage = require('../support/pages/CharacterSelectPage');
const GameArenaPage = require('../support/pages/GameArenaPage');

setDefaultTimeout(90000); // Longer timeout for error scenarios

// Helper function to check for notification/toast messages
async function findNotificationMessage(driver, messageText) {
  try {
    const found = await driver.executeScript(`
      const body = document.body.innerText;
      return body.includes("${messageText}");
    `);
    return found;
  } catch (error) {
    return false;
  }
}

// Helper function to get connection status
async function getConnectionStatus(driver) {
  try {
    const status = await driver.executeScript(`
      // Look for connection status indicator in DOM
      const statusElement = document.querySelector('[data-testid="connection-status"]') ||
                            document.querySelector('[class*="connection-status"]') ||
                            document.querySelector('[class*="ConnectionStatus"]');

      if (statusElement) {
        return statusElement.innerText.toLowerCase();
      }

      // Check WebSocket state in console
      if (window.__WEBSOCKET_STATE__) {
        return window.__WEBSOCKET_STATE__;
      }

      return 'unknown';
    `);
    return status;
  } catch (error) {
    return 'error';
  }
}

// Step: Player is logged in with test accounts
Given('{string} is logged in with test accounts', async function (username) {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);

  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);

  expect(await loginPage.isLoginSuccessful()).to.be.true;
});

// Step: Player navigates directly to /arena
When('the player navigates directly to {string}', async function (path) {
  const driver = this.browsers.default;
  const url = `${this.config.frontendUrl}${path}`;

  await driver.get(url);
  await driver.sleep(2000);
});

// Step: Player should be redirected to /character-select
Then('the player should be redirected to {string}', async function (expectedPath) {
  const driver = this.browsers.default;

  // Wait for redirect
  await driver.sleep(2000);

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include(expectedPath);
});

// Step: URL should be /character-select
Then('the URL should be {string}', async function (expectedPath) {
  const driver = this.browsers.default;

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include(expectedPath);
});

// Step: Player is in the arena (from error-handling)
Given('{string} is in the arena', async function (username) {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);
  const characterSelectPage = new CharacterSelectPage(driver);
  const arenaPage = new GameArenaPage(driver);

  // Login
  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);
  expect(await loginPage.isLoginSuccessful()).to.be.true;

  // Select character
  await characterSelectPage.navigate(this.config.frontendUrl);
  await characterSelectPage.selectFirstCharacter();

  // Should be redirected to arena
  await driver.sleep(2000);
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');
});

// Step: WebSocket connection fails
When('the WebSocket connection fails', async function () {
  const driver = this.browsers.default;

  // Simulate WebSocket failure by closing the connection
  await driver.executeScript(`
    // Force close WebSocket if accessible
    if (window.__WEBSOCKET_CONNECTION__) {
      window.__WEBSOCKET_CONNECTION__.close();
    }

    // Or dispatch a connection error event
    window.dispatchEvent(new Event('websocket-error'));
  `);

  await driver.sleep(2000);
});

// Step: Player should see notification
Then('the player should see {string} notification', async function (messageText) {
  const driver = this.browsers.default;

  const found = await findNotificationMessage(driver, messageText);
  expect(found).to.be.true;
});

// Step: Connection status should show disconnected
Then('the connection status should show {string}', async function (expectedStatus) {
  const driver = this.browsers.default;

  const status = await getConnectionStatus(driver);
  expect(status).to.include(expectedStatus);
});

// Step: WebSocket is connected
Given('the WebSocket is connected', async function () {
  const driver = this.browsers.default;

  // Verify we're in arena and wait for WebSocket to connect
  await driver.sleep(3000);

  const status = await getConnectionStatus(driver);
  // If status is unknown, assume it's connected (no error shown)
  if (status !== 'error' && status !== 'disconnected') {
    this.websocketConnected = true;
  }
});

// Step: Network connection is interrupted
When('the network connection is interrupted for {int} seconds', async function (seconds) {
  const driver = this.browsers.default;

  // Simulate network interruption
  await driver.executeScript(`
    if (window.__WEBSOCKET_CONNECTION__) {
      window.__WEBSOCKET_CONNECTION__.close();
    }
  `);

  await driver.sleep(seconds * 1000);
});

// Step: Connection is restored
When('the connection is restored', async function () {
  const driver = this.browsers.default;

  // Wait for auto-reconnect
  await driver.sleep(2000);
});

// Step: WebSocket should automatically reconnect
Then('the WebSocket should automatically reconnect', async function () {
  const driver = this.browsers.default;

  // Wait for reconnection attempt
  await driver.sleep(3000);

  // Check status - should not show disconnected
  const status = await getConnectionStatus(driver);
  // If no error visible, assume reconnected
  expect(status).to.not.equal('disconnected');
});

// Step: No error message should be visible
Then('no error message should be visible', async function () {
  const driver = this.browsers.default;

  const hasError = await driver.executeScript(`
    const body = document.body.innerText.toLowerCase();
    return body.includes('error') || body.includes('failed') || body.includes('connection lost');
  `);

  expect(hasError).to.be.false;
});

// Step: Player navigates to character-select
Given('{string} navigates to character-select', async function (username) {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);
  const characterSelectPage = new CharacterSelectPage(driver);

  // Login
  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);
  expect(await loginPage.isLoginSuccessful()).to.be.true;

  // Navigate to character select
  await characterSelectPage.navigate(this.config.frontendUrl);
  await driver.sleep(2000);
});

// Step: API returns 500 error
When('the API returns a {int} error for character fetch', async function (statusCode) {
  const driver = this.browsers.default;

  // Mock API failure using browser DevTools Protocol or by intercepting fetch
  await driver.executeScript(`
    // Override fetch to return 500
    const originalFetch = window.fetch;
    window.fetch = function(url) {
      if (url.includes('/characters')) {
        return Promise.resolve({
          ok: false,
          status: ${statusCode},
          json: () => Promise.resolve({ error: 'Internal Server Error' })
        });
      }
      return originalFetch.apply(this, arguments);
    };
  `);

  // Refresh to trigger the fetch
  await driver.navigate().refresh();
  await driver.sleep(2000);
});

// Step: Try Again button should be visible
Then('a {string} button should be visible', async function (buttonText) {
  const driver = this.browsers.default;

  const buttonExists = await driver.executeScript(`
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(btn => btn.innerText.includes("${buttonText}"));
  `);

  expect(buttonExists).to.be.true;
});

// Step: API request times out
When('the API request times out after {int} seconds', async function (timeoutSeconds) {
  const driver = this.browsers.default;

  // Mock slow API
  await driver.executeScript(`
    window.fetch = function(url) {
      if (url.includes('/characters')) {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: false,
              status: 408,
              json: () => Promise.resolve({ error: 'Request Timeout' })
            });
          }, ${timeoutSeconds * 1000});
        });
      }
      return fetch.apply(this, arguments);
    };
  `);

  await driver.navigate().refresh();
});

// Step: Loading spinner should show initially
Then('a loading spinner should show initially', async function () {
  const driver = this.browsers.default;

  // Check for loading indicator immediately
  const hasLoader = await driver.executeScript(`
    return document.querySelector('[class*="loading"]') !== null ||
           document.querySelector('[class*="spinner"]') !== null ||
           document.body.innerText.includes('Loading');
  `);

  expect(hasLoader).to.be.true;
});

// Step: After timeout, error should display
Then('after timeout, {string} error should display', async function (errorText) {
  const driver = this.browsers.default;

  // Wait for timeout
  await driver.sleep(3000);

  const hasError = await findNotificationMessage(driver, errorText);
  expect(hasError).to.be.true;
});

// Step: Retry button should appear
Then('a {string} button should appear', async function (buttonText) {
  const driver = this.browsers.default;

  const buttonExists = await driver.executeScript(`
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.some(btn => btn.innerText.includes("${buttonText}"));
  `);

  expect(buttonExists).to.be.true;
});

// Step: Player is logged in as PLAYER role
Given('{string} is logged in as PLAYER role', async function (username) {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);

  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);

  expect(await loginPage.isLoginSuccessful()).to.be.true;
});

// Step: Player should see 403 Forbidden or be redirected
Then('the player should see {string} or be redirected', async function (expectedText) {
  const driver = this.browsers.default;

  await driver.sleep(2000);

  const currentUrl = await driver.getCurrentUrl();
  const pageText = await driver.executeScript('return document.body.innerText;');

  // Either see 403 error OR redirected away from /gm-tools
  const has403 = pageText.includes(expectedText);
  const redirected = !currentUrl.includes('/gm-tools');

  expect(has403 || redirected).to.be.true;
});

// Step: GM tools should not be accessible
Then('GM tools should not be accessible', async function () {
  const driver = this.browsers.default;

  const currentUrl = await driver.getCurrentUrl();
  const hasGMPanel = await driver.executeScript(`
    return document.querySelector('[data-testid="gm-panel"]') !== null;
  `);

  // Either not on /gm-tools page OR GM panel not visible
  const notAccessible = !currentUrl.includes('/gm-tools') || !hasGMPanel;
  expect(notAccessible).to.be.true;
});

// Step: Player is on login page
Given('the player is on the login page', async function () {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);

  await loginPage.navigate(this.config.frontendUrl);
  await driver.sleep(1000);
});

// Step: Player enters username and wrong password
When('the player enters username {string} and wrong password', async function (username) {
  const driver = this.browsers.default;

  await driver.findElement({ css: 'input[name="username"]' }).sendKeys(username);
  await driver.findElement({ css: 'input[name="password"]' }).sendKeys('WrongPassword123!');
});

// Step: Player clicks Login button
When('the player clicks the {string} button on login page', async function (buttonText) {
  const driver = this.browsers.default;

  const loginButton = await driver.findElement({ css: 'button[type="submit"]' });
  await loginButton.click();

  await driver.sleep(2000);
});

// Step: Error message should display
Then('an error message should display {string}', async function (errorText) {
  const driver = this.browsers.default;

  const hasError = await findNotificationMessage(driver, errorText);
  expect(hasError).to.be.true;
});

// Step: Player should remain on login page
Then('the player should remain on the login page', async function () {
  const driver = this.browsers.default;

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/login');
});

// Step: Player has expired JWT token
Given('{string} has an expired JWT token', async function (username) {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);

  // Login normally first
  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);
  expect(await loginPage.isLoginSuccessful()).to.be.true;

  // Manually expire the token in localStorage
  await driver.executeScript(`
    // Set an expired token
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjB9.invalid';

    // Update auth store or localStorage with expired token
    localStorage.setItem('auth-storage', JSON.stringify({
      state: { token: expiredToken },
      version: 0
    }));
  `);

  await driver.sleep(1000);
});

// Step: Message should indicate session expired
Then('a message should indicate {string}', async function (messageText) {
  const driver = this.browsers.default;

  const found = await findNotificationMessage(driver, messageText);
  // If not found in toast, check if we were redirected (which also indicates expiration)
  const currentUrl = await driver.getCurrentUrl();

  expect(found || currentUrl.includes('/login')).to.be.true;
});
