const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class CharacterSheetPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Locators
    this.characterName = By.css('h4, h5');
    this.editButton = By.xpath("//button[contains(., 'Edit Character')]");
    this.deleteButton = By.xpath("//button[contains(., 'Delete Character')]");
    this.breadcrumb = (text) => By.xpath(`//nav[@aria-label="breadcrumb"]//a[contains(., "${text}")]`);
    this.breadcrumbContainer = By.css('nav[aria-label="breadcrumb"]');
    this.backButton = By.css('button[aria-label="Back"], button[aria-label="Go back"]');

    // Tabs
    this.attributesTab = By.xpath("//button[contains(., 'Attributes')]");
    this.skillsTab = By.xpath("//button[contains(., 'Skills')]");
    this.equipmentTab = By.xpath("//button[contains(., 'Equipment')]");

    // Empty states
    this.emptyStateMessage = By.xpath("//*[contains(text(), 'No ') or contains(text(), 'found')]");
  }

  async navigate(baseUrl, characterId) {
    await this.visit(`${baseUrl}/character/${characterId}`);
    await this.sleep(1000);
  }

  async getCharacterName() {
    const nameElement = await this.driver.findElement(this.characterName);
    return await nameElement.getText();
  }

  async clickEdit() {
    await this.click(this.editButton);
    await this.sleep(1000);
  }

  async clickDelete() {
    await this.click(this.deleteButton);
    await this.sleep(500);
  }

  async hasBreadcrumbs() {
    return await this.isElementPresent(this.breadcrumbContainer);
  }

  async clickBreadcrumb(text) {
    console.log(`[CharacterSheetPage] Clicking breadcrumb: ${text}`);
    const breadcrumb = await this.driver.findElement(this.breadcrumb(text));
    await breadcrumb.click();
    await this.sleep(1000);
  }

  async getBreadcrumbs() {
    try {
      const breadcrumbLinks = await this.driver.findElements(By.css('nav[aria-label="breadcrumb"] a, nav[aria-label="breadcrumb"] p'));
      const breadcrumbs = [];

      for (const link of breadcrumbLinks) {
        const text = await link.getText();
        if (text.trim()) {
          breadcrumbs.push(text.trim());
        }
      }

      return breadcrumbs;
    } catch (e) {
      console.log('[CharacterSheetPage] No breadcrumbs found');
      return [];
    }
  }

  async hasEmptyState() {
    return await this.isElementPresent(this.emptyStateMessage);
  }

  async getEmptyStateMessage() {
    const element = await this.driver.findElement(this.emptyStateMessage);
    return await element.getText();
  }

  async switchToTab(tabName) {
    let tabLocator;
    switch(tabName.toLowerCase()) {
      case 'attributes':
        tabLocator = this.attributesTab;
        break;
      case 'skills':
        tabLocator = this.skillsTab;
        break;
      case 'equipment':
        tabLocator = this.equipmentTab;
        break;
      default:
        throw new Error(`Unknown tab: ${tabName}`);
    }

    await this.click(tabLocator);
    await this.sleep(500);
  }
}

module.exports = CharacterSheetPage;
