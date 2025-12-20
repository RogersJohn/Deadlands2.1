Feature: Character Selection Flow
  As a Player
  I want to select my character before entering the arena
  So that I can play with the correct character

  Background:
    Given the application is running on production
    And test accounts exist:
      | username    | password  | role         |
      | e2e_testgm  | Test123!  | GAME_MASTER  |
      | e2e_player1 | Test123!  | PLAYER       |

  @critical @character-selection
  Scenario: Player selects character and enters arena
    Given "e2e_player1" is logged in as Player
    When the player clicks "Play Game" on the dashboard
    Then the player should see the character selection screen
    And the character selection screen should display available characters

    When the player selects a character
    Then the player should be redirected to the arena
    And the selected character should be loaded in the game

  @character-selection @ui
  Scenario: Character selection screen displays character details
    Given "e2e_player1" is logged in as Player
    When the player navigates to "/character-select"
    Then the character selection screen should show:
      | Field      |
      | Name       |
      | Archetype  |
      | Pace       |
      | Parry      |
      | Toughness  |
    And each character should be clickable

  @character-selection @navigation
  Scenario: Back button returns to dashboard
    Given "e2e_player1" is logged in as Player
    And the player is on the character selection screen
    When the player clicks "Back to Dashboard"
    Then the player should be redirected to the dashboard

  @character-selection @error-handling
  Scenario: No characters available shows create prompt
    Given "e2e_newplayer" is logged in with no characters
    When the player navigates to "/character-select"
    Then the player should see "No characters found"
    And the player should see a "Create Character" button

  @character-selection @persistence
  Scenario: Selected character persists during gameplay
    Given "e2e_player1" is logged in as Player
    And the player has selected "Bob Cratchit" from character select
    When the player enters the arena
    Then the arena should show "Bob Cratchit" as the active character
    And the character's stats should be displayed in the HUD
