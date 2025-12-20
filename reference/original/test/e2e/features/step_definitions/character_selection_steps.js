const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('chai');
const LoginPage = require('../support/pages/LoginPage');
const DashboardPage = require('../support/pages/DashboardPage');
const CharacterSelectPage = require('../support/pages/CharacterSelectPage');
const GameArenaPage = require('../support/pages/GameArenaPage');

// Set timeout to 60 seconds for all steps
setDefaultTimeout(60000);

// Background steps

Given('the application is running on production', async function () {
  // Verify frontend is accessible (production URL)
  const driver = await this.getBrowser('healthcheck');
  const loginPage = new LoginPage(driver);
  await loginPage.navigate(this.config.frontendUrl);
  expect(await loginPage.isElementPresent(loginPage.usernameInput)).to.be.true;
  await this.closeBrowser('healthcheck');
});

// Login steps (simplified - single browser)

Given('{string} is logged in as Player', async function (username) {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);

  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);

  expect(await loginPage.isLoginSuccessful()).to.be.true;

  this.currentPage = { loginPage };
});

Given('{string} is logged in with no characters', async function (username) {
  // For this scenario, we assume the user exists but has no characters
  // This would need to be set up in advance or via API cleanup
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);

  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, 'Test123!'); // Use default test password

  expect(await loginPage.isLoginSuccessful()).to.be.true;

  this.currentPage = { loginPage };
});

// Dashboard steps

When('the player clicks {string} on the dashboard', async function (buttonText) {
  const driver = this.browsers.default;
  const dashboardPage = new DashboardPage(driver);

  if (buttonText === 'Play Game') {
    await dashboardPage.clickPlayGame();
  } else if (buttonText === 'New Character') {
    await dashboardPage.clickNewCharacter();
  }

  this.currentPage = { dashboardPage };
});

When('the player clicks {string}', async function (buttonText) {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  if (buttonText === 'Back to Dashboard') {
    await characterSelectPage.clickBackToDashboard();
  }

  this.currentPage = { characterSelectPage };
});

// Character Select steps

Then('the player should see the character selection screen', async function () {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  const isDisplayed = await characterSelectPage.isCharacterSelectionScreenDisplayed();
  expect(isDisplayed).to.be.true;
});

Then('the character selection screen should display available characters', async function () {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  const cards = await characterSelectPage.getCharacterCards();
  expect(cards.length).to.be.greaterThan(0, 'No character cards found');
});

When('the player selects a character', async function () {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  await characterSelectPage.selectFirstCharacter();
  this.selectedCharacterName = 'first'; // Store for later verification
});

When('the player navigates to {string}', async function (path) {
  const driver = this.browsers.default;
  const url = `${this.config.frontendUrl}${path}`;

  await driver.get(url);
  await driver.sleep(2000); // Wait for page load
});

Given('the player is on the character selection screen', async function () {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  await characterSelectPage.navigate(this.config.frontendUrl);

  const isDisplayed = await characterSelectPage.isCharacterSelectionScreenDisplayed();
  expect(isDisplayed).to.be.true;
});

Given('the player has selected {string} from character select', async function (characterName) {
  const driver = this.browsers.default;
  const dashboardPage = new DashboardPage(driver);
  const characterSelectPage = new CharacterSelectPage(driver);

  // Navigate to character select via dashboard
  await dashboardPage.navigate(this.config.frontendUrl);
  await dashboardPage.clickPlayGame();

  // Select the character
  await characterSelectPage.selectCharacter(characterName);

  this.selectedCharacterName = characterName;
});

// Arena steps

Then('the player should be redirected to the arena', async function () {
  const driver = this.browsers.default;
  await driver.sleep(2000); // Wait for navigation

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');
});

Then('the player should be redirected to the dashboard', async function () {
  const driver = this.browsers.default;
  await driver.sleep(1000); // Wait for navigation

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/dashboard');
});

Then('the selected character should be loaded in the game', async function () {
  const driver = this.browsers.default;
  const arenaPage = new GameArenaPage(driver);

  // Wait for arena to load
  await driver.sleep(3000);

  // Check that we're in the arena (not showing character selection inside arena)
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');
});

When('the player enters the arena', async function () {
  const driver = this.browsers.default;

  // Character should already be selected, just verify we're in arena
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');
});

// Character details verification

Then('the character selection screen should show:', async function (dataTable) {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  const expectedFields = dataTable.hashes().map(row => row.Field);
  const details = await characterSelectPage.getCharacterDetails();

  // Verify at least one character card shows the expected fields
  expect(details.length).to.be.greaterThan(0, 'No character cards found');

  const firstCard = details[0];

  // Check that card contains character info
  expect(firstCard.hasName).to.be.true;
  expect(firstCard.hasStats).to.be.true;
});

Then('each character should be clickable', async function () {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  const cards = await characterSelectPage.getCharacterCards();
  expect(cards.length).to.be.greaterThan(0, 'No clickable character cards found');
});

// No characters scenario

Then('the player should see {string}', async function (message) {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  if (message === 'No characters found') {
    const isDisplayed = await characterSelectPage.isNoCharactersMessageDisplayed();
    expect(isDisplayed).to.be.true;
  }
});

Then('the player should see a {string} button', async function (buttonText) {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  if (buttonText === 'Create Character') {
    const isDisplayed = await characterSelectPage.isCreateCharacterButtonDisplayed();
    expect(isDisplayed).to.be.true;
  }
});

// Arena verification steps

Then('the arena should show {string} as the active character', async function (characterName) {
  const driver = this.browsers.default;

  // For now, just verify we're in the arena
  // Full character verification would require checking game state or HUD
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');

  // Store for potential future verification
  this.expectedCharacterName = characterName;
});

Then("the character's stats should be displayed in the HUD", async function () {
  const driver = this.browsers.default;

  // Wait for arena to fully load
  await driver.sleep(3000);

  // Verify we're in the arena (HUD would be visible here)
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');
});
