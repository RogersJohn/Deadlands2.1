# Manual Testing Checklist - Game State Persistence & GM Controls

**Testing Date:** 2025-11-18
**Features:** Token persistence, GM Control Panel, Map changes

## Production URLs
- Frontend: https://deadlands-frontend-production.up.railway.app
- Backend: https://deadlands-campaign-manager-production-053e.up.railway.app

## Pre-Testing Setup

- [ ] Open browser (Chrome/Firefox recommended)
- [ ] Clear browser cache and cookies for the application
- [ ] Have two browser windows ready (one for Player, one for GM)

## Test Suite 1: Token Position Persistence

### Test 1.1: Basic Persistence Across Page Refresh
**Goal:** Verify token positions are saved and restored

1. [ ] Login as Player (e.g., `e2e_player1` / `password123`)
2. [ ] Navigate to lobby, select a character, start game
3. [ ] Move character token to position (50, 75)
4. [ ] Note the exact position
5. [ ] Refresh the page (F5)
6. [ ] Return to arena
7. [ ] **VERIFY:** Token is at the same position (50, 75)

**Expected Result:** ✅ Token position persists across refresh
**Actual Result:** _____________

---

### Test 1.2: Late Joiner Sees Existing Tokens
**Goal:** Verify late-joining players see tokens placed by earlier players

**Window 1 (Player 1):**
1. [ ] Login as `e2e_player1`
2. [ ] Enter arena with character
3. [ ] Move token to position (100, 100)
4. [ ] Leave token there

**Window 2 (Player 2):**
5. [ ] Login as `e2e_player2`
6. [ ] Enter arena with character
7. [ ] **VERIFY:** Player 1's token is visible at (100, 100)
8. [ ] Move Player 2's token to (120, 120)

**Window 1 (Player 1):**
9. [ ] Refresh page, return to arena
10. [ ] **VERIFY:** Both tokens visible at correct positions

**Expected Result:** ✅ All tokens visible to all players
**Actual Result:** _____________

---

## Test Suite 2: GM Control Panel

### Test 2.1: GM Control Panel Visibility
**Goal:** Verify GM Control Panel only shows for GM

**As Player:**
1. [ ] Login as `e2e_player1`
2. [ ] Enter arena
3. [ ] **VERIFY:** No GM Control Panel visible (top-right corner)

**As GM:**
4. [ ] Logout, login as `e2e_testgm`
5. [ ] Enter arena
6. [ ] **VERIFY:** GM Control Panel visible in top-right corner
7. [ ] **VERIFY:** Panel shows:
   - Current map name (or "No map set")
   - Turn number and phase
   - Number of tokens on map

**Expected Result:** ✅ Panel only visible to GM
**Actual Result:** _____________

---

### Test 2.2: Map Change Clears All Tokens
**Goal:** Verify map change removes ALL player tokens (including offline players)

**Setup:**
1. [ ] Login as GM (`e2e_testgm`)
2. [ ] Have at least 2 player tokens on the map (from previous tests)
3. [ ] Note the number of tokens in GM panel (e.g., "Tokens: 2 on map")

**Execute Map Change:**
4. [ ] Click "🗺️ Change Map" button in GM Control Panel
5. [ ] Enter new map name: `desert_canyon`
6. [ ] Click "Confirm"
7. [ ] **VERIFY:** Toast notification appears: "Map changed to: desert_canyon. All tokens cleared!"
8. [ ] **VERIFY:** GM panel shows:
   - Map: desert_canyon
   - Tokens: 0 on map

**Verify from Player Perspective:**
9. [ ] In second window, login as `e2e_player1`
10. [ ] Enter arena with character
11. [ ] **VERIFY:** Map is empty (no tokens from previous session)
12. [ ] **VERIFY:** Can place new token on new map

**Expected Result:** ✅ Map change clears all tokens for all players
**Actual Result:** _____________

---

### Test 2.3: Game Reset Functionality
**Goal:** Verify game reset clears tokens and resets turn to 1

**Setup:**
1. [ ] Login as GM
2. [ ] Place a token on the map
3. [ ] Note current turn number in GM panel

**Execute Reset:**
4. [ ] Click "🔄 Reset Game" button
5. [ ] **VERIFY:** Warning appears: "⚠️ This will clear all tokens and reset turn to 1!"
6. [ ] Click "Yes, Reset"
7. [ ] **VERIFY:** Toast notification: "Game reset! All tokens cleared, turn reset to 1."
8. [ ] **VERIFY:** GM panel shows:
   - Turn: 1 (player phase)
   - Tokens: 0 on map
   - Map: (unchanged from before)

**Expected Result:** ✅ Reset clears tokens, resets turn, keeps map
**Actual Result:** _____________

---

## Test Suite 3: Token Ownership Authorization

### Test 3.1: Player Cannot Move Other Player's Token
**Goal:** Verify token ownership validation works

**Window 1 (Player 1):**
1. [ ] Login as `e2e_player1`
2. [ ] Enter arena, place token at (50, 50)

**Window 2 (Player 2):**
3. [ ] Login as `e2e_player2`
4. [ ] Enter arena
5. [ ] Try to drag Player 1's token
6. [ ] **VERIFY:** Token does NOT move (ownership validation prevents it)
7. [ ] **VERIFY:** Can move own token freely

**Expected Result:** ✅ Players can only move their own tokens
**Actual Result:** _____________

---

### Test 3.2: GM Can Move Any Token
**Goal:** Verify GM has full token control

**Setup:**
1. [ ] Have tokens from 2 different players on the map (from previous tests)

**As GM:**
2. [ ] Login as `e2e_testgm`
3. [ ] Enter arena
4. [ ] **VERIFY:** Can drag Player 1's token
5. [ ] **VERIFY:** Can drag Player 2's token
6. [ ] Move both tokens to new positions

**As Player:**
7. [ ] In second window as `e2e_player1`
8. [ ] **VERIFY:** Token moved by GM is at new position

**Expected Result:** ✅ GM can move all tokens
**Actual Result:** _____________

---

## Test Suite 4: WebSocket Real-Time Sync

### Test 4.1: Real-Time Token Movement
**Goal:** Verify token movements sync in real-time via WebSocket

**Setup:** Two browser windows side-by-side

**Window 1 (Player 1):**
1. [ ] Login as `e2e_player1`, enter arena

**Window 2 (Player 2):**
2. [ ] Login as `e2e_player2`, enter arena

**Execute:**
3. [ ] In Window 1, move Player 1's token
4. [ ] **VERIFY:** Window 2 immediately shows the move (no refresh needed)
5. [ ] In Window 2, move Player 2's token
6. [ ] **VERIFY:** Window 1 immediately shows the move

**Expected Result:** ✅ Token movements appear instantly in other clients
**Actual Result:** _____________

---

## Test Suite 5: Edge Cases

### Test 5.1: Map Change While Players Online
**Goal:** Verify map change works correctly when players are actively online

**Setup:**
1. [ ] Window 1: GM logged in, in arena
2. [ ] Window 2: Player 1 logged in, in arena with token at (80, 80)

**Execute:**
3. [ ] In Window 1 (GM), change map to `saloon_interior`
4. [ ] **VERIFY:** Window 1 shows "Map changed" notification
5. [ ] In Window 2 (Player 1), refresh page
6. [ ] Return to arena
7. [ ] **VERIFY:** Token is gone (cleared by map change)
8. [ ] **VERIFY:** New tokens can be placed on `saloon_interior`

**Expected Result:** ✅ Map change clears tokens for all players immediately
**Actual Result:** _____________

---

### Test 5.2: Server Restart Persistence
**Goal:** Verify game state survives backend restart

**Note:** This test requires Railway access to restart the backend service

1. [ ] Place tokens on the map as multiple players
2. [ ] Note positions and map name in GM panel
3. [ ] Restart backend service in Railway dashboard
4. [ ] Wait for backend to come back online (~30 seconds)
5. [ ] Refresh frontend
6. [ ] **VERIFY:** All tokens restored to previous positions
7. [ ] **VERIFY:** Map name preserved
8. [ ] **VERIFY:** Turn number preserved

**Expected Result:** ✅ Full game state persists across restart
**Actual Result:** _____________

---

## Summary

**Total Tests:** 12
**Passed:** ___ / 12
**Failed:** ___ / 12

**Critical Issues Found:**
- _____________________________________________
- _____________________________________________

**Minor Issues Found:**
- _____________________________________________
- _____________________________________________

**Overall Assessment:** ✅ Pass / ❌ Fail / ⚠️ Pass with Issues

---

## Notes
_Use this section for any additional observations, browser console errors, or unexpected behavior_

