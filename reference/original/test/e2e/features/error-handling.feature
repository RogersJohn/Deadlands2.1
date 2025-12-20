Feature: Error Handling & Edge Cases
  As a User
  I want helpful error messages and graceful degradation
  So that I understand what went wrong and can recover

  Background:
    Given the application is running on production

  @critical @error-handling @navigation
  Scenario: Redirect when no character selected
    Given "e2e_player1" is logged in with test accounts
    When the player navigates directly to "/arena"
    Then the player should be redirected to "/character-select"
    And the URL should be "/character-select"

  @error-handling @websocket
  Scenario: WebSocket connection failure shows message
    Given "e2e_player1" is in the arena
    When the WebSocket connection fails
    Then the player should see "Connection lost" notification
    And the connection status should show "disconnected"

  @error-handling @websocket
  Scenario: WebSocket auto-reconnects after failure
    Given "e2e_player1" is in the arena
    And the WebSocket is connected
    When the network connection is interrupted for 3 seconds
    And the connection is restored
    Then the WebSocket should automatically reconnect
    And the connection status should show "connected"
    And no error message should be visible

  @error-handling @api
  Scenario: API 500 error shows user-friendly message
    Given "e2e_player1" navigates to character-select
    When the API returns a 500 error for character fetch
    Then the player should see "Failed to load characters"
    And a "Try Again" button should be visible

  @error-handling @api
  Scenario: API timeout shows loading then error
    Given "e2e_player1" navigates to character-select
    When the API request times out after 30 seconds
    Then a loading spinner should show initially
    And after timeout, "Request timed out" error should display
    And a "Retry" button should appear

  @error-handling @validation
  Scenario: No characters available shows create prompt
    Given "e2e_newplayer" is logged in with no characters
    When the player navigates to "/character-select"
    Then the player should see "No characters found"
    And a "Create Character" button should be visible
    And clicking it should navigate to "/character/new"

  @error-handling @permissions
  Scenario: Non-GM cannot access GM routes
    Given "e2e_player1" is logged in as PLAYER role
    When the player navigates to "/gm-tools"
    Then the player should see "403 Forbidden" or be redirected
    And GM tools should not be accessible

  @error-handling @auth
  Scenario: Invalid credentials show error
    Given the player is on the login page
    When the player enters username "e2e_player1" and wrong password
    And the player clicks the "Login" button on login page
    Then an error message should display "Invalid credentials"
    And the player should remain on the login page

  @error-handling @session
  Scenario: JWT expiration redirects to login
    Given "e2e_player1" has an expired JWT token
    When the player navigates to "/arena"
    Then the player should be redirected to "/login"
    And a message should indicate "Session expired"
