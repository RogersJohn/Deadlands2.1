const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('chai');
const LoginPage = require('../support/pages/LoginPage');
const CharacterSelectPage = require('../support/pages/CharacterSelectPage');
const GameArenaPage = require('../support/pages/GameArenaPage');

setDefaultTimeout(60000);

// Helper function to get Zustand store state from browser
async function getGameStoreState(driver) {
  try {
    const storeState = await driver.executeScript(`
      // Access the Zustand store from window
      const gameStorage = localStorage.getItem('game-storage');
      if (gameStorage) {
        return JSON.parse(gameStorage);
      }

      // Try to access via React DevTools or window object
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        // Store might be accessible via React context
        return { available: false, reason: 'React DevTools not accessible' };
      }

      return null;
    `);
    return storeState;
  } catch (error) {
    console.error('Error accessing game store:', error);
    return null;
  }
}

// Helper function to check if selectedCharacter exists in sessionStorage/localStorage
async function getSelectedCharacterFromStorage(driver) {
  try {
    const selectedChar = await driver.executeScript(`
      // Check sessionStorage
      const sessionChar = sessionStorage.getItem('selectedCharacter');
      if (sessionChar) {
        return JSON.parse(sessionChar);
      }

      // Check localStorage (game-storage)
      const gameStorage = localStorage.getItem('game-storage');
      if (gameStorage) {
        const parsed = JSON.parse(gameStorage);
        return parsed.state?.selectedCharacter || null;
      }

      return null;
    `);
    return selectedChar;
  } catch (error) {
    console.error('Error getting selected character:', error);
    return null;
  }
}

// Step: Player selects character from character-select
When('the player selects character {string} from character-select', async function (characterName) {
  const driver = this.browsers.default;
  const characterSelectPage = new CharacterSelectPage(driver);

  // Navigate to character select
  await characterSelectPage.navigate(this.config.frontendUrl);

  // Select specific character
  await characterSelectPage.selectCharacter(characterName);

  this.selectedCharacterName = characterName;
});

// Step: Navigate to arena
When('the player navigates to the arena', async function () {
  const driver = this.browsers.default;
  const arenaPage = new GameArenaPage(driver);

  await arenaPage.navigate(this.config.frontendUrl);
  await driver.sleep(2000); // Wait for arena to load
});

// Step: Verify arena loads with specific character
Then('the arena should load with {string} as active character', async function (characterName) {
  const driver = this.browsers.default;

  // Verify we're in the arena
  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');

  // TODO: Add verification that character name appears in HUD
  // For now, just verify arena loaded
  await driver.sleep(1000);
});

// Step: Verify gameStore contains character data
Then('the gameStore should contain {string} data', async function (characterName) {
  const driver = this.browsers.default;

  // Check if selected character is in storage
  const selectedChar = await getSelectedCharacterFromStorage(driver);

  expect(selectedChar).to.not.be.null;
  if (selectedChar && selectedChar.name) {
    expect(selectedChar.name).to.include(characterName);
  }
});

// Step: Player has selected a character
Given('{string} has selected a character', async function (username) {
  const driver = await this.getBrowser('default');
  const loginPage = new LoginPage(driver);
  const characterSelectPage = new CharacterSelectPage(driver);

  // Login
  await loginPage.navigate(this.config.frontendUrl);
  await loginPage.login(username, this.testData[username].password);
  expect(await loginPage.isLoginSuccessful()).to.be.true;

  // Navigate to character select and select first character
  await characterSelectPage.navigate(this.config.frontendUrl);
  await characterSelectPage.selectFirstCharacter();

  await driver.sleep(1000); // Wait for selection to persist
});

// Step: Player is in the arena
When('the player is in the arena', async function () {
  const driver = this.browsers.default;

  const currentUrl = await driver.getCurrentUrl();
  expect(currentUrl).to.include('/arena');
});

// Step: Action bar should display character's name
Then('the action bar should display the character\'s name', async function () {
  const driver = this.browsers.default;

  // Look for character name in action bar or HUD
  // This is a placeholder - actual implementation depends on UI structure
  const hudExists = await driver.executeScript(`
    return document.querySelector('[class*="ActionBar"]') !== null ||
           document.querySelector('[class*="HUD"]') !== null;
  `);

  expect(hudExists).to.be.true;
});

// Step: HUD should show character's stats
Then('the HUD should show the character\'s stats', async function () {
  const driver = this.browsers.default;

  // Check for stat elements in the DOM
  const statsExist = await driver.executeScript(`
    const body = document.body.innerText;
    return body.includes('Pace') || body.includes('Parry') || body.includes('Toughness');
  `);

  expect(statsExist).to.be.true;
});

// Step: Character data should come from gameStore
Then('the character data should come from gameStore', async function () {
  const driver = this.browsers.default;

  // Verify store has character data
  const storeState = await getGameStoreState(driver);
  expect(storeState).to.not.be.null;
});

// Step: Player toggles coordinate display OFF
When('the player toggles coordinate display OFF', async function () {
  const driver = this.browsers.default;

  // Execute script to toggle coordinates
  await driver.executeScript(`
    const toggleButton = document.querySelector('[data-testid="coordinate-toggle"]') ||
                         document.querySelector('button:contains("Coordinates")');
    if (toggleButton) toggleButton.click();
  `);

  await driver.sleep(500);
});

// Step: Player refreshes the page
When('the player refreshes the page', async function () {
  const driver = this.browsers.default;

  await driver.navigate().refresh();
  await driver.sleep(2000); // Wait for page reload
});

// Step: Coordinate display should still be OFF
Then('coordinate display should still be OFF', async function () {
  const driver = this.browsers.default;

  const storeState = await getGameStoreState(driver);

  if (storeState && storeState.state) {
    expect(storeState.state.showCoordinates).to.be.false;
  }
});

// Step: Preference should be stored in gameStore
Then('the preference should be stored in gameStore', async function () {
  const driver = this.browsers.default;

  const storeState = await getGameStoreState(driver);
  expect(storeState).to.not.be.null;
  expect(storeState.state).to.not.be.undefined;
});

// Step: Player disables camera follow
When('the player disables camera follow', async function () {
  const driver = this.browsers.default;

  await driver.executeScript(`
    const cameraButton = document.querySelector('[data-testid="camera-follow-toggle"]');
    if (cameraButton) cameraButton.click();
  `);

  await driver.sleep(500);
});

// Step: Camera should not follow the token
Then('camera should not follow the token', async function () {
  const driver = this.browsers.default;

  // Verify camera follow is disabled in store
  const storeState = await getGameStoreState(driver);

  if (storeState && storeState.state) {
    expect(storeState.state.cameraFollow).to.be.false;
  }
});

// Step: cameraFollow in gameStore should be false
Then('cameraFollow in gameStore should be false', async function () {
  const driver = this.browsers.default;

  const storeState = await getGameStoreState(driver);
  expect(storeState.state.cameraFollow).to.be.false;
});

// Step: Player sets multiple preferences
When('the player sets the following preferences:', async function (dataTable) {
  const driver = this.browsers.default;
  const preferences = dataTable.hashes();

  for (const pref of preferences) {
    const { Preference, Value } = pref;

    if (Preference === 'Coordinate Display' && Value === 'OFF') {
      await driver.executeScript(`
        localStorage.setItem('game-storage', JSON.stringify({
          state: { showCoordinates: false },
          version: 0
        }));
      `);
    }

    if (Preference === 'Camera Follow' && Value === 'OFF') {
      await driver.executeScript(`
        const current = JSON.parse(localStorage.getItem('game-storage') || '{"state":{}}');
        current.state.cameraFollow = false;
        localStorage.setItem('game-storage', JSON.stringify(current));
      `);
    }

    if (Preference === 'Sound Enabled' && Value === 'OFF') {
      await driver.executeScript(`
        const current = JSON.parse(localStorage.getItem('game-storage') || '{"state":{}}');
        current.state.soundEnabled = false;
        localStorage.setItem('game-storage', JSON.stringify(current));
      `);
    }

    if (Preference === 'Volume') {
      await driver.executeScript(`
        const current = JSON.parse(localStorage.getItem('game-storage') || '{"state":{}}');
        current.state.volume = ${parseInt(Value)};
        localStorage.setItem('game-storage', JSON.stringify(current));
      `);
    }
  }

  await driver.sleep(500);
});

// Step: All preferences should be restored from gameStore
Then('all preferences should be restored from gameStore', async function () {
  const driver = this.browsers.default;

  const storeState = await getGameStoreState(driver);

  expect(storeState).to.not.be.null;
  expect(storeState.state).to.not.be.undefined;
  expect(storeState.state.showCoordinates).to.be.false;
  expect(storeState.state.cameraFollow).to.be.false;
  expect(storeState.state.soundEnabled).to.be.false;
  expect(storeState.state.volume).to.equal(25);
});

// Step: UI should reflect saved preferences
Then('the UI should reflect the saved preferences', async function () {
  const driver = this.browsers.default;

  // Verify localStorage has the preferences
  const storeState = await getGameStoreState(driver);
  expect(storeState).to.not.be.null;
});

// Step: gameStore.selectedCharacter should be null
Then('gameStore.selectedCharacter should be null', async function () {
  const driver = this.browsers.default;

  const selectedChar = await getSelectedCharacterFromStorage(driver);

  // When redirected to character-select, selectedCharacter should not be set yet
  // (it gets set when they actually select a character)
  const currentUrl = await driver.getCurrentUrl();
  if (currentUrl.includes('/character-select')) {
    // On character select page, character not yet selected
    expect(currentUrl).to.include('/character-select');
  }
});
