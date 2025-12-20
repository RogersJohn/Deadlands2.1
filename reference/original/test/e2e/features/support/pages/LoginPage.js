const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class LoginPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.usernameInput = By.css('input[name="username"], input[type="text"]');
    this.passwordInput = By.css('input[name="password"], input[type="password"]');
    this.loginButton = By.css('button[type="submit"]');
    this.errorMessage = By.css('.error-message, .MuiAlert-message');
    this.registerLink = By.css('a[href*="register"]');
  }

  async navigate(baseUrl) {
    await this.visit(`${baseUrl}/login`);
  }

  async login(username, password) {
    // Wait for form to be ready
    await this.waitForElement(this.usernameInput, 10000);

    await this.type(this.usernameInput, username);
    await this.type(this.passwordInput, password);
    await this.click(this.loginButton);

    // Wait longer for navigation/API call
    await this.sleep(3000);
  }

  async isLoginSuccessful() {
    // Check if we're redirected away from login page
    const currentUrl = await this.driver.getCurrentUrl();
    return !currentUrl.includes('/login');
  }

  async getErrorMessage() {
    if (await this.isElementPresent(this.errorMessage)) {
      return await this.getText(this.errorMessage);
    }
    return null;
  }
}

module.exports = LoginPage;
