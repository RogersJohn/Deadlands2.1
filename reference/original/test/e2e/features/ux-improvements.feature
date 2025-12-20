Feature: UX Improvements - Dashboard Search and Character Stats Tooltips
  As a user
  I want enhanced UI features for better usability
  So that I can find characters easily and understand game statistics

  Background:
    Given the application is running on production
    And test accounts exist:
      | username    | password  | role         |
      | e2e_player1 | Test123!  | PLAYER       |

  @ux @dashboard @search
  Scenario: Dashboard search filters characters by name
    Given "e2e_player1" is logged in as Player
    When the player is on the dashboard
    Then the search field should be visible

    When the player enters "Bob" in the search field
    Then only characters matching "Bob" should be displayed
    And other characters should be hidden

  @ux @dashboard @search
  Scenario: Dashboard search filters by occupation
    Given "e2e_player1" is logged in as Player
    When the player is on the dashboard
    And the player enters "Gunslinger" in the search field
    Then only characters with occupation "Gunslinger" should be displayed

  @ux @dashboard @search
  Scenario: Dashboard shows no results message for search miss
    Given "e2e_player1" is logged in as Player
    When the player is on the dashboard
    And the player enters "NonexistentCharacter" in the search field
    Then the message "No characters found matching" should be displayed

  @ux @dashboard @search
  Scenario: Dashboard search is case-insensitive
    Given "e2e_player1" is logged in as Player
    When the player is on the dashboard
    And the player enters "BOB" in the search field
    Then characters named "Bob" should be displayed

  @ux @character-select @tooltips
  Scenario: Character stats show explanatory tooltips
    Given "e2e_player1" is logged in as Player
    When the player navigates to "/character-select"
    Then the character cards should display stats with tooltips

    When the player hovers over "Str"
    Then a tooltip explaining "Strength" should appear

    When the player hovers over "Agi"
    Then a tooltip explaining "Agility" should appear

    When the player hovers over "Vig"
    Then a tooltip explaining "Vigor" should appear

  @ux @character-select @tooltips
  Scenario: Combat stats show explanatory tooltips
    Given "e2e_player1" is logged in as Player
    When the player navigates to "/character-select"

    When the player hovers over "Pace"
    Then a tooltip "Movement rate per round" should appear

    When the player hovers over "Parry"
    Then a tooltip "Defense against melee attacks" should appear

    When the player hovers over "Tough"
    Then a tooltip "Resistance to damage" should appear

  @ux @empty-states
  Scenario: Empty states provide helpful messages
    Given "e2e_player1" is logged in with no characters
    When the player navigates to "/dashboard"
    Then the message "No characters yet. Create your first character!" should be displayed
