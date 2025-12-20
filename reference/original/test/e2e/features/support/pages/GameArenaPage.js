const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class GameArenaPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Original Locators
    this.canvas = By.css('canvas');
    this.playerToken = By.css('[data-token-type="player-local"]');
    this.remoteToken = (username) => By.css(`[data-token-username="${username}"]`);
    this.wsStatusIndicator = By.css('[data-testid="ws-status"], .websocket-status');

    // XCOM UI Layout Locators
    // Top Bar
    this.topBar = By.css('[data-testid="top-bar"], .MuiBox-root:has(> [data-testid="settings-menu"])');
    this.arenaTitle = By.xpath('//p[contains(text(), "Deadlands Arena")]');
    this.turnIndicator = By.xpath('//p[contains(text(), "YOUR TURN") or contains(text(), "ENEMY TURN") or contains(text(), "VICTORY") or contains(text(), "DEFEAT")]');
    this.settingsGearIcon = By.css('[data-testid="SettingsIcon"], button:has(> [data-testid="SettingsIcon"])');

    // Settings Menu (dropdown)
    this.settingsMenu = By.css('[data-testid="settings-menu"], .settings-menu, [role="menu"]');
    this.cameraFollowRadio = By.css('input[value="follow"]');
    this.cameraManualRadio = By.css('input[value="manual"]');
    this.weaponRangesShowRadio = By.css('input[value="show"][name*="weapon"]');
    this.weaponRangesHideRadio = By.css('input[value="hide"][name*="weapon"]');
    this.movementRangesShowRadio = By.css('input[value="show"][name*="movement"]');
    this.movementRangesHideRadio = By.css('input[value="hide"][name*="movement"]');
    this.illuminationBright = By.css('input[value="BRIGHT"]');
    this.illuminationDim = By.css('input[value="DIM"]');
    this.illuminationDark = By.css('input[value="DARK"]');
    this.illuminationPitchBlack = By.css('input[value="PITCH_BLACK"]');

    // Game Canvas (main area)
    this.gameCanvasContainer = By.css('[data-testid="game-canvas-container"], .game-canvas-container');

    // Bottom Action Bar
    this.actionBar = By.css('[data-testid="action-bar"], .action-bar');
    this.characterPortrait = By.css('[data-testid="character-portrait"], .character-portrait');
    this.characterName = By.css('[data-testid="character-name"], .character-name');
    this.healthBar = By.css('[data-testid="health-bar"], .health-bar');
    this.healthText = By.css('[data-testid="health-text"], .health-text');
    this.woundsDisplay = By.css('[data-testid="wounds-display"], .wounds-display');
    this.movementBudgetText = By.css('[data-testid="movement-budget"], .movement-budget');
    this.movementBar = By.css('[data-testid="movement-bar"], .movement-bar');
    this.selectedWeaponDisplay = By.css('[data-testid="selected-weapon"], .selected-weapon');
    this.weaponSelector = By.css('[data-testid="weapon-selector"], .weapon-selector');
    this.actionsButton = By.css('[data-testid="actions-button"], button:has-text("Actions")');
    this.turnNumber = By.css('[data-testid="turn-number"], .turn-number');

    // Old sidebars (should NOT exist in new layout)
    this.leftSidebar = By.css('[data-testid="left-sidebar"], .left-sidebar');
    this.rightSidebar = By.css('[data-testid="right-sidebar"], .right-sidebar');

    // Character Selection (pre-game)
    this.characterSelectionGrid = By.css('[data-testid="character-selection"], .character-selection');
    this.characterCard = By.css('.character-card, [data-testid="character-card"]');
  }

  async navigate(baseUrl, sessionId) {
    await this.visit(`${baseUrl}/session/${sessionId}`);
    // Wait for canvas to load
    await this.waitForElement(this.canvas, 15000);
  }

  async isArenaLoaded() {
    const canvasPresent = await this.isElementPresent(this.canvas);
    if (!canvasPresent) return false;

    // Check if Phaser game is initialized
    const gameInitialized = await this.executeScript(`
      return window.game && window.game.scene && window.game.scene.isActive('ArenaScene');
    `);

    return gameInitialized;
  }

  async moveTokenTo(gridX, gridY) {
    // Get canvas element
    const canvas = await this.findElement(this.canvas);

    // Calculate pixel position from grid coordinates
    // Assuming TILE_SIZE = 32
    const TILE_SIZE = 32;
    const pixelX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const pixelY = gridY * TILE_SIZE + TILE_SIZE / 2;

    // Click on canvas at position
    const actions = this.driver.actions({ async: true });
    await actions.move({ origin: canvas, x: pixelX, y: pixelY }).click().perform();

    // Wait for movement animation
    await this.sleep(300);
  }

  async getPlayerTokenPosition() {
    const position = await this.executeScript(`
      const scene = window.game.scene.getScene('ArenaScene');
      if (scene && scene.player) {
        return {
          x: scene.playerGridX,
          y: scene.playerGridY
        };
      }
      return null;
    `);
    return position;
  }

  async getRemoteTokenPosition(username) {
    const position = await this.executeScript(`
      const scene = window.game.scene.getScene('ArenaScene');
      if (scene && scene.remotePlayerSprites) {
        for (const [tokenId, sprite] of scene.remotePlayerSprites.entries()) {
          const nameText = sprite.getData('nameText');
          if (nameText && nameText.text === '${username}') {
            // Get grid position from pixel position
            const TILE_SIZE = 32;
            const gridX = Math.floor((sprite.x - TILE_SIZE / 2) / TILE_SIZE);
            const gridY = Math.floor((sprite.y - TILE_SIZE / 2) / TILE_SIZE);
            return { x: gridX, y: gridY };
          }
        }
      }
      return null;
    `);
    return position;
  }

  async getRemoteTokenColor(username) {
    const color = await this.executeScript(`
      const scene = window.game.scene.getScene('ArenaScene');
      if (scene && scene.remotePlayerSprites) {
        for (const [tokenId, sprite] of scene.remotePlayerSprites.entries()) {
          const nameText = sprite.getData('nameText');
          if (nameText && nameText.text === '${username}') {
            return sprite.fillColor;
          }
        }
      }
      return null;
    `);
    return color;
  }

  async getRemoteTokenOpacity(username) {
    const opacity = await this.executeScript(`
      const scene = window.game.scene.getScene('ArenaScene');
      if (scene && scene.remotePlayerSprites) {
        for (const [tokenId, sprite] of scene.remotePlayerSprites.entries()) {
          const nameText = sprite.getData('nameText');
          if (nameText && nameText.text === '${username}') {
            return sprite.alpha;
          }
        }
      }
      return null;
    `);
    return opacity;
  }

  async getWebSocketStatus() {
    const status = await this.executeScript(`
      return window.websocketStatus || 'unknown';
    `);
    return status;
  }

  async isWebSocketConnected() {
    const consoleLogs = await this.getConsoleLogs();
    return consoleLogs.some(log => log.includes('WebSocket connected'));
  }

  async getRemoteTokenCount() {
    const count = await this.executeScript(`
      const scene = window.game.scene.getScene('ArenaScene');
      if (scene && scene.remotePlayerSprites) {
        return scene.remotePlayerSprites.size;
      }
      return 0;
    `);
    return count;
  }

  async waitForRemoteToken(username, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const position = await this.getRemoteTokenPosition(username);
      if (position !== null) {
        return true;
      }
      await this.sleep(200);
    }
    return false;
  }

  async makeRapidMovements(positions) {
    for (const pos of positions) {
      await this.moveTokenTo(pos.x, pos.y);
      await this.sleep(50); // Very short delay for "rapid" movements
    }
  }

  // ==================== XCOM UI Layout Test Methods ====================

  async isXCOMLayoutDisplayed() {
    const topBarPresent = await this.isElementPresent(this.topBar);
    const canvasPresent = await this.isElementPresent(this.canvas);
    const actionBarPresent = await this.isElementPresent(this.actionBar);
    return topBarPresent && canvasPresent && actionBarPresent;
  }

  async isTopBarVisible() {
    return await this.isElementVisible(this.topBar);
  }

  async getArenaTitle() {
    const element = await this.findElement(this.arenaTitle);
    return await element.getText();
  }

  async getTurnIndicatorText() {
    const element = await this.findElement(this.turnIndicator);
    return await element.getText();
  }

  async isSettingsGearIconVisible() {
    return await this.isElementVisible(this.settingsGearIcon);
  }

  async clickSettingsGear() {
    const element = await this.findElement(this.settingsGearIcon);
    await element.click();
    await this.sleep(300); // Wait for menu animation
  }

  async isSettingsMenuOpen() {
    return await this.isElementVisible(this.settingsMenu);
  }

  async selectCameraMode(mode) {
    // mode: "follow" or "manual"
    const radio = mode === 'follow' ? this.cameraFollowRadio : this.cameraManualRadio;
    const element = await this.findElement(radio);
    await element.click();
  }

  async toggleWeaponRanges(show) {
    // show: true for "Show", false for "Hide"
    const radio = show ? this.weaponRangesShowRadio : this.weaponRangesHideRadio;
    const element = await this.findElement(radio);
    await element.click();
  }

  async toggleMovementRanges(show) {
    // show: true for "Show", false for "Hide"
    const radio = show ? this.movementRangesShowRadio : this.movementRangesHideRadio;
    const element = await this.findElement(radio);
    await element.click();
  }

  async selectIllumination(level) {
    // level: "BRIGHT", "DIM", "DARK", or "PITCH_BLACK"
    const radioMap = {
      'BRIGHT': this.illuminationBright,
      'DIM': this.illuminationDim,
      'DARK': this.illuminationDark,
      'PITCH_BLACK': this.illuminationPitchBlack
    };
    const radio = radioMap[level];
    const element = await this.findElement(radio);
    await element.click();
  }

  async getCanvasHeight() {
    const canvas = await this.findElement(this.canvas);
    const size = await canvas.getSize();
    return size.height;
  }

  async getViewportHeight() {
    return await this.executeScript('return window.innerHeight');
  }

  async getCanvasScreenPercentage() {
    const canvasHeight = await this.getCanvasHeight();
    const viewportHeight = await this.getViewportHeight();
    return (canvasHeight / viewportHeight) * 100;
  }

  async isActionBarVisible() {
    return await this.isElementVisible(this.actionBar);
  }

  async getCharacterPortraitSrc() {
    const portrait = await this.findElement(this.characterPortrait);
    return await portrait.getAttribute('src');
  }

  async getCharacterName() {
    const nameElement = await this.findElement(this.characterName);
    return await nameElement.getText();
  }

  async getHealthText() {
    const healthElement = await this.findElement(this.healthText);
    return await healthElement.getText();
  }

  async getWoundsCount() {
    const woundsElement = await this.findElement(this.woundsDisplay);
    const text = await woundsElement.getText();
    // Extract number from text like "Wounds: 2"
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async getMovementBudgetText() {
    const movementElement = await this.findElement(this.movementBudgetText);
    return await movementElement.getText();
  }

  async getSelectedWeaponName() {
    const weaponElement = await this.findElement(this.selectedWeaponDisplay);
    return await weaponElement.getText();
  }

  async clickWeaponSelector() {
    const selector = await this.findElement(this.weaponSelector);
    await selector.click();
    await this.sleep(200);
  }

  async clickActionsButton() {
    const button = await this.findElement(this.actionsButton);
    await button.click();
  }

  async getTurnNumber() {
    const turnElement = await this.findElement(this.turnNumber);
    const text = await turnElement.getText();
    // Extract number from text like "Turn 3"
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async areOldSidebarsPresent() {
    const leftPresent = await this.isElementPresent(this.leftSidebar);
    const rightPresent = await this.isElementPresent(this.rightSidebar);
    return leftPresent || rightPresent;
  }

  async isCharacterSelectionVisible() {
    return await this.isElementVisible(this.characterSelectionGrid);
  }

  async selectCharacter(index = 0) {
    const cards = await this.driver.findElements(this.characterCard);
    if (cards.length > index) {
      await cards[index].click();
      await this.sleep(1000); // Wait for character to load
    }
  }

  async getHealthBarColor() {
    const healthBar = await this.findElement(this.healthBar);
    const bgColor = await healthBar.getCssValue('background-color');
    return bgColor;
  }

  async clickOutsideSettingsMenu() {
    // Click on the canvas to close the menu
    const canvas = await this.findElement(this.canvas);
    await canvas.click();
    await this.sleep(300);
  }

  async waitForXCOMLayout(timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const isDisplayed = await this.isXCOMLayoutDisplayed();
      if (isDisplayed) {
        return true;
      }
      await this.sleep(500);
    }
    return false;
  }

  /**
   * Get the turn number from CombatHUD
   * @returns {Promise<number>}
   */
  async getCombatHUDTurn() {
    try {
      const turnText = await this.executeScript(`
        // Look for CombatHUD turn display
        const combatHUD = Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent.includes('Turn') && el.textContent.match(/Turn\\s+(\\d+)/)
        );

        if (combatHUD) {
          const match = combatHUD.textContent.match(/Turn\\s+(\\d+)/);
          return match ? parseInt(match[1]) : 1;
        }
        return 1;
      `);
      return turnText;
    } catch (error) {
      console.warn('Failed to get CombatHUD turn:', error.message);
      return 1;
    }
  }

  /**
   * Get the phase text from CombatHUD
   * @returns {Promise<string>}
   */
  async getCombatHUDPhase() {
    try {
      const phaseText = await this.executeScript(`
        // Look for CombatHUD phase display
        const phaseElement = Array.from(document.querySelectorAll('*')).find(el =>
          el.textContent === 'YOUR TURN' ||
          el.textContent === 'ENEMY TURN' ||
          el.textContent === 'VICTORY!' ||
          el.textContent === 'DEFEAT' ||
          el.textContent.toLowerCase().includes('resolution')
        );

        if (phaseElement) {
          return phaseElement.textContent;
        }
        return 'YOUR TURN';
      `);
      return phaseText;
    } catch (error) {
      console.warn('Failed to get CombatHUD phase:', error.message);
      return 'YOUR TURN';
    }
  }
}

module.exports = GameArenaPage;
