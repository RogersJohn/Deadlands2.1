Feature: XCOM-Style UI Layout
  As a user
  I want the new XCOM-style interface with expanded map visibility
  So that I can focus on tactical combat with a professional, clean UI

  Background:
    Given the application is running
    And test accounts exist:
      | username    | password  | role         |
      | e2e_testgm  | Test123!  | GAME_MASTER  |
      | e2e_player1 | Test123!  | PLAYER       |
    And characters exist for all players

  @ui @xcom-layout @critical
  Scenario: Game Arena displays XCOM-style layout with all components
    Given "e2e_player1" is logged in as Player
    When "e2e_player1" navigates to the game arena
    And "e2e_player1" selects a character

    Then the game arena should display the XCOM-style layout
    And the top bar should be visible
    And the top bar should contain "Deadlands Arena" title
    And the top bar should display the turn indicator
    And the top bar should have a settings gear icon
    And the game canvas should be visible
    And the game canvas should occupy 85-90% of the screen
    And the bottom action bar should be visible

  @ui @xcom-layout @settings-menu
  Scenario: Settings menu contains all environment controls
    Given "e2e_player1" is in the game arena with a character selected

    When "e2e_player1" clicks the settings gear icon
    Then the settings menu should open
    And the settings menu should contain "Camera" controls
    And the settings menu should contain "Weapon Ranges" toggle
    And the settings menu should contain "Movement Ranges" toggle
    And the settings menu should contain "Illumination" settings
    And "Illumination" should have 4 options: "Bright", "Dim", "Dark", "Pitch Black"

  @ui @xcom-layout @settings-functionality
  Scenario: Camera settings work correctly
    Given "e2e_player1" is in the game arena with settings menu open

    When "e2e_player1" selects "Follow" for Camera
    Then the camera should follow the player token

    When "e2e_player1" selects "Manual" for Camera
    Then the camera should allow manual control

  @ui @xcom-layout @settings-functionality
  Scenario: Range display toggles work correctly
    Given "e2e_player1" is in the game arena with settings menu open

    When "e2e_player1" toggles "Weapon Ranges" to "Show"
    Then weapon ranges should be visible on the canvas

    When "e2e_player1" toggles "Weapon Ranges" to "Hide"
    Then weapon ranges should not be visible on the canvas

    When "e2e_player1" toggles "Movement Ranges" to "Show"
    Then movement ranges should be visible on the canvas

    When "e2e_player1" toggles "Movement Ranges" to "Hide"
    Then movement ranges should not be visible on the canvas

  @ui @xcom-layout @action-bar
  Scenario: Bottom action bar displays all combat information
    Given "e2e_player1" is in the game arena with character "Test Character" selected

    Then the action bar should display the character portrait
    And the action bar should display character name "Test Character"
    And the action bar should display health with format "X/Y"
    And the action bar should display wounds count
    And the action bar should display movement budget
    And the action bar should display selected weapon
    And the action bar should have an actions button
    And the action bar should display turn number

  @ui @xcom-layout @action-bar @health
  Scenario: Health bar updates correctly
    Given "e2e_player1" is in the game arena with a character selected
    And the character has full health

    When the character takes damage
    Then the health bar should decrease
    And the health text should update to reflect current health
    And the health bar color should change based on health percentage

  @ui @xcom-layout @action-bar @movement
  Scenario: Movement budget displays and updates correctly
    Given "e2e_player1" is in the game arena with a character selected
    And the character has full movement budget

    When the character moves 3 squares
    Then the movement budget should decrease by 3
    And the movement bar should update visually
    And the movement text should show remaining squares

  @ui @xcom-layout @action-bar @weapon
  Scenario: Weapon selector in action bar works correctly
    Given "e2e_player1" is in the game arena with a character selected
    And the character has multiple weapons equipped

    When "e2e_player1" clicks the weapon selector in action bar
    Then a weapon dropdown should appear
    And the dropdown should list all equipped weapons

    When "e2e_player1" selects a different weapon
    Then the selected weapon should update in the action bar
    And the weapon stats should be displayed (DMG, RNG, ROF)

  @ui @xcom-layout @turn-indicator
  Scenario: Turn indicator displays current phase correctly
    Given "e2e_player1" is in the game arena with a character selected

    Then the turn indicator should show "YOUR TURN" in blue when it's player phase
    And the turn indicator should show "ENEMY TURN" in red when it's enemy phase
    And the turn indicator should show "VICTORY!" in green when combat is won
    And the turn indicator should show "DEFEAT" in gray when combat is lost

  @ui @xcom-layout @responsive
  Scenario: Map canvas expands to fill available space
    Given "e2e_player1" is in the game arena with a character selected

    Then the game canvas should use flexGrow to fill vertical space
    And the top bar should have a fixed height
    And the action bar should have a fixed height
    And the canvas should fill the remaining space between top bar and action bar

  @ui @xcom-layout @comparison
  Scenario: Old sidebars are removed
    Given "e2e_player1" is in the game arena with a character selected

    Then there should be no left sidebar
    And there should be no right sidebar
    And environment controls should not be visible on the page
    And weapon selection should not be in a sidebar
    And action menu should not be in a sidebar

  @ui @xcom-layout @accessibility
  Scenario: Settings menu opens and closes correctly
    Given "e2e_player1" is in the game arena with a character selected

    When "e2e_player1" clicks the settings gear icon
    Then the settings menu should open

    When "e2e_player1" clicks outside the settings menu
    Then the settings menu should close

  @ui @xcom-layout @integration
  Scenario: All XCOM components work together
    Given "e2e_player1" is in the game arena with a character selected

    Then the top bar should be at the top
    And the game canvas should be in the middle
    And the action bar should be at the bottom
    And there should be no overlap between components
    And the layout should be visually coherent

  @ui @xcom-layout @character-selection
  Scenario: Character selection screen still works before entering arena
    Given "e2e_player1" is logged in and navigates to game arena

    Then the character selection grid should be displayed
    And characters should be shown as cards with images and stats

    When "e2e_player1" clicks on a character card
    Then the game arena with XCOM layout should load
    And the selected character should appear in the action bar
