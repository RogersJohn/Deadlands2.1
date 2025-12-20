Feature: Turn Management
  As a Game Master
  I want to manage combat turns and phases
  So that players can take turns in an organized manner

  Background:
    Given the application is running
    And test accounts exist:
      | username    | password  | role         |
      | e2e_testgm  | Test123!  | GAME_MASTER  |
      | e2e_player1 | Test123!  | PLAYER       |
      | e2e_player2 | Test123!  | PLAYER       |
    And characters exist for all players

  @critical @turn-management @turn-advancement
  Scenario: GM can advance turns through phases
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    Then the GM panel should show turn "1" with phase "player"

    # Advance from player to enemy phase
    When "GM" clicks "End Turn"
    Then "GM" should see a notification "Turn advanced"
    And "GM" should see a notification "enemy phase"
    And the GM panel should show turn "1" with phase "enemy"

    # Advance from enemy to resolution phase
    When "GM" clicks "End Turn"
    Then the GM panel should show turn "1" with phase "resolution"

    # Advance from resolution to next turn (player phase)
    When "GM" clicks "End Turn"
    Then the GM panel should show turn "2" with phase "player"

  @critical @turn-management @real-time-sync
  Scenario: All players see turn changes in real-time
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player2" is logged in as Player in browser "Player2"
    And all players are in the game arena
    Then all players should see turn "1" with phase "player"

    # GM advances turn, players see update
    When "GM" clicks "End Turn"
    Then "GM" should see turn "1" with phase "enemy" within 1 second
    And "Player1" should see turn "1" with phase "enemy" within 2 seconds
    And "Player2" should see turn "1" with phase "enemy" within 2 seconds

    # Advance again
    When "GM" clicks "End Turn"
    Then all players should see turn "1" with phase "resolution" within 2 seconds

    # Advance to next turn
    When "GM" clicks "End Turn"
    Then all players should see turn "2" with phase "player" within 2 seconds

  @turn-management @security
  Scenario: Only Game Master can advance turns
    Given "e2e_player1" is logged in as Player in browser "Player1"
    And "Player1" enters the game arena
    Then "Player1" should not see the "End Turn" button

    # Try to directly access the endpoint (should fail)
    When "Player1" attempts to advance turn via API
    Then the API should return 403 Forbidden
    And the turn should remain unchanged

  @turn-management @combat-hud-display
  Scenario: CombatHUD displays current turn and phase to all players
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And both are in the game arena

    # Both should see initial turn state
    Then "GM" should see CombatHUD showing turn "1"
    And "GM" should see CombatHUD showing phase "YOUR TURN"
    And "Player1" should see CombatHUD showing turn "1"
    And "Player1" should see CombatHUD showing phase "YOUR TURN"

    # Advance to enemy phase
    When "GM" clicks "End Turn"
    Then "GM" should see CombatHUD showing phase "ENEMY TURN" within 1 second
    And "Player1" should see CombatHUD showing phase "ENEMY TURN" within 2 seconds
    And "Player1" should see CombatHUD showing turn "1" still

    # Advance to resolution phase
    When "GM" clicks "End Turn"
    Then all players should see CombatHUD showing phase "resolution" within 2 seconds

    # Advance to next turn
    When "GM" clicks "End Turn"
    Then "GM" should see CombatHUD showing turn "2"
    And "Player1" should see CombatHUD showing turn "2"
    And all players should see CombatHUD showing phase "YOUR TURN"

  @turn-management @phase-cycle
  Scenario: Turn phases cycle correctly through all phases
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And the game is at turn "1" phase "player"

    # Complete one full turn cycle
    When "GM" advances turn 3 times
    Then the game should be at turn "2" phase "player"

    # Complete multiple cycles
    When "GM" advances turn 9 times
    Then the game should be at turn "5" phase "player"

  @turn-management @persistence
  Scenario: Turn state persists across page refreshes
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And both are in the game arena

    # Advance to turn 3, enemy phase
    When "GM" advances to turn "3" phase "enemy"
    Then "GM" should see turn "3" with phase "enemy"
    And "Player1" should see turn "3" with phase "enemy"

    # Player refreshes page
    When "Player1" refreshes the page
    And "Player1" returns to the game arena
    Then "Player1" should see turn "3" with phase "enemy"

    # GM refreshes page
    When "GM" refreshes the page
    And "GM" returns to the game arena
    Then "GM" should see turn "3" with phase "enemy"

  @turn-management @integration
  Scenario: Turn advancement preserves token positions
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player2" is logged in as Player in browser "Player2"
    And all players are in the game arena

    # Players place tokens
    When "e2e_player1" moves their token to position (100, 100)
    And "e2e_player2" moves their token to position (120, 120)
    Then the GM panel should show "2" tokens on the map

    # Advance turn
    When "GM" clicks "End Turn"
    Then the GM panel should still show "2" tokens on the map
    And "Player1" should still see their token at position (100, 100)
    And "Player2" should still see their token at position (120, 120)

    # Advance multiple times
    When "GM" advances turn 5 times
    Then the GM panel should still show "2" tokens on the map
    And all token positions should be preserved

  @turn-management @game-reset-interaction
  Scenario: Game reset resets turn to 1 and phase to player
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    # Advance to turn 5, resolution phase
    When "GM" advances to turn "5" phase "resolution"
    Then the GM panel should show turn "5" with phase "resolution"

    # Reset the game
    When "GM" resets the game
    Then the GM panel should show turn "1" with phase "player"
    And "GM" should see a notification "turn reset to 1"

  @turn-management @button-states
  Scenario: End Turn button shows loading state during request
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    When "GM" clicks "End Turn"
    Then the "End Turn" button should be disabled during processing
    And the button should show "Advancing..." text
    And the button should re-enable after completion

  @turn-management @notifications
  Scenario: GM receives detailed notifications for turn advancement
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    When "GM" clicks "End Turn"
    Then "GM" should see a notification within 1 second
    And the notification should contain "Turn advanced"
    And the notification should contain "Turn 1"
    And the notification should contain "enemy phase"

    When the notification disappears after 5 seconds
    And "GM" clicks "End Turn"
    Then "GM" should see a notification containing "resolution phase"

  @turn-management @websocket
  Scenario: Turn changes broadcast via WebSocket to all connected clients
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And both are in the game arena
    And WebSocket connections are established for all clients

    When "GM" clicks "End Turn"
    Then "Player1" should receive a WebSocket message on "/topic/game/turn"
    And the message should contain turnNumber "1"
    And the message should contain turnPhase "enemy"
    And "Player1" should see the UI update within 2 seconds

  @turn-management @player-joins-mid-game
  Scenario: Players joining mid-game see correct turn state
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    # Advance to turn 3, enemy phase
    When "GM" advances to turn "3" phase "enemy"
    Then the game should be at turn "3" phase "enemy"

    # New player joins
    When "e2e_player1" logs in as Player in browser "Player1"
    And "Player1" enters the game arena
    Then "Player1" should immediately see turn "3" with phase "enemy"
    And "Player1" should see CombatHUD showing turn "3"
    And "Player1" should see CombatHUD showing phase "ENEMY TURN"

  @turn-management @error-handling
  Scenario: Turn advancement handles server errors gracefully
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena
    And the backend is configured to simulate errors

    When "GM" clicks "End Turn"
    And the server returns an error
    Then "GM" should see an error notification "Failed to advance turn"
    And the turn should remain unchanged
    And the "End Turn" button should be re-enabled

  @turn-management @map-change-interaction
  Scenario: Turn state is preserved when changing maps
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "GM" enters the game arena

    # Advance to turn 5
    When "GM" advances to turn "5" phase "resolution"
    Then the GM panel should show turn "5" with phase "resolution"

    # Change map (clears tokens but preserves turn)
    When "GM" changes the map to "desert_canyon"
    Then the GM panel should show map "desert_canyon"
    And the GM panel should show turn "5" with phase "resolution"
