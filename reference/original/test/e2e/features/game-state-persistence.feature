Feature: Game State Persistence
  As a Game Master and Players
  I want token positions and game state to persist across sessions
  So that games can continue after server restarts or player disconnections

  Background:
    Given the application is running
    And test accounts exist:
      | username    | password  | role         |
      | e2e_testgm  | Test123!  | GAME_MASTER  |
      | e2e_player1 | Test123!  | PLAYER       |
      | e2e_player2 | Test123!  | PLAYER       |
    And characters exist for all players

  @critical @persistence
  Scenario: Token positions persist across page refresh
    Given "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player1" enters the game arena with their character

    When "e2e_player1" moves their token to position (110, 95)
    Then "Player1" should see their token at position (110, 95)

    When "Player1" refreshes the page
    And "Player1" returns to the game arena
    Then "Player1" should see their token at position (110, 95)

  @critical @persistence @multiplayer
  Scenario: Late-joining player sees existing token positions
    Given "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player1" enters the game arena with their character
    And "e2e_player1" has moved to position (100, 100)

    When "e2e_player2" logs in and enters the game arena in browser "Player2"
    Then "Player2" should see "e2e_player1"'s remote token at position (100, 100)

  @persistence @ownership
  Scenario: Token ownership validation prevents unauthorized moves
    Given "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player2" is logged in as Player in browser "Player2"
    And both players are in the game arena with their tokens

    When "e2e_player1" moves their token to position (105, 105)
    Then "Player1" should see their token at position (105, 105)
    And "Player2" should see "e2e_player1"'s remote token at position (105, 105)

    # Player 2 attempts to move Player 1's token (should fail on backend)
    When "Player2" attempts to move "e2e_player1"'s token to position (120, 120)
    Then "Player2" should not be able to move other players' tokens
    And "e2e_player1"'s token should remain at position (105, 105)

  @persistence @gm-authority
  Scenario: Game Master can move any player's token
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And both are in the game arena

    When "e2e_player1" moves their token to position (100, 100)
    Then "GM" should see "e2e_player1"'s remote token at position (100, 100)

    When "GM" moves "e2e_player1"'s token to position (120, 110)
    Then "Player1" should see their token at position (120, 110)
    And "GM" should see "e2e_player1"'s remote token at position (120, 110)

  @persistence @database
  Scenario: All token positions are loaded from database on arena entry
    Given "e2e_testgm" is logged in as Game Master in browser "GM"
    And "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player2" is logged in as Player in browser "Player2"
    And all players are in the game arena

    When "e2e_player1" moves their token to position (110, 95)
    And "e2e_player2" moves their token to position (105, 100)
    Then the database should contain 2 token positions

    # New browser joins and should see both tokens
    When "e2e_testgm" refreshes the browser "GM"
    And "GM" returns to the game arena
    Then "GM" should see 2 remote tokens on the map
    And "GM" should see "e2e_player1"'s remote token at position (110, 95)
    And "GM" should see "e2e_player2"'s remote token at position (105, 100)

  @persistence @bounds-validation
  Scenario: Movement bounds validation prevents out-of-range positions
    Given "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player1" enters the game arena with their character

    When "Player1" attempts to move token to position (250, 250)
    Then the move should be rejected by the server
    And "Player1" should remain at the starting position

    When "Player1" attempts to move token to position (-10, 50)
    Then the move should be rejected by the server
    And "Player1" should remain at the starting position

    # Valid boundary positions should work
    When "e2e_player1" moves their token to position (0, 0)
    Then "Player1" should see their token at position (0, 0)

    When "e2e_player1" moves their token to position (199, 199)
    Then "Player1" should see their token at position (199, 199)

  @persistence @state-recovery
  Scenario Outline: Game state persists for <player_count> players across refresh
    Given <player_count> players are logged in and in the game arena
    And all players have moved to different positions

    When all players refresh their browsers
    And all players return to the game arena
    Then all players should see all tokens at their correct positions
    And no token positions should be lost

    Examples:
      | player_count |
      | 2            |
      | 3            |

  @persistence @WebSocket
  Scenario: Token movements sync via WebSocket and persist to database
    Given "e2e_player1" is logged in as Player in browser "Player1"
    And "e2e_player2" is logged in as Player in browser "Player2"
    And both players are in the game arena

    When "e2e_player1" moves their token to position (115, 95)
    Then "Player2" should see "e2e_player1"'s remote token at position (115, 95) within 2 seconds
    And the database should contain "e2e_player1"'s token at position (115, 95)

    When "e2e_player2" moves their token to position (90, 100)
    Then "Player1" should see "e2e_player2"'s remote token at position (90, 100) within 2 seconds
    And the database should contain "e2e_player2"'s token at position (90, 100)
