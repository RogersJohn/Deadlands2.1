const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

/**
 * Page Object for GM Control Panel component
 *
 * The GM Control Panel is only visible to users with GAME_MASTER role.
 * It provides game state information and controls for:
 * - Viewing current map, turn number, and token count
 * - Changing the map (clears all tokens)
 * - Resetting the game state
 */
class GMControlPanelPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Main panel container - look for the draggable panel with gold border containing Combat section
    // The GM Control Panel has a gold border (#d4af37) and contains "Combat" or "Savage Worlds Initiative"
    this.panel = By.xpath('//div[contains(@style, "gold") or contains(@style, "d4af37")]//ancestor::div[contains(@class, "MuiPaper")] | //div[contains(text(), "Combat") and contains(text(), "Savage")]//ancestor::div[contains(@class, "MuiPaper")]');

    // Game state display elements
    this.currentMapDisplay = By.xpath('//*[contains(text(), "Map:")]/following-sibling::*[1]');
    this.turnNumberDisplay = By.xpath('//*[contains(text(), "Turn:")]/following-sibling::*[1]');
    this.tokenCountDisplay = By.xpath('//*[contains(text(), "Tokens:")]/following-sibling::*[1]');

    // Map change controls
    this.changeMapButton = By.xpath('//button[contains(text(), "Change Map")]');
    this.mapNameInput = By.css('input[placeholder*="map" i], input[placeholder*="Enter map"]');
    this.confirmMapChangeButton = By.xpath('//button[contains(text(), "Confirm")]');
    this.cancelMapChangeButton = By.xpath('//button[contains(text(), "Cancel")]');

    // Game reset controls
    this.resetGameButton = By.xpath('//button[contains(text(), "Reset Game")]');
    this.confirmResetButton = By.xpath('//button[contains(text(), "Yes, Reset") or contains(text(), "Confirm")]');
    this.cancelResetButton = By.xpath('//button[contains(text(), "Cancel")]');

    // Turn management controls
    this.endTurnButton = By.xpath('//button[contains(text(), "End Turn")]');

    // Combat controls (Savage Worlds initiative)
    this.startCombatButton = By.xpath('//button[contains(text(), "Start Combat")]');
    this.dealCardsButton = By.xpath('//button[contains(text(), "Deal Cards")]');
    this.endCombatButton = By.xpath('//button[contains(text(), "End Combat")]');
    this.forceNewRoundButton = By.xpath('//button[contains(text(), "Force New Round")]');
    this.npcInput = By.css('input[placeholder*="Bandit"], input[placeholder*="NPC"], input[placeholder*="comma"]');
    this.combatStatusDisplay = By.xpath('//*[contains(text(), "Round") or contains(text(), "No Combat")]');

    // Confirmation dialog
    this.confirmDialogYes = By.xpath('//button[contains(text(), "Yes")]');
    this.confirmDialogNo = By.xpath('//button[contains(text(), "No") or contains(text(), "Cancel")]');

    // Notification toast
    this.notification = By.css('[data-testid="notification"], .notification, [role="alert"], [class*="Snackbar"]');
  }

  /**
   * Check if GM Control Panel is visible
   * @returns {Promise<boolean>}
   */
  async isVisible() {
    return await this.isElementPresent(this.panel, 5000);
  }

  /**
   * Wait for panel to be visible
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async waitForPanel(timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        // Check if the Combat section exists in the page
        const hasCombatSection = await this.executeScript(`
          const body = document.body.textContent;
          return body.includes('Combat') &&
                 (body.includes('Savage Worlds Initiative') || body.includes('Start Combat') || body.includes('No Combat'));
        `);
        if (hasCombatSection) {
          return true;
        }
      } catch (e) {
        // Continue waiting
      }
      await this.sleep(500);
    }
    return false;
  }

  /**
   * Get the current map name displayed
   * @returns {Promise<string|null>}
   */
  async getCurrentMap() {
    try {
      // Try multiple approaches to find the map name
      const mapText = await this.executeScript(`
        const panel = document.querySelector('[data-testid="gm-control-panel"]') ||
                     document.querySelector('.gm-control-panel') ||
                     Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Map:'));

        if (panel) {
          const mapLine = panel.textContent.split('\\n').find(line => line.includes('Map:'));
          if (mapLine) {
            const mapName = mapLine.replace('Map:', '').trim();
            return mapName === 'No map set' ? null : mapName;
          }
        }
        return null;
      `);
      return mapText;
    } catch (error) {
      console.warn('Failed to get current map:', error.message);
      return null;
    }
  }

  /**
   * Get the current turn number
   * @returns {Promise<number>}
   */
  async getTurnNumber() {
    try {
      const turnText = await this.executeScript(`
        const panel = document.querySelector('[data-testid="gm-control-panel"]') ||
                     document.querySelector('.gm-control-panel') ||
                     Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Turn:'));

        if (panel) {
          const turnLine = panel.textContent.split('\\n').find(line => line.includes('Turn:'));
          if (turnLine) {
            const match = turnLine.match(/Turn: (\\d+)/);
            return match ? parseInt(match[1]) : 1;
          }
        }
        return 1;
      `);
      return turnText;
    } catch (error) {
      console.warn('Failed to get turn number:', error.message);
      return 1;
    }
  }

  /**
   * Get the number of tokens on the map
   * @returns {Promise<number>}
   */
  async getTokenCount() {
    try {
      const tokenCount = await this.executeScript(`
        const panel = document.querySelector('[data-testid="gm-control-panel"]') ||
                     document.querySelector('.gm-control-panel') ||
                     Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Tokens:'));

        if (panel) {
          const tokenLine = panel.textContent.split('\\n').find(line => line.includes('Tokens:'));
          if (tokenLine) {
            const match = tokenLine.match(/(\\d+) on map/);
            return match ? parseInt(match[1]) : 0;
          }
        }
        return 0;
      `);
      return tokenCount;
    } catch (error) {
      console.warn('Failed to get token count:', error.message);
      return 0;
    }
  }

  /**
   * Click the "Change Map" button
   */
  async clickChangeMap() {
    const button = await this.findElement(this.changeMapButton);
    await button.click();
    await this.sleep(300);
  }

  /**
   * Enter a new map name in the input field
   * @param {string} mapName
   */
  async enterMapName(mapName) {
    const input = await this.findElement(this.mapNameInput);
    await input.clear();
    await input.sendKeys(mapName);
  }

  /**
   * Click confirm button for map change
   */
  async confirmMapChange() {
    const button = await this.findElement(this.confirmMapChangeButton);
    await button.click();
    await this.sleep(500); // Wait for change to process
  }

  /**
   * Click cancel button for map change
   */
  async cancelMapChange() {
    const button = await this.findElement(this.cancelMapChangeButton);
    await button.click();
    await this.sleep(300);
  }

  /**
   * Complete map change workflow
   * @param {string} mapName
   * @returns {Promise<boolean>} True if successful
   */
  async changeMap(mapName) {
    try {
      await this.clickChangeMap();
      await this.enterMapName(mapName);
      await this.confirmMapChange();

      // Wait for notification
      await this.waitForNotification(5000);

      return true;
    } catch (error) {
      console.error('Failed to change map:', error.message);
      return false;
    }
  }

  /**
   * Click the "Reset Game" button
   */
  async clickResetGame() {
    const button = await this.findElement(this.resetGameButton);
    await button.click();
    await this.sleep(300);
  }

  /**
   * Click confirm button for game reset
   */
  async confirmReset() {
    const button = await this.findElement(this.confirmResetButton);
    await button.click();
    await this.sleep(500); // Wait for reset to process
  }

  /**
   * Click cancel button for game reset
   */
  async cancelReset() {
    const button = await this.findElement(this.cancelResetButton);
    await button.click();
    await this.sleep(300);
  }

  /**
   * Complete game reset workflow
   * @returns {Promise<boolean>} True if successful
   */
  async resetGame() {
    try {
      await this.clickResetGame();
      await this.confirmReset();

      // Wait for notification
      await this.waitForNotification(5000);

      return true;
    } catch (error) {
      console.error('Failed to reset game:', error.message);
      return false;
    }
  }

  /**
   * Wait for notification toast to appear
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async waitForNotification(timeout = 5000) {
    try {
      await this.waitForElement(this.notification, timeout);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the notification message
   * @returns {Promise<string|null>}
   */
  async getNotificationMessage() {
    try {
      const element = await this.findElement(this.notification);
      return await element.getText();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a notification contains specific text
   * @param {string} expectedText
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async waitForNotificationContaining(expectedText, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const message = await this.getNotificationMessage();
      if (message && message.includes(expectedText)) {
        return true;
      }
      await this.sleep(200);
    }
    return false;
  }

  /**
   * Get full game state info from panel
   * @returns {Promise<{map: string, turn: number, tokenCount: number}>}
   */
  async getGameState() {
    return {
      map: await this.getCurrentMap(),
      turn: await this.getTurnNumber(),
      tokenCount: await this.getTokenCount()
    };
  }

  /**
   * Get the current turn phase
   * @returns {Promise<string>}
   */
  async getTurnPhase() {
    try {
      const phaseText = await this.executeScript(`
        const panel = document.querySelector('[data-testid="gm-control-panel"]') ||
                     document.querySelector('.gm-control-panel') ||
                     Array.from(document.querySelectorAll('div')).find(d => d.textContent.includes('Turn:'));

        if (panel) {
          const turnLine = panel.textContent.split('\\n').find(line => line.includes('Turn:'));
          if (turnLine) {
            // Extract phase from "Turn: 1 (player phase)" or "Turn: 1 (enemy phase)"
            const match = turnLine.match(/\\((\\w+) phase\\)/) || turnLine.match(/\\((\\w+)\\)/);
            return match ? match[1] : 'player';
          }
        }
        return 'player';
      `);
      return phaseText;
    } catch (error) {
      console.warn('Failed to get turn phase:', error.message);
      return 'player';
    }
  }

  /**
   * Click the "End Turn" button
   */
  async clickEndTurn() {
    const button = await this.findElement(this.endTurnButton);
    await button.click();
    await this.sleep(500); // Wait for turn advancement
  }

  /**
   * Check if End Turn button is visible
   * @returns {Promise<boolean>}
   */
  async isEndTurnButtonVisible() {
    return await this.isElementPresent(this.endTurnButton, 3000);
  }

  /**
   * Check if End Turn button is disabled
   * @returns {Promise<boolean>}
   */
  async isEndTurnButtonDisabled() {
    try {
      const button = await this.findElement(this.endTurnButton);
      const isDisabled = await button.getAttribute('disabled');
      return isDisabled !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the text displayed on the End Turn button
   * @returns {Promise<string>}
   */
  async getEndTurnButtonText() {
    try {
      const button = await this.findElement(this.endTurnButton);
      return await button.getText();
    } catch (error) {
      return '';
    }
  }

  /**
   * Get notification text
   * @returns {Promise<string>}
   */
  async getNotificationText() {
    return await this.getNotificationMessage();
  }

  // ==================== COMBAT METHODS ====================

  /**
   * Check if Combat section is visible
   * @returns {Promise<boolean>}
   */
  async hasCombatSection() {
    try {
      const hasCombat = await this.executeScript(`
        const panel = document.body;
        return panel.textContent.includes('Combat') &&
               panel.textContent.includes('Savage Worlds Initiative');
      `);
      return hasCombat;
    } catch (error) {
      console.warn('Failed to check combat section:', error.message);
      return false;
    }
  }

  /**
   * Get the current combat status
   * @returns {Promise<string>}
   */
  async getCombatStatus() {
    try {
      const status = await this.executeScript(`
        const bodyText = document.body.textContent;
        if (bodyText.includes('No Combat')) return 'No Combat';
        const roundMatch = bodyText.match(/Round (\\d+)/);
        if (roundMatch) return 'Round ' + roundMatch[1];
        return 'Unknown';
      `);
      return status;
    } catch (error) {
      console.warn('Failed to get combat status:', error.message);
      return 'Unknown';
    }
  }

  /**
   * Click the Start Combat button
   */
  async clickStartCombat() {
    try {
      await this.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const startBtn = buttons.find(btn => btn.textContent.includes('Start Combat'));
        if (startBtn) startBtn.click();
      `);
      await this.sleep(300);
    } catch (error) {
      console.error('Failed to click Start Combat:', error.message);
      throw error;
    }
  }

  /**
   * Enter NPC names in the input field
   * @param {string} npcNames - Comma-separated NPC names
   */
  async enterNPCNames(npcNames) {
    try {
      await this.executeScript(`
        const inputs = document.querySelectorAll('input');
        const npcInput = Array.from(inputs).find(input =>
          input.placeholder &&
          (input.placeholder.toLowerCase().includes('bandit') ||
           input.placeholder.toLowerCase().includes('npc') ||
           input.placeholder.toLowerCase().includes('comma'))
        );
        if (npcInput) {
          npcInput.value = '${npcNames}';
          npcInput.dispatchEvent(new Event('input', { bubbles: true }));
          npcInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await this.sleep(200);
    } catch (error) {
      console.error('Failed to enter NPC names:', error.message);
      throw error;
    }
  }

  /**
   * Click the Deal Cards button
   */
  async clickDealCards() {
    try {
      const result = await this.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const dealBtn = buttons.find(btn => btn.textContent.includes('Deal Cards'));
        if (dealBtn && !dealBtn.disabled) {
          dealBtn.click();
          return { clicked: true, buttonText: dealBtn.textContent };
        }
        return { clicked: false, buttonTexts: buttons.map(b => b.textContent.substring(0, 30)) };
      `);
      console.log('Deal Cards click result:', result);
      await this.sleep(2000); // Wait for combat to start
    } catch (error) {
      console.error('Failed to click Deal Cards:', error.message);
      throw error;
    }
  }

  /**
   * Start combat with NPC names (complete workflow)
   * @param {string} npcNames - Comma-separated NPC names
   */
  async startCombatWithNPCs(npcNames) {
    await this.clickStartCombat();
    await this.enterNPCNames(npcNames);
    await this.clickDealCards();
  }

  /**
   * Click the End Combat button
   */
  async clickEndCombat() {
    try {
      await this.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const endBtn = buttons.find(btn => btn.textContent.includes('End Combat'));
        if (endBtn) endBtn.click();
      `);
      await this.sleep(300);
    } catch (error) {
      console.error('Failed to click End Combat:', error.message);
      throw error;
    }
  }

  /**
   * Confirm ending combat in the dialog
   */
  async confirmEndCombat() {
    try {
      await this.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmBtn = buttons.find(btn =>
          btn.textContent.includes('Yes') ||
          btn.textContent.includes('Confirm')
        );
        if (confirmBtn) confirmBtn.click();
      `);
      await this.sleep(500);
    } catch (error) {
      console.error('Failed to confirm end combat:', error.message);
      throw error;
    }
  }

  /**
   * End combat completely (click End Combat + confirm)
   */
  async endCombat() {
    await this.clickEndCombat();
    await this.confirmEndCombat();
  }

  /**
   * Click the Force New Round button
   */
  async clickForceNewRound() {
    try {
      await this.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const newRoundBtn = buttons.find(btn => btn.textContent.includes('Force New Round'));
        if (newRoundBtn) newRoundBtn.click();
      `);
      await this.sleep(500);
    } catch (error) {
      console.error('Failed to click Force New Round:', error.message);
      throw error;
    }
  }

  /**
   * Click the End Turn button for active combatant
   */
  async clickEndTurnForActive() {
    try {
      const clicked = await this.executeScript(`
        const buttons = Array.from(document.querySelectorAll('button'));
        const endTurnBtn = buttons.find(btn =>
          btn.textContent.includes('End') &&
          (btn.textContent.includes('Turn') || btn.textContent.includes("'s"))
        );
        if (endTurnBtn && !endTurnBtn.disabled) {
          endTurnBtn.click();
          return true;
        }
        return false;
      `);
      if (!clicked) {
        throw new Error('Could not find or click End Turn button');
      }
      await this.sleep(500);
    } catch (error) {
      console.error('Failed to click End Turn:', error.message);
      throw error;
    }
  }

  /**
   * Check if NPC input field is visible
   * @returns {Promise<boolean>}
   */
  async hasNPCInput() {
    try {
      const hasInput = await this.executeScript(`
        const inputs = document.querySelectorAll('input');
        return Array.from(inputs).some(input =>
          input.placeholder &&
          (input.placeholder.toLowerCase().includes('bandit') ||
           input.placeholder.toLowerCase().includes('npc') ||
           input.placeholder.toLowerCase().includes('comma'))
        );
      `);
      return hasInput;
    } catch (error) {
      console.warn('Failed to check NPC input:', error.message);
      return false;
    }
  }

  /**
   * Check if confirmation prompt is visible
   * @returns {Promise<boolean>}
   */
  async hasConfirmationPrompt() {
    try {
      const hasPrompt = await this.executeScript(`
        return document.body.textContent.includes('End combat') ||
               document.body.textContent.includes('clear initiative') ||
               document.body.textContent.includes('Yes, End');
      `);
      return hasPrompt;
    } catch (error) {
      console.warn('Failed to check confirmation prompt:', error.message);
      return false;
    }
  }

  /**
   * Wait for combat to start (Round 1)
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async waitForCombatStart(timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.getCombatStatus();
      if (status.includes('Round')) {
        return true;
      }
      await this.sleep(500);
    }
    return false;
  }

  /**
   * Wait for a specific round
   * @param {number} roundNumber
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async waitForRound(roundNumber, timeout = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.getCombatStatus();
      if (status === `Round ${roundNumber}`) {
        return true;
      }
      await this.sleep(500);
    }
    return false;
  }
}

module.exports = GMControlPanelPage;
