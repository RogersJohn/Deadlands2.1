Feature: Zustand Store State Management
  As a Player
  I want my selected character and preferences to persist
  So that my game state is maintained across navigation

  Background:
    Given the application is running on production
    And test accounts exist:
      | username    | password  | role         |
      | e2e_player1 | Test123!  | PLAYER       |

  @critical @zustand @state-management
  Scenario: Selected character persists in gameStore
    Given "e2e_player1" is logged in as Player
    When the player selects character "Bob Cratchit" from character-select
    And the player navigates to the arena
    Then the arena should load with "Bob Cratchit" as active character
    And the gameStore should contain "Bob Cratchit" data

  @zustand @state-management
  Scenario: Selected character is accessible across components
    Given "e2e_player1" has selected a character
    When the player is in the arena
    Then the action bar should display the character's name
    And the HUD should show the character's stats
    And the character data should come from gameStore

  @zustand @ui-preferences
  Scenario: UI preferences persist in localStorage
    Given "e2e_player1" is in the arena
    When the player toggles coordinate display OFF
    And the player refreshes the page
    Then coordinate display should still be OFF
    And the preference should be stored in gameStore

  @zustand @ui-preferences
  Scenario: Camera follow preference persists
    Given "e2e_player1" is in the arena
    When the player disables camera follow
    And the player refreshes the page
    Then camera should not follow the token
    And cameraFollow in gameStore should be false

  @zustand @ui-preferences
  Scenario: Multiple UI preferences persist together
    Given "e2e_player1" is in the arena
    When the player sets the following preferences:
      | Preference        | Value |
      | Coordinate Display | OFF   |
      | Camera Follow      | OFF   |
      | Sound Enabled      | OFF   |
      | Volume             | 25    |
    And the player refreshes the page
    Then all preferences should be restored from gameStore
    And the UI should reflect the saved preferences

  @zustand @state-management @error-handling
  Scenario: gameStore handles missing character gracefully
    Given "e2e_player1" is logged in
    When the player navigates directly to "/arena"
    Then the player should be redirected to "/character-select"
    And gameStore.selectedCharacter should be null
