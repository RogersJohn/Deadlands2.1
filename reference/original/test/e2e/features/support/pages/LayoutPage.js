const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class LayoutPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.menuButton = By.css('[aria-label="menu"], button[class*="MuiIconButton"] svg[data-testid="MenuIcon"]').parent;
    this.menuDrawer = By.css('[role="presentation"]');
    this.menuItem = (text) => By.xpath(`//div[@role="presentation"]//span[text()="${text}"]`);
    this.allMenuItems = By.xpath('//div[@role="presentation"]//span[contains(@class, "MuiListItemText")]');
    this.logoutButton = By.xpath("//button[contains(., 'Logout')]");
    this.pageTitle = By.xpath('//h6[contains(@class, "MuiTypography")]//span');
  }

  async openMenu() {
    console.log('[LayoutPage] Opening navigation menu');
    // Try multiple selectors for the menu button
    const menuSelectors = [
      By.css('button[aria-label="menu"]'),
      By.xpath('//button[contains(@class, "MuiIconButton")]/*[name()="svg" and contains(@data-testid, "MenuIcon")]/..')
    ];

    for (const selector of menuSelectors) {
      try {
        const button = await this.driver.findElement(selector);
        if (await button.isDisplayed()) {
          await button.click();
          console.log('[LayoutPage] Menu button clicked');
          await this.sleep(500);
          return;
        }
      } catch (e) {
        // Try next selector
      }
    }

    throw new Error('Could not find menu button');
  }

  async clickMenuItem(itemText) {
    console.log(`[LayoutPage] Clicking menu item: ${itemText}`);
    const menuItem = await this.driver.findElement(this.menuItem(itemText));
    await menuItem.click();
    await this.sleep(1000); // Wait for navigation
  }

  async getMenuItems() {
    console.log('[LayoutPage] Getting all menu items');
    const elements = await this.driver.findElements(this.allMenuItems);
    const items = [];

    for (const element of elements) {
      const text = await element.getText();
      if (text.trim()) {
        items.push(text.trim());
      }
    }

    console.log(`[LayoutPage] Found menu items: ${items.join(', ')}`);
    return items;
  }

  async isMenuOpen() {
    try {
      const drawer = await this.driver.findElement(this.menuDrawer);
      return await drawer.isDisplayed();
    } catch (e) {
      return false;
    }
  }

  async isMenuButtonVisible() {
    try {
      const button = await this.driver.findElement(By.css('button svg[data-testid="MenuIcon"]'));
      return await button.isDisplayed();
    } catch (e) {
      return false;
    }
  }

  async getPageTitle() {
    try {
      const title = await this.driver.findElement(this.pageTitle);
      return await title.getText();
    } catch (e) {
      return '';
    }
  }

  async logout() {
    console.log('[LayoutPage] Logging out');
    const logoutBtn = await this.driver.findElement(this.logoutButton);
    await logoutBtn.click();
    await this.sleep(1000);
  }
}

module.exports = LayoutPage;
