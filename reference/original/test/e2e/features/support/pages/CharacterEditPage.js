const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class CharacterEditPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.backButton = By.css('button[aria-label="Back"], button[aria-label="Go back"]');
    this.cancelButton = By.xpath("//button[contains(., 'Cancel')]");
    this.saveButton = By.xpath("//button[contains(., 'Save Changes')]");
    this.characterNameField = By.css('input[name="name"]');
    this.pageHeader = By.css('h4, h5');
  }

  async navigate(baseUrl, characterId) {
    await this.visit(`${baseUrl}/character/${characterId}/edit`);
    await this.sleep(1000);
  }

  async hasBackButton() {
    return await this.isElementPresent(this.backButton);
  }

  async clickBackButton() {
    console.log('[CharacterEditPage] Clicking back button');
    await this.click(this.backButton);
    await this.sleep(1000);
  }

  async clickCancel() {
    await this.click(this.cancelButton);
    await this.sleep(1000);
  }

  async clickSave() {
    await this.click(this.saveButton);
    await this.sleep(1000);
  }

  async getCharacterName() {
    const field = await this.driver.findElement(this.characterNameField);
    return await field.getAttribute('value');
  }

  async isOnEditPage() {
    return await this.isElementPresent(this.saveButton);
  }
}

module.exports = CharacterEditPage;
