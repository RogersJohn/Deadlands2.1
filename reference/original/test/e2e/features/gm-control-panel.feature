Feature: GM Control Panel
  As a Game Master
  I want a dedicated control panel to manage game state
  So that I can change maps and reset the game efficiently

  Background:
    Given the application is running
    And test accounts exist:
      | username    | password  | role         |
      | e2e_testgm  | Test123!  | GAME_MASTER  |
      | e2e_player1 | Test123!  | PLAYER       |
      | e2e_player2 | Test123!  | PLAYER       |
    And characters exist for all players

  @critical @gm-panel @visibility
  Scenario: GM Control Panel is only visible to Game Master
    # Player should NOT see the panel
    Given "e2e_player1" is logged in as Player in browser "Player1"
    When "Player1" enters the game arena
    Then "Player1" should not see the GM Control Panel

    # GM should see the panel
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    When "GM" enters the game arena
    Then "GM" should see the GM Control Panel
    And the panel should display current game state information

  @gm-panel @game-state-display
  Scenario: GM Control Panel displays current game state
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And both are in the game arena

    Then the GM panel should show:
      | Field       | Value               |
      | Map         | No map set or valid map name |
      | Turn        | 1                   |
      | Tokens      | 0 on map            |

    When "e2e_player1" moves their token to position (100, 100)
    And "GM" waits for panel to update
    Then the GM panel should show "1" token on the map

  @critical @gm-panel @map-change
  Scenario: GM can change the map and clear all tokens
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player2" is logged in as Player in browser "Player2"
    And all players are in the game arena

    # Players place tokens
    When "e2e_player1" moves their token to position (110, 95)
    And "e2e_player2" moves their token to position (105, 100)
    Then the GM panel should show "2" tokens on the map

    # GM changes map
    When "GM" opens the GM Control Panel
    And "GM" clicks "Change Map"
    And "GM" enters map name "desert_canyon"
    And "GM" confirms the map change
    Then "GM" should see a notification "Map changed to: desert_canyon"
    And "GM" should see a notification "All tokens cleared"
    And the GM panel should show map "desert_canyon"
    And the GM panel should show "0" tokens on the map

    # Players' tokens should be cleared
    When "Player1" refreshes and returns to arena
    Then "Player1" should not see any tokens on the map

    When "Player2" refreshes and returns to arena
    Then "Player2" should not see any tokens on the map

  @gm-panel @map-change @offline-players
  Scenario: Map change clears tokens for offline players
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player2" is logged in as Player in browser "Player2"
    And all players are in the game arena

    # Both players place tokens
    When "e2e_player1" moves their token to position (100, 100)
    And "e2e_player2" moves their token to position (120, 120)
    Then the GM panel should show "2" tokens on the map

    # Player 2 goes offline (closes browser)
    When "Player2" closes their browser

    # GM changes map while Player 2 is offline
    And "GM" changes the map to "saloon_interior"
    Then the GM panel should show map "saloon_interior"
    And the GM panel should show "0" tokens on the map
    And the database should contain 0 token positions

    # Player 2 comes back online
    When "e2e_player2" logs in again in browser "Player2"
    And "Player2" enters the game arena
    Then "Player2" should not see any tokens on the map
    And "Player2" should be able to place a new token

  @critical @gm-panel @game-reset
  Scenario: GM can reset the game state
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And both are in the game arena

    # Set up game state
    When "e2e_player1" moves their token to position (110, 95)
    And "GM" changes the map to "test_map"
    And the turn number is advanced to 5
    Then the GM panel should show:
      | Field  | Value    |
      | Map    | test_map |
      | Turn   | 5        |
      | Tokens | 1        |

    # Reset the game
    When "GM" clicks "Reset Game"
    And "GM" sees the warning "This will clear all tokens and reset turn to 1!"
    And "GM" confirms the reset
    Then "GM" should see a notification "Game reset"
    And the GM panel should show:
      | Field  | Value    |
      | Map    | test_map |
      | Turn   | 1        |
      | Tokens | 0        |

    # Player's token should be cleared
    When "Player1" refreshes and returns to arena
    Then "Player1" should not see any tokens on the map

  @gm-panel @ui-workflow
  Scenario: Map change workflow requires confirmation
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    When "GM" clicks "Change Map"
    Then "GM" should see the map name input field
    And "GM" should see "Confirm" and "Cancel" buttons

    When "GM" enters map name "test_map"
    And "GM" clicks "Cancel"
    Then the map name input should be hidden
    And the map should not be changed

    When "GM" clicks "Change Map" again
    And "GM" enters map name "desert_canyon"
    And "GM" confirms the map change
    Then the GM panel should show map "desert_canyon"

  @gm-panel @ui-workflow
  Scenario: Game reset workflow requires confirmation
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    When "GM" clicks "Reset Game"
    Then "GM" should see a warning message
    And "GM" should see "Yes, Reset" and "Cancel" buttons

    When "GM" clicks "Cancel"
    Then the warning should be hidden
    And the game should not be reset

    When "GM" clicks "Reset Game" again
    And "GM" confirms the reset
    Then the GM panel should show turn "1"
    And the GM panel should show "0" tokens

  @gm-panel @notifications
  Scenario: GM receives feedback notifications for actions
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    When "GM" changes the map to "new_map"
    Then "GM" should see a notification within 2 seconds
    And the notification should contain "Map changed to: new_map"
    And the notification should contain "All tokens cleared"

    When the notification disappears after 5 seconds
    And "GM" resets the game
    Then "GM" should see a notification within 2 seconds
    And the notification should contain "Game reset"
    And the notification should contain "turn reset to 1"

  @gm-panel @validation
  Scenario: Map change validation prevents empty map names
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    When "GM" clicks "Change Map"
    And "GM" leaves the map name input empty
    And "GM" clicks "Confirm"
    Then the map change should not be processed

  @gm-panel @real-time-sync
  Scenario: GM panel updates in real-time as players join and move
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    Then the GM panel should show "0" tokens on the map

    When "e2e_player1" logs in and enters the game arena in browser "Player1"
    And "e2e_player1" places their token
    Then "GM" should see the panel update to show "1" token within 3 seconds

    When "e2e_player2" logs in and enters the game arena in browser "Player2"
    And "e2e_player2" places their token
    Then "GM" should see the panel update to show "2" tokens within 3 seconds

    When "Player1" closes their browser
    # Token count should remain until GM changes map or resets
    Then the GM panel should still show "2" tokens

  @gm-panel @styling
  Scenario: GM Control Panel matches Deadlands aesthetic
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    Then the GM Control Panel should be styled with:
      | Style Element     | Expected Value                    |
      | Position          | Fixed top-right corner            |
      | Background        | Dark theme with transparency      |
      | Border            | Golden/yellow accent color        |
      | Font              | Readable monospace or sans-serif  |

  @gm-panel @accessibility
  Scenario: GM Control Panel is keyboard accessible
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    When "GM" tabs to the "Change Map" button
    And "GM" presses Enter
    Then the map name input should be focused

    When "GM" types "new_map" and presses Enter
    Then the map should be changed to "new_map"

    When "GM" tabs to the "Reset Game" button
    And "GM" presses Enter
    Then the reset confirmation dialog should appear
