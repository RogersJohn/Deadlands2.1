Feature: Navigation Improvements
  As a user
  I want clear and consistent navigation throughout the application
  So that I can easily move between pages without confusion

  Background:
    Given the application is running on production
    And test accounts exist:
      | username    | password  | role         |
      | e2e_testgm  | Test123!  | GAME_MASTER  |
      | e2e_player1 | Test123!  | PLAYER       |

  @critical @navigation @menu
  Scenario: Navigation menu shows no duplicate items
    Given "e2e_player1" is logged in as Player
    When the player opens the navigation menu
    Then the menu should contain exactly 4 items:
      | Menu Item         |
      | My Characters     |
      | Game Arena        |
      | Wiki              |
      | Change Password   |
    And no menu items should have duplicate paths

  @critical @navigation @back-button
  Scenario: Edit character page has back button in header
    Given "e2e_player1" is logged in as Player
    And the player has at least one character
    When the player navigates to edit their first character
    Then the page should display a back button in the header
    And clicking the back button should return to the character sheet

  @critical @navigation @breadcrumbs
  Scenario: Character sheet shows navigation breadcrumbs
    Given "e2e_player1" is logged in as Player
    And the player has at least one character
    When the player views their first character sheet
    Then breadcrumbs should be displayed showing:
      | Breadcrumb        |
      | My Characters     |
      | Character Name    |
    And clicking "My Characters" breadcrumb should navigate to dashboard

  @navigation @menu @routing
  Scenario: All menu items navigate to correct pages
    Given "e2e_player1" is logged in as Player
    When the player opens the navigation menu
    And clicks "My Characters" in the menu
    Then the player should be on the dashboard

    When the player opens the navigation menu
    And clicks "Wiki" in the menu
    Then the player should be on the wiki page

    When the player opens the navigation menu
    And clicks "Change Password" in the menu
    Then the player should be on the change password page

  @navigation @consistency
  Scenario: Navigation menu is accessible from all pages
    Given "e2e_player1" is logged in as Player
    When the player is on the dashboard
    Then the menu button should be visible

    When the player navigates to "/wiki"
    Then the menu button should be visible

    When the player navigates to "/change-password"
    Then the menu button should be visible
