Feature: Combat Initiative System
  As a Game Master
  I want to start combat and manage initiative order
  So that players can take turns according to Savage Worlds card-based initiative rules

  Background:
    Given the application is running
    And test accounts exist:
      | username    | password  | role         |
      | gamemaster  | Test123!  | GAME_MASTER  |

  @critical @combat @initiative
  Scenario: GM starts combat with NPCs and sees initiative tracker
    Given "gamemaster" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And "GM" opens the GM Control Panel
    Then the GM panel should show the Combat section
    And the combat status should show "No Combat"

    # Start combat with NPCs using the combined step that works reliably
    And combat is started with NPCs "Bandit 1, Bandit 2, Bandit 3"
    Then the Initiative Tracker should show 3 combatants
    And each combatant should have a card displayed

  @critical @combat @turn-order
  Scenario: GM can start combat and view initiative tracker
    Given "gamemaster" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And "GM" opens the GM Control Panel
    And combat is started with NPCs "Bandit 1, Bandit 2"

    # Check initial state
    Then the Initiative Tracker should show 2 combatants
    And one combatant should be marked as active
    And each combatant should have a card displayed

  @combat @end-combat
  Scenario: GM can end combat
    Given "gamemaster" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And "GM" opens the GM Control Panel
    And combat is started with NPCs "Bandit 1"

    Then the combat status should show "Round 1"

    # End combat
    When "GM" clicks "End Combat"
    Then "GM" should see a confirmation prompt
    When "GM" confirms ending combat
    Then "GM" should see a notification "Combat ended"
    And the combat status should show "No Combat"
    And the Initiative Tracker should be empty

  @combat @force-new-round
  Scenario: GM can force a new round
    Given "gamemaster" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And "GM" opens the GM Control Panel
    And combat is started with NPCs "Bandit 1, Bandit 2"

    Then the combat status should show "Round 1"

    # Force new round
    When "GM" clicks "Force New Round"
    Then "GM" should see a notification containing "Round 2"
    And new cards should be dealt to all combatants

  @combat @card-display
  Scenario: Initiative cards display correctly
    Given "gamemaster" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And "GM" opens the GM Control Panel
    And combat is started with NPCs "Bandit 1, Bandit 2, Bandit 3"

    Then the Initiative Tracker should show 3 combatants
    And each card should show a value (A, K, Q, J, 10-2)
    And each card should show a suit symbol
    And combatants should be sorted by card value (highest first)

  @combat @active-indicator
  Scenario: Active combatant is clearly indicated
    Given "gamemaster" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And "GM" opens the GM Control Panel
    And combat is started with NPCs "Bandit 1, Bandit 2"

    Then exactly one combatant should have an active indicator
    And the active combatant should have a gold border
    And the active combatant should have a pulsing green dot

  @combat @full-flow
  Scenario: Complete combat flow from start to end
    Given "gamemaster" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And "GM" opens the GM Control Panel

    # Start combat
    When "GM" clicks "Start Combat"
    And "GM" enters NPC names "Bandit 1, Bandit 2, Bandit 3"
    And "GM" clicks "Deal Cards"
    Then the combat status should show "Round 1"
    And the Initiative Tracker should show 3 combatants

    # Cycle through all turns (Round 1)
    When "GM" ends all combatant turns
    Then the combat status should show "Round 2"

    # Cycle through all turns (Round 2)
    When "GM" ends all combatant turns
    Then the combat status should show "Round 3"

    # End combat
    When "GM" clicks "End Combat"
    And "GM" confirms ending combat
    Then the combat status should show "No Combat"
    And the Initiative Tracker should be empty
