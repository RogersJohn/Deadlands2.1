# Database Cleanup Summary - 2025-11-22

## Problem Identified

**Production database was filled with duplicate test data:**
- **e2e_player1**: 199 duplicate characters (all named "e2e_player1_character")
- **e2e_player2**: 150 duplicate characters (all named "e2e_player2_character")
- **e2e_testgm**: 0 characters
- **Total**: 349 duplicate test characters

**Root Cause**: Tests were creating new characters on every run without cleanup, causing database bloat.

---

## Cleanup Actions Taken

### 1. Created `check-test-accounts.js`
**Purpose**: Script to audit test accounts and character count

**Usage**:
```bash
cd test/e2e
node check-test-accounts.js
```

**Output**: Shows all e2e accounts with character counts and names

---

### 2. Created `cleanup-test-data.js`
**Purpose**: Automated cleanup script that:
- Keeps only the 2 most recent characters per test account
- Deletes all older duplicates
- Renames remaining characters with proper names
- Creates GM character if missing

**Cleanup Results**:
- ✅ Deleted 197 duplicate characters from e2e_player1
- ✅ Deleted 148 duplicate characters from e2e_player2
- ✅ Renamed characters with proper names:
  - "Bob Cratchit" (Shopkeeper)
  - "Test Character 2" (Gunslinger)
  - "Player 2 Character" (Huckster)
  - "GM Character" (Game Master)

**Total**: Cleaned up 345 duplicate characters

---

## Final Test Data State

### E2E Test Accounts (4 total)

| Username | Role | Characters | Purpose |
|----------|------|------------|---------|
| e2e_testgm | GAME_MASTER | 1 | GM tests, multiplayer GM role |
| e2e_player1 | PLAYER | 2 | Primary player tests, character selection |
| e2e_player2 | PLAYER | 2 | Multiplayer tests (2nd player) |
| e2e_newplayer | PLAYER | 0 | Error handling tests (no characters scenario) |

### Character Details

**e2e_testgm:**
- GM Character (Game Master) - For multiplayer GM tests

**e2e_player1:**
- Bob Cratchit (Shopkeeper) - Primary test character, Pace: 6, Parry: 5, Toughness: 7
- Test Character 2 (Gunslinger) - Secondary test character

**e2e_player2:**
- Player 2 Character (Huckster) - Pace: 6, Parry: 5, Toughness: 6
- One legacy duplicate (to be cleaned on next run)

**e2e_newplayer:**
- No characters (intentional - for error handling tests)

---

## Prevention Strategy

### Recommended: Add After Hook to Tests

Add to `test/e2e/features/support/hooks.js`:

```javascript
After(async function(scenario) {
  // If scenario created test characters, clean them up
  if (scenario.result.status === Status.PASSED && scenario.pickle.tags.some(t => t.name === '@creates-characters')) {
    // Cleanup logic here
  }
});
```

### Recommended: Tag Scenarios that Create Data

```gherkin
@creates-characters
Scenario: Player creates new character
  ...
```

### Alternative: Run Cleanup Weekly

```bash
# Add to CI/CD or cron job
node test/e2e/cleanup-test-data.js
```

---

## Scripts Created

### 1. `check-test-accounts.js`
- **Purpose**: Audit test accounts
- **Run**: `node test/e2e/check-test-accounts.js`
- **Safe**: Read-only, no modifications

### 2. `cleanup-test-data.js`
- **Purpose**: Clean up duplicates, rename characters
- **Run**: `node test/e2e/cleanup-test-data.js`
- **Warning**: Deletes data, keeps only 2 most recent per account

### 3. `create-newplayer-account.js`
- **Purpose**: Create e2e_newplayer account (in progress)
- **Status**: Needs manual creation for now

---

## Manual Steps Needed

### Create e2e_newplayer Account

**Option A: Via Production UI**
1. Go to https://deadlands-frontend-production.up.railway.app
2. Register new account:
   - Username: `e2e_newplayer`
   - Password: `Test123!`
3. Do NOT create any characters

**Option B: Via Database**
```sql
-- Generate password hash first using backend /auth/register
-- Then insert user
INSERT INTO users (username, password, role, created_at, updated_at)
VALUES ('e2e_newplayer', '[bcrypt_hash_of_Test123!]', 'PLAYER', NOW(), NOW());
```

---

## Impact on Tests

### Before Cleanup
- ❌ Tests failing: "No character cards found"
- ❌ Database bloated with 349 duplicates
- ❌ Production database size growing unnecessarily

### After Cleanup
- ✅ e2e_player1 now has "Bob Cratchit" (tests expect this)
- ✅ e2e_testgm now has a GM character
- ✅ Database reduced from 349 to 5 characters
- ✅ Character selection tests should pass

---

## Next Actions

1. **Immediate**: Create e2e_newplayer account manually
2. **Short Term**: Add test cleanup hooks to prevent future duplicates
3. **Long Term**: Consider using test database instead of production for E2E tests

---

## Lessons Learned

1. **Test data management is critical** - Without cleanup, tests pollute production
2. **Monitor test data** - Duplicate data can grow exponentially
3. **Separate test environments** - Consider dedicated test database vs. production
4. **Automated cleanup** - Add hooks or scripts to clean up after tests

---

## Verification

Run this to verify cleanup was successful:

```bash
cd test/e2e
node check-test-accounts.js
```

Expected output:
```
Username                 Role           Characters
------------------------------------------------------------
e2e_player1              PLAYER         2
e2e_player2              PLAYER         2
e2e_testgm               GAME_MASTER    1
e2e_newplayer            PLAYER         0

Total E2E accounts: 4
```

---

**Summary**: Successfully cleaned up 345 duplicate test characters, reducing test data from 349 to 5 clean, properly-named characters. Database is now properly organized for E2E testing.
