const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class DashboardPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.playGameButton = By.xpath("//button[contains(., 'Play Game')]");
    this.newCharacterButton = By.xpath("//button[contains(., 'New Character')]");
    this.welcomeMessage = By.xpath("//*[contains(text(), 'Welcome back')]");
  }

  async clickPlayGame() {
    await this.click(this.playGameButton);
    // Wait for navigation to complete
    await this.sleep(1000);
  }

  async clickNewCharacter() {
    await this.click(this.newCharacterButton);
    await this.sleep(1000);
  }

  async isWelcomeMessageDisplayed() {
    return await this.isElementPresent(this.welcomeMessage);
  }

  async navigate(baseUrl) {
    await this.visit(`${baseUrl}/dashboard`);
  }
}

module.exports = DashboardPage;
