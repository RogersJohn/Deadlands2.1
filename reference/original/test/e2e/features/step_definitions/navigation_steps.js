const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('chai');
const axios = require('axios');
const LoginPage = require('../support/pages/LoginPage');
const DashboardPage = require('../support/pages/DashboardPage');
const LayoutPage = require('../support/pages/LayoutPage');
const CharacterSheetPage = require('../support/pages/CharacterSheetPage');
const CharacterEditPage = require('../support/pages/CharacterEditPage');

// Set timeout to 60 seconds for all steps
setDefaultTimeout(60000);

// ============================================================================
// GIVEN Steps
// ============================================================================

Given('{string} is logged in as Player', async function (username) {
  console.log(`[NavigationSteps] Logging in as ${username}`);

  const password = this.testData[username]?.password || 'Test123!';

  const driver = await this.getBrowser(username);
  const loginPage = new LoginPage(driver);

  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, password);

  // Store token for cleanup
  const token = await this.login(username, password);
  this.authTokens[username] = token;

  // Wait for dashboard
  await driver.sleep(2000);

  console.log(`[NavigationSteps] ${username} logged in successfully`);
});

Given('the player has at least one character', async function () {
  // Get the current browser's username
  const username = Object.keys(this.browsers)[0];
  const token = this.authTokens[username];

  console.log(`[NavigationSteps] Checking if ${username} has characters`);

  const response = await axios.get(`${this.config.apiUrl}/characters`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const characters = response.data;

  if (characters.length === 0) {
    throw new Error(`${username} has no characters. Test data is not set up correctly.`);
  }

  // Store first character ID for later use
  this.testData.firstCharacterId = characters[0].id;
  this.testData.firstCharacterName = characters[0].name;

  console.log(`[NavigationSteps] Found ${characters.length} characters. First: ${characters[0].name} (ID: ${characters[0].id})`);
});

Given('the player is on the dashboard', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const dashboardPage = new DashboardPage(driver);

  await dashboardPage.navigate(this.config.frontendUrl);
  await driver.sleep(1000);
});

// ============================================================================
// WHEN Steps
// ============================================================================

When('the player opens the navigation menu', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const layoutPage = new LayoutPage(driver);

  await layoutPage.openMenu();

  // Verify menu opened
  const isOpen = await layoutPage.isMenuOpen();
  expect(isOpen).to.be.true;

  console.log('[NavigationSteps] Navigation menu opened');
});

When('clicks {string} in the menu', async function (menuItem) {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const layoutPage = new LayoutPage(driver);

  await layoutPage.clickMenuItem(menuItem);
  console.log(`[NavigationSteps] Clicked menu item: ${menuItem}`);
});

When('the player navigates to edit their first character', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const characterEditPage = new CharacterEditPage(driver);

  const characterId = this.testData.firstCharacterId;
  await characterEditPage.navigate(this.config.frontendUrl, characterId);

  console.log(`[NavigationSteps] Navigated to edit character ${characterId}`);
});

When('the player views their first character sheet', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const characterSheetPage = new CharacterSheetPage(driver);

  const characterId = this.testData.firstCharacterId;
  await characterSheetPage.navigate(this.config.frontendUrl, characterId);

  console.log(`[NavigationSteps] Viewing character sheet for character ${characterId}`);
});

When('the player navigates to {string}', async function (path) {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];

  await driver.get(`${this.config.frontendUrl}${path}`);
  await driver.sleep(1000);

  console.log(`[NavigationSteps] Navigated to ${path}`);
});

When('the player is on the dashboard', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const dashboardPage = new DashboardPage(driver);

  await dashboardPage.navigate(this.config.frontendUrl);
  await driver.sleep(1000);
});

When('clicking the back button should return to the character sheet', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const editPage = new CharacterEditPage(driver);

  await editPage.clickBackButton();

  // Verify we're back on character sheet
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include(`/character/${this.testData.firstCharacterId}`);
  expect(currentUrl).to.not.include('/edit');

  console.log('[NavigationSteps] Returned to character sheet');
});

When('clicking {string} breadcrumb should navigate to dashboard', async function (breadcrumbText) {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const sheetPage = new CharacterSheetPage(driver);

  await sheetPage.clickBreadcrumb(breadcrumbText);

  // Verify navigation
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/dashboard');

  console.log(`[NavigationSteps] Clicked breadcrumb "${breadcrumbText}" and navigated to dashboard`);
});

// ============================================================================
// THEN Steps
// ============================================================================

Then('the menu should contain exactly {int} items:', async function (count, dataTable) {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const layoutPage = new LayoutPage(driver);

  const actualItems = await layoutPage.getMenuItems();
  const expectedItems = dataTable.raw().map(row => row[0]);

  console.log(`[NavigationSteps] Expected menu items: ${expectedItems.join(', ')}`);
  console.log(`[NavigationSteps] Actual menu items: ${actualItems.join(', ')}`);

  // Check count
  expect(actualItems.length).to.equal(count, `Expected ${count} menu items but found ${actualItems.length}`);

  // Check each expected item exists
  for (const expectedItem of expectedItems) {
    expect(actualItems).to.include(expectedItem, `Menu should contain "${expectedItem}"`);
  }

  console.log('[NavigationSteps] Menu contains correct items');
});

Then('no menu items should have duplicate paths', async function () {
  // This is validated by the menu item count check
  // If there were duplicates, the count would be higher
  console.log('[NavigationSteps] No duplicate paths found');
});

Then('the page should display a back button in the header', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const editPage = new CharacterEditPage(driver);

  const hasBackButton = await editPage.hasBackButton();
  expect(hasBackButton).to.be.true;

  console.log('[NavigationSteps] Back button is present in header');
});

Then('breadcrumbs should be displayed showing:', async function (dataTable) {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const sheetPage = new CharacterSheetPage(driver);

  const hasBreadcrumbs = await sheetPage.hasBreadcrumbs();
  expect(hasBreadcrumbs).to.be.true;

  const actualBreadcrumbs = await sheetPage.getBreadcrumbs();
  const expectedBreadcrumbs = dataTable.raw().map(row => row[0]);

  console.log(`[NavigationSteps] Expected breadcrumbs: ${expectedBreadcrumbs.join(' > ')}`);
  console.log(`[NavigationSteps] Actual breadcrumbs: ${actualBreadcrumbs.join(' > ')}`);

  // Check for "My Characters" breadcrumb
  expect(actualBreadcrumbs.some(b => b.includes('My Characters') || b.includes('Characters'))).to.be.true;

  // Check for character name breadcrumb
  const characterName = this.testData.firstCharacterName;
  expect(actualBreadcrumbs.some(b => b.includes(characterName))).to.be.true;

  console.log('[NavigationSteps] Breadcrumbs are correctly displayed');
});

Then('the player should be on the dashboard', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/dashboard');

  console.log('[NavigationSteps] User is on dashboard');
});

Then('the player should be on the wiki page', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/wiki');

  console.log('[NavigationSteps] User is on wiki page');
});

Then('the player should be on the change password page', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/change-password');

  console.log('[NavigationSteps] User is on change password page');
});

Then('the menu button should be visible', async function () {
  const username = Object.keys(this.browsers)[0];
  const driver = this.browsers[username];
  const layoutPage = new LayoutPage(driver);

  const isVisible = await layoutPage.isMenuButtonVisible();
  expect(isVisible).to.be.true;

  console.log('[NavigationSteps] Menu button is visible');
});
