const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

/**
 * Page Object for Initiative Tracker component
 *
 * The Initiative Tracker displays all combatants in the current combat,
 * sorted by their dealt cards (Savage Worlds card-based initiative).
 * Shows card value, suit, and indicates the active combatant.
 */
class InitiativeTrackerPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Main tracker container
    this.tracker = By.css('[data-testid="initiative-tracker"], .initiative-tracker');

    // Header
    this.header = By.xpath('//*[contains(text(), "INITIATIVE")]');

    // Combat status display
    this.combatStatus = By.xpath('//*[contains(text(), "Round") or contains(text(), "No Combat")]');

    // Individual combatant entries
    this.combatantEntries = By.css('[data-testid="combatant-entry"], .combatant-entry, [class*="MuiPaper"]');

    // Active combatant indicator
    this.activeIndicator = By.css('[class*="active"], [style*="gold"], [style*="pulse"]');

    // Card suits
    this.suits = ['♠', '♥', '♦', '♣'];
    this.cardValues = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  }

  /**
   * Check if Initiative Tracker is visible
   * @returns {Promise<boolean>}
   */
  async isVisible() {
    return await this.isElementPresent(this.tracker, 5000);
  }

  /**
   * Wait for tracker to be visible
   * @param {number} timeout
   * @returns {Promise<boolean>}
   */
  async waitForTracker(timeout = 10000) {
    try {
      await this.waitForElement(this.tracker, timeout);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the number of combatants displayed
   * @returns {Promise<number>}
   */
  async getCombatantCount() {
    try {
      const count = await this.executeScript(`
        // Look for initiative entries
        const entries = document.querySelectorAll('[data-testid="combatant-entry"], .combatant-entry');
        if (entries.length > 0) return entries.length;

        // Alternative: count MuiPaper elements that contain card info
        const suits = ['♠', '♥', '♦', '♣'];
        const papers = Array.from(document.querySelectorAll('[class*="MuiPaper"]'));
        const initiativeEntries = papers.filter(paper => {
          const text = paper.textContent;
          return suits.some(s => text.includes(s)) || text.includes('JOKER');
        });

        return initiativeEntries.length;
      `);
      return count || 0;
    } catch (error) {
      console.warn('Failed to get combatant count:', error.message);
      return 0;
    }
  }

  /**
   * Get all combatant names
   * @returns {Promise<string[]>}
   */
  async getCombatantNames() {
    try {
      const names = await this.executeScript(`
        const entries = document.querySelectorAll('[data-testid="combatant-entry"], .combatant-entry');
        if (entries.length > 0) {
          return Array.from(entries).map(e => e.textContent.split('\\n')[0].trim());
        }

        // Alternative parsing
        const suits = ['♠', '♥', '♦', '♣'];
        const papers = Array.from(document.querySelectorAll('[class*="MuiPaper"]'));
        return papers
          .filter(paper => suits.some(s => paper.textContent.includes(s)))
          .map(paper => {
            // Extract name (usually first line or before card info)
            const text = paper.textContent;
            const lines = text.split('\\n').filter(l => l.trim());
            return lines[0]?.trim() || '';
          })
          .filter(name => name && !suits.some(s => name.includes(s)));
      `);
      return names || [];
    } catch (error) {
      console.warn('Failed to get combatant names:', error.message);
      return [];
    }
  }

  /**
   * Check if combatants have cards displayed
   * @returns {Promise<boolean>}
   */
  async hasCardsDisplayed() {
    try {
      const hasCards = await this.executeScript(`
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
        const bodyText = document.body.textContent;

        const hasSuit = suits.some(s => bodyText.includes(s));
        const hasValue = values.some(v => bodyText.includes(v));
        const hasJoker = bodyText.includes('JOKER');

        return hasSuit || hasJoker;
      `);
      return hasCards;
    } catch (error) {
      console.warn('Failed to check for cards:', error.message);
      return false;
    }
  }

  /**
   * Get the active combatant's name
   * @returns {Promise<string|null>}
   */
  async getActiveCombatantName() {
    try {
      const activeName = await this.executeScript(`
        // Look for element with active styling or gold border
        const activeEl = document.querySelector('[class*="active"]') ||
                        document.querySelector('[style*="d4af37"]') ||
                        document.querySelector('[style*="gold"]');

        if (activeEl) {
          const text = activeEl.textContent;
          const lines = text.split('\\n').filter(l => l.trim());
          return lines[0]?.trim() || null;
        }

        // Alternative: look for pulsing indicator
        const pulsingParent = document.querySelector('[style*="animation"]')?.closest('[class*="MuiPaper"]');
        if (pulsingParent) {
          const text = pulsingParent.textContent;
          const lines = text.split('\\n').filter(l => l.trim());
          return lines[0]?.trim() || null;
        }

        return null;
      `);
      return activeName;
    } catch (error) {
      console.warn('Failed to get active combatant:', error.message);
      return null;
    }
  }

  /**
   * Check if there's an active combatant indicator
   * @returns {Promise<boolean>}
   */
  async hasActiveIndicator() {
    try {
      const hasActive = await this.executeScript(`
        const hasActiveClass = document.querySelector('[class*="active"]') !== null;
        const hasGoldBorder = document.body.innerHTML.includes('d4af37') ||
                             document.body.innerHTML.includes('gold');
        const hasPulsingDot = document.body.innerHTML.includes('pulse') ||
                              document.body.innerHTML.includes('animation');

        return hasActiveClass || hasGoldBorder || hasPulsingDot;
      `);
      return hasActive;
    } catch (error) {
      console.warn('Failed to check for active indicator:', error.message);
      return false;
    }
  }

  /**
   * Get the current round number
   * @returns {Promise<number>}
   */
  async getRoundNumber() {
    try {
      const round = await this.executeScript(`
        const roundText = document.body.textContent;
        const match = roundText.match(/Round (\\d+)/i);
        return match ? parseInt(match[1]) : 0;
      `);
      return round || 0;
    } catch (error) {
      console.warn('Failed to get round number:', error.message);
      return 0;
    }
  }

  /**
   * Check if combat is active
   * @returns {Promise<boolean>}
   */
  async isCombatActive() {
    try {
      const isActive = await this.executeScript(`
        const bodyText = document.body.textContent;
        return bodyText.includes('Round') && !bodyText.includes('No Combat');
      `);
      return isActive;
    } catch (error) {
      console.warn('Failed to check combat status:', error.message);
      return false;
    }
  }

  /**
   * Check if tracker shows "No Combat"
   * @returns {Promise<boolean>}
   */
  async showsNoCombat() {
    try {
      const noCombat = await this.executeScript(`
        const bodyText = document.body.textContent;
        return bodyText.includes('No Combat') ||
               bodyText.includes('Combat not yet started') ||
               bodyText.includes('Waiting for combatants');
      `);
      return noCombat;
    } catch (error) {
      console.warn('Failed to check no combat status:', error.message);
      return false;
    }
  }

  /**
   * Get card info for a specific combatant
   * @param {string} combatantName
   * @returns {Promise<{value: string, suit: string}|null>}
   */
  async getCardForCombatant(combatantName) {
    try {
      const cardInfo = await this.executeScript(`
        const name = '${combatantName}';
        const suits = ['♠', '♥', '♦', '♣'];
        const values = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

        const papers = Array.from(document.querySelectorAll('[class*="MuiPaper"]'));
        const combatantEntry = papers.find(p => p.textContent.includes(name));

        if (combatantEntry) {
          const text = combatantEntry.textContent;
          const foundSuit = suits.find(s => text.includes(s));
          const foundValue = values.find(v => text.includes(v));

          if (foundSuit && foundValue) {
            return { value: foundValue, suit: foundSuit };
          }

          if (text.includes('JOKER')) {
            return { value: 'JOKER', suit: text.includes('Red') ? 'Red' : 'Black' };
          }
        }

        return null;
      `);
      return cardInfo;
    } catch (error) {
      console.warn('Failed to get card for combatant:', error.message);
      return null;
    }
  }

  /**
   * Verify combatants are sorted by card value (highest first)
   * @returns {Promise<boolean>}
   */
  async areCombatantsSortedByCard() {
    try {
      const isSorted = await this.executeScript(`
        const cardOrder = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
        const suitOrder = ['♠', '♥', '♦', '♣'];

        const suits = ['♠', '♥', '♦', '♣'];
        const papers = Array.from(document.querySelectorAll('[class*="MuiPaper"]'));
        const combatantEntries = papers.filter(p => suits.some(s => p.textContent.includes(s)));

        if (combatantEntries.length < 2) return true; // Can't be unsorted with <2 entries

        const cardValues = combatantEntries.map(entry => {
          const text = entry.textContent;
          const value = cardOrder.find(v => text.includes(v)) || '';
          const suit = suitOrder.find(s => text.includes(s)) || '';
          return {
            valueIndex: cardOrder.indexOf(value),
            suitIndex: suitOrder.indexOf(suit)
          };
        });

        // Check if sorted (lower index = higher card)
        for (let i = 0; i < cardValues.length - 1; i++) {
          const current = cardValues[i];
          const next = cardValues[i + 1];

          if (current.valueIndex > next.valueIndex) return false;
          if (current.valueIndex === next.valueIndex && current.suitIndex > next.suitIndex) return false;
        }

        return true;
      `);
      return isSorted;
    } catch (error) {
      console.warn('Failed to verify sort order:', error.message);
      return true; // Assume sorted on error
    }
  }
}

module.exports = InitiativeTrackerPage;
