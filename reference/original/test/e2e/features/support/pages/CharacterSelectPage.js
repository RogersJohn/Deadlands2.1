const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class CharacterSelectPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.pageTitle = By.xpath("//*[contains(text(), 'Select Your Character')]");
    this.backToDashboardButton = By.xpath("//button[contains(., 'Back to Dashboard')]");
    this.characterCards = By.css('[role="button"]'); // MUI CardActionArea
    this.characterName = By.css('h5'); // Character name in card
    this.characterStats = By.xpath("//*[contains(text(), 'Pace:')]");
    this.noCharactersMessage = By.xpath("//*[contains(text(), 'No characters found')]");
    this.createCharacterButton = By.xpath("//button[contains(., 'Create Character')]");
    this.loadingSpinner = By.css('[role="progressbar"]');
  }

  async navigate(baseUrl) {
    await this.visit(`${baseUrl}/character-select`);
  }

  async isCharacterSelectionScreenDisplayed() {
    return await this.isElementPresent(this.pageTitle);
  }

  async getCharacterCards() {
    try {
      // Wait for loading to finish
      await this.driver.wait(async () => {
        const spinnerPresent = await this.isElementPresent(this.loadingSpinner, 2000);
        return !spinnerPresent;
      }, 10000);

      const cards = await this.driver.findElements(this.characterCards);
      return cards;
    } catch (error) {
      return [];
    }
  }

  async selectCharacter(characterName) {
    const cards = await this.getCharacterCards();

    for (const card of cards) {
      const text = await card.getText();
      if (text.includes(characterName)) {
        await card.click();
        await this.sleep(2000); // Wait for navigation
        return true;
      }
    }

    throw new Error(`Character "${characterName}" not found`);
  }

  async selectFirstCharacter() {
    const cards = await this.getCharacterCards();

    if (cards.length === 0) {
      throw new Error('No characters available to select');
    }

    await cards[0].click();
    await this.sleep(2000); // Wait for navigation
  }

  async getCharacterDetails() {
    const cards = await this.getCharacterCards();
    const details = [];

    for (const card of cards) {
      const text = await card.getText();
      details.push({
        text,
        hasName: text.length > 0,
        hasStats: text.includes('Pace:'),
      });
    }

    return details;
  }

  async clickBackToDashboard() {
    await this.click(this.backToDashboardButton);
    await this.sleep(1000);
  }

  async isNoCharactersMessageDisplayed() {
    return await this.isElementPresent(this.noCharactersMessage);
  }

  async isCreateCharacterButtonDisplayed() {
    return await this.isElementPresent(this.createCharacterButton);
  }

  async getCurrentUrl() {
    return await this.driver.getCurrentUrl();
  }
}

module.exports = CharacterSelectPage;
