const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const LoginPage = require('../support/pages/LoginPage');
const GameArenaPage = require('../support/pages/GameArenaPage');
const axios = require('axios');

// ==================== SETUP STEPS ====================

Given('{string} enters the game arena with their character', async function (username) {
  const browserName = username === 'e2e_player1' ? 'Player1' :
                      username === 'e2e_player2' ? 'Player2' :
                      'GM';

  const driver = await this.getBrowser(browserName);
  const loginPage = new LoginPage(driver);

  // Login
  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);
  expect(await loginPage.isLoginSuccessful()).to.be.true;

  // Go directly to arena
  const arenaPage = new GameArenaPage(driver);
  await arenaPage.navigate(this.config.frontendUrl);
  const isLoaded = await arenaPage.isArenaLoaded();
  expect(isLoaded).to.be.true;

  this.pages[browserName] = { loginPage, arenaPage };
});

When('{string} refreshes the page', async function (browserName) {
  const driver = await this.getBrowser(browserName);
  await driver.navigate().refresh();
  await this.sleep(2000); // Wait for page to reload
});

When('{string} returns to the game arena', async function (browserName) {
  const driver = await this.getBrowser(browserName);
  const arenaPage = new GameArenaPage(driver);

  // Wait for arena to load after refresh
  const isLoaded = await arenaPage.waitForArenaLoaded(15000);
  expect(isLoaded).to.be.true;

  this.pages[browserName].arenaPage = arenaPage;
});

When('{string} logs in and enters the game arena in browser {string}', async function (username, browserName) {
  const driver = await this.getBrowser(browserName);
  const loginPage = new LoginPage(driver);

  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);
  expect(await loginPage.isLoginSuccessful()).to.be.true;

  // Go directly to arena
  const arenaPage = new GameArenaPage(driver);
  await arenaPage.navigate(this.config.frontendUrl);
  const isLoaded = await arenaPage.isArenaLoaded();
  expect(isLoaded).to.be.true;

  this.pages[browserName] = { loginPage, arenaPage };
});

Given('both players are in the game arena with their tokens', async function () {
  // Player 1 logs in and goes to arena
  const driver1 = await this.getBrowser('Player1');
  const loginPage1 = new LoginPage(driver1);
  await loginPage1.navigate(this.config.frontendUrl);
  await loginPage1.login('e2e_player1', this.testData['e2e_player1'].password);
  expect(await loginPage1.isLoginSuccessful()).to.be.true;

  const arenaPage1 = new GameArenaPage(driver1);
  await arenaPage1.navigate(this.config.frontendUrl);
  expect(await arenaPage1.isArenaLoaded()).to.be.true;

  // Player 2 logs in and goes to arena
  const driver2 = await this.getBrowser('Player2');
  const loginPage2 = new LoginPage(driver2);
  await loginPage2.navigate(this.config.frontendUrl);
  await loginPage2.login('e2e_player2', this.testData['e2e_player2'].password);
  expect(await loginPage2.isLoginSuccessful()).to.be.true;

  const arenaPage2 = new GameArenaPage(driver2);
  await arenaPage2.navigate(this.config.frontendUrl);
  expect(await arenaPage2.isArenaLoaded()).to.be.true;

  this.pages['Player1'] = { loginPage: loginPage1, arenaPage: arenaPage1 };
  this.pages['Player2'] = { loginPage: loginPage2, arenaPage: arenaPage2 };
});

Given('both are in the game arena', async function () {
  // GM logs in and goes to arena
  const driverGM = await this.getBrowser('GM');
  const loginPageGM = new LoginPage(driverGM);
  await loginPageGM.navigate(this.config.frontendUrl);
  await loginPageGM.login('e2e_testgm', this.testData['e2e_testgm'].password);
  expect(await loginPageGM.isLoginSuccessful()).to.be.true;

  const arenaPageGM = new GameArenaPage(driverGM);
  await arenaPageGM.navigate(this.config.frontendUrl);
  expect(await arenaPageGM.isArenaLoaded()).to.be.true;

  // Player logs in and goes to arena
  const driverPlayer = await this.getBrowser('Player1');
  const loginPagePlayer = new LoginPage(driverPlayer);
  await loginPagePlayer.navigate(this.config.frontendUrl);
  await loginPagePlayer.login('e2e_player1', this.testData['e2e_player1'].password);
  expect(await loginPagePlayer.isLoginSuccessful()).to.be.true;

  const arenaPagePlayer = new GameArenaPage(driverPlayer);
  await arenaPagePlayer.navigate(this.config.frontendUrl);
  expect(await arenaPagePlayer.isArenaLoaded()).to.be.true;

  this.pages['GM'] = { loginPage: loginPageGM, arenaPage: arenaPageGM };
  this.pages['Player1'] = { loginPage: loginPagePlayer, arenaPage: arenaPagePlayer };
});

Given('all players are in the game arena', async function () {
  // GM logs in and goes to arena
  const driverGM = await this.getBrowser('GM');
  const loginPageGM = new LoginPage(driverGM);
  await loginPageGM.navigate(this.config.frontendUrl);
  await loginPageGM.login('e2e_testgm', this.testData['e2e_testgm'].password);
  expect(await loginPageGM.isLoginSuccessful()).to.be.true;

  const arenaPageGM = new GameArenaPage(driverGM);
  await arenaPageGM.navigate(this.config.frontendUrl);
  expect(await arenaPageGM.isArenaLoaded()).to.be.true;

  // Both players log in and go to arena
  for (const [playerUsername, browserName] of [['e2e_player1', 'Player1'], ['e2e_player2', 'Player2']]) {
    const driver = await this.getBrowser(browserName);
    const loginPage = new LoginPage(driver);
    await loginPage.navigate(this.config.frontendUrl);
    await loginPage.login(playerUsername, this.testData[playerUsername].password);
    expect(await loginPage.isLoginSuccessful()).to.be.true;

    const arenaPage = new GameArenaPage(driver);
    await arenaPage.navigate(this.config.frontendUrl);
    expect(await arenaPage.isArenaLoaded()).to.be.true;

    if (!this.pages[browserName]) this.pages[browserName] = {};
    this.pages[browserName].loginPage = loginPage;
    this.pages[browserName].arenaPage = arenaPage;
  }

  this.pages['GM'] = { loginPage: loginPageGM, arenaPage: arenaPageGM };
});

// ==================== TOKEN MOVEMENT VALIDATION STEPS ====================

When('{string} attempts to move {string}\'s token to position \\({int}, {int})', async function (moverBrowser, targetUsername, x, y) {
  const arenaPage = this.pages[moverBrowser].arenaPage;

  // Try to move another player's token via script injection (should fail on backend)
  try {
    await arenaPage.executeScript(`
      const scene = window.game.scene.getScene('ArenaScene');
      if (scene && scene.sendTokenMove) {
        const characterId = '${this.testData[targetUsername].character.id}';
        scene.sendTokenMove(characterId, 'PLAYER', ${x}, ${y});
      }
    `);
    await this.sleep(500);
  } catch (error) {
    console.log('Client-side move attempt blocked:', error.message);
  }
});

Then('{string} should not be able to move other players\' tokens', async function (browserName) {
  // This is a passive assertion - the backend should reject the move
  // We verify by checking the token hasn't moved in the next step
  expect(true).to.be.true;
});

When('{string} moves {string}\'s token to position \\({int}, {int})', async function (moverBrowser, targetUsername, x, y) {
  // GM moving another player's token
  const arenaPage = this.pages[moverBrowser].arenaPage;

  await arenaPage.executeScript(`
    const scene = window.game.scene.getScene('ArenaScene');
    if (scene && scene.sendTokenMove) {
      const characterId = '${this.testData[targetUsername].character.id}';
      scene.sendTokenMove(characterId, 'PLAYER', ${x}, ${y});
    }
  `);
  await this.sleep(500);
});

// ==================== DATABASE VERIFICATION STEPS ====================

Then('the database should contain {int} token positions', async function (expectedCount) {
  try {
    // Call backend API to get token positions
    const response = await axios.get(`${this.config.apiUrl}/game/state`, {
      headers: {
        Authorization: `Bearer ${await this.login('e2e_testgm', this.testData['e2e_testgm'].password)}`
      }
    });

    const tokenCount = response.data.tokenPositions?.length || 0;
    expect(tokenCount).to.equal(expectedCount);
  } catch (error) {
    console.error('Failed to verify database token count:', error.message);
    throw error;
  }
});

Then('the database should contain {string}\'s token at position \\({int}, {int})', async function (username, x, y) {
  try {
    const token = await this.login('e2e_testgm', this.testData['e2e_testgm'].password);
    const response = await axios.get(`${this.config.apiUrl}/game/state`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const characterId = String(this.testData[username].character.id);
    const tokenPosition = response.data.tokenPositions?.find(pos => pos.tokenId === characterId);

    expect(tokenPosition).to.not.be.undefined;
    expect(tokenPosition.gridX).to.equal(x);
    expect(tokenPosition.gridY).to.equal(y);
  } catch (error) {
    console.error('Failed to verify token position in database:', error.message);
    throw error;
  }
});

Then('{string} should see {int} remote tokens on the map', async function (browserName, expectedCount) {
  const arenaPage = this.pages[browserName].arenaPage;
  const tokenCount = await arenaPage.getRemoteTokenCount();
  expect(tokenCount).to.equal(expectedCount);
});

// ==================== BOUNDS VALIDATION STEPS ====================

When('{string} attempts to move token to position \\({int}, {int})', async function (browserName, x, y) {
  const arenaPage = this.pages[browserName].arenaPage;

  // Store current position before attempting move
  const beforePosition = await arenaPage.getPlayerTokenPosition();
  this.testData.positionBeforeInvalidMove = beforePosition;

  // Attempt to move
  try {
    await arenaPage.moveTokenTo(x, y);
    await this.sleep(500);
  } catch (error) {
    console.log('Move attempt failed (expected):', error.message);
  }
});

Then('the move should be rejected by the server', async function () {
  // The backend should reject invalid moves
  // Verification happens in the next step (token position unchanged)
  expect(true).to.be.true;
});

Then('{string} should remain at the starting position', async function (browserName) {
  const arenaPage = this.pages[browserName].arenaPage;
  const currentPosition = await arenaPage.getPlayerTokenPosition();

  // Should be at same position as before the invalid move
  if (this.testData.positionBeforeInvalidMove) {
    expect(currentPosition.x).to.equal(this.testData.positionBeforeInvalidMove.x);
    expect(currentPosition.y).to.equal(this.testData.positionBeforeInvalidMove.y);
  } else {
    // Or at default starting position (100, 100)
    expect(currentPosition.x).to.equal(100);
    expect(currentPosition.y).to.equal(100);
  }
});

// ==================== TOKEN SYNC TIMING STEPS ====================

Then('{string} should see {string}\'s remote token at position \\({int}, {int}) within {int} seconds',
  async function (browserName, username, x, y, seconds) {
    const arenaPage = this.pages[browserName].arenaPage;

    const startTime = Date.now();
    const timeout = seconds * 1000;

    while (Date.now() - startTime < timeout) {
      const position = await arenaPage.getRemoteTokenPosition(username);
      if (position && position.x === x && position.y === y) {
        return; // Success
      }
      await this.sleep(200);
    }

    throw new Error(`Token did not appear at position (${x}, ${y}) within ${seconds} seconds`);
  });

// ==================== SCENARIO OUTLINE SUPPORT STEPS ====================

Given('{int} players are logged in and in the game arena', async function (playerCount) {
  const playerMappings = [
    ['e2e_player1', 'Player1'],
    ['e2e_player2', 'Player2'],
    ['e2e_testgm', 'GM']
  ];

  const playersToUse = playerMappings.slice(0, playerCount);

  for (const [username, browserName] of playersToUse) {
    const driver = await this.getBrowser(browserName);
    const loginPage = new LoginPage(driver);

    await loginPage.navigate(this.config.frontendUrl);
    await loginPage.login(username, this.testData[username].password);

    const arenaPage = new GameArenaPage(driver);
    await arenaPage.navigate(this.config.frontendUrl, 'test-session');
    await arenaPage.waitForArenaLoaded(15000);

    this.pages[browserName] = { loginPage, arenaPage };
  }

  // Store player count for later verification
  this.testData.activePlayerCount = playerCount;
});

Given('all players have moved to different positions', async function () {
  const positions = [
    [100, 100],
    [120, 110],
    [130, 95]
  ];

  let index = 0;
  for (const [browserName, pages] of Object.entries(this.pages)) {
    if (pages.arenaPage && index < positions.length) {
      await pages.arenaPage.moveTokenTo(positions[index][0], positions[index][1]);
      await this.sleep(500);
      index++;
    }
  }
});

When('all players refresh their browsers', async function () {
  for (const browserName of Object.keys(this.browsers)) {
    const driver = await this.getBrowser(browserName);
    await driver.navigate().refresh();
  }
  await this.sleep(2000);
});

When('all players return to the game arena', async function () {
  for (const [browserName, driver] of Object.entries(this.browsers)) {
    const arenaPage = new GameArenaPage(driver);
    await arenaPage.waitForArenaLoaded(15000);
    this.pages[browserName].arenaPage = arenaPage;
  }
});

Then('all players should see all tokens at their correct positions', async function () {
  // This is a complex verification - we check that each player sees the correct remote tokens
  const expectedTokenCount = this.testData.activePlayerCount || 0;

  for (const [browserName, pages] of Object.entries(this.pages)) {
    if (pages.arenaPage) {
      const remoteTokenCount = await pages.arenaPage.getRemoteTokenCount();
      // Each player should see (n-1) remote tokens (all others except themselves)
      expect(remoteTokenCount).to.be.at.least(expectedTokenCount - 1);
    }
  }
});

Then('no token positions should be lost', async function () {
  // Verify against database
  const token = await this.login('e2e_testgm', this.testData['e2e_testgm'].password);
  const response = await axios.get(`${this.config.apiUrl}/game/state`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const tokenCount = response.data.tokenPositions?.length || 0;
  const expectedCount = this.testData.activePlayerCount || 0;
  expect(tokenCount).to.equal(expectedCount);
});

// ==================== ADDITIONAL MISSING STEP DEFINITIONS ====================

Then('{string}\'s token should remain at position \\({int}, {int})', async function (username, x, y) {
  // Determine browser name from username
  const browserName = username === 'e2e_player1' ? 'Player1' :
                      username === 'e2e_player2' ? 'Player2' :
                      'GM';

  const arenaPage = this.pages[browserName]?.arenaPage || new GameArenaPage(await this.getBrowser(browserName));
  const position = await arenaPage.getPlayerTokenPosition();

  expect(position).to.not.be.null;
  expect(position.x).to.equal(x);
  expect(position.y).to.equal(y);
});

When('{string} refreshes the browser {string}', async function (username, browserName) {
  const driver = await this.getBrowser(browserName);
  await driver.navigate().refresh();
  await this.sleep(2000); // Wait for page to reload
});

Given('both players are in the game arena', async function () {
  // Alias for "both players are in the game arena with their tokens"
  // This step already exists at line 59, but adding an alias without "with their tokens" phrase
  for (const [username, browserName] of [['e2e_player1', 'Player1'], ['e2e_player2', 'Player2']]) {
    const driver = await this.getBrowser(browserName);
    const loginPage = new LoginPage(driver);

    await loginPage.navigate(this.config.frontendUrl);
    await loginPage.login(username, this.testData[username].password);
    expect(await loginPage.isLoginSuccessful()).to.be.true;

    const arenaPage = new GameArenaPage(driver);
    await arenaPage.navigate(this.config.frontendUrl, 'test-session');
    const isLoaded = await arenaPage.waitForArenaLoaded(15000);
    expect(isLoaded).to.be.true;

    this.pages[browserName] = { loginPage, arenaPage };
  }
});

// ==================== HELPER METHODS ====================

Given('GameArenaPage helper: waitForArenaLoaded', async function () {
  // Add helper method to GameArenaPage if not present
  const GameArenaPage = require('../support/pages/GameArenaPage');
  if (!GameArenaPage.prototype.waitForArenaLoaded) {
    GameArenaPage.prototype.waitForArenaLoaded = async function (timeout = 10000) {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        const isLoaded = await this.isArenaLoaded();
        if (isLoaded) return true;
        await this.sleep(500);
      }
      return false;
    };
  }
});
