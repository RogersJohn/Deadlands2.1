const { By, until } = require('selenium-webdriver');

class BasePage {
  constructor(driver) {
    this.driver = driver;
    this.timeout = 10000;
  }

  async visit(url) {
    await this.driver.get(url);
    // Wait for page to load by checking document.readyState
    await this.driver.wait(
      async () => {
        const readyState = await this.driver.executeScript('return document.readyState');
        return readyState === 'complete';
      },
      this.timeout
    );
  }

  async findElement(locator) {
    return await this.driver.wait(until.elementLocated(locator), this.timeout);
  }

  async click(locator) {
    const element = await this.findElement(locator);
    await this.driver.wait(until.elementIsVisible(element), this.timeout);
    await element.click();
  }

  async type(locator, text) {
    const element = await this.findElement(locator);
    await element.clear();
    await element.sendKeys(text);
  }

  async getText(locator) {
    const element = await this.findElement(locator);
    return await element.getText();
  }

  async waitForElement(locator, timeout = this.timeout) {
    return await this.driver.wait(until.elementLocated(locator), timeout);
  }

  async waitForElementVisible(locator, timeout = this.timeout) {
    const element = await this.findElement(locator);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async isElementPresent(locator, timeout = this.timeout) {
    try {
      await this.driver.wait(until.elementLocated(locator), timeout);
      return true;
    } catch (error) {
      return false;
    }
  }

  async executeScript(script, ...args) {
    return await this.driver.executeScript(script, ...args);
  }

  async getConsoleLogs() {
    const logs = await this.driver.manage().logs().get('browser');
    return logs.map(log => log.message);
  }

  async sleep(ms) {
    await this.driver.sleep(ms);
  }
}

module.exports = BasePage;
