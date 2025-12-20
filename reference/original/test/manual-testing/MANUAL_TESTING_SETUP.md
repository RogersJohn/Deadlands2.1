# Manual Testing Setup - Complete Implementation

**Created:** 2025-11-24
**Purpose:** Time-saving tool for manual testing with automated browser launch and login

---

## 📦 What Was Created

### 1. Database Setup (`setup-test-characters.sql`)

**Creates:**
- 2 test user accounts (testplayer1, testplayer2)
- 2 fully-equipped arcane characters:
  - **Arcane Huckster** - Offensive/utility powers
  - **Divine Blessed** - Healing/defensive powers
- All appropriate powers assigned to each character
- Full skill sets (7 skills each)
- Complete equipment loadouts (5-6 items each)
- Character edges (5 edges each)

**Character Stats:**
- **Power Points:** 20/20 (fully charged for testing)
- **Fate Chips:** 5 (plenty for testing)
- **Veteran-level XP:** 40 XP
- **Wounds:** 0 (healthy starting state)
- **Attributes:** Optimized for each class

### 2. Browser Launcher (`launch-test-scenario.js`)

**Node.js script using Puppeteer:**
- Launches 3 incognito Chrome browsers
- Auto-logs in each browser:
  - Browser 1: gamemaster
  - Browser 2: testplayer1 (Arcane Huckster)
  - Browser 3: testplayer2 (Divine Blessed)
- Auto-navigates to appropriate pages:
  - GM → Dashboard
  - Players → Character Select → Arena
- Auto-selects characters for players
- Positions windows side-by-side (640px width each)
- Keeps browsers open after script completes

**Features:**
- Independent sessions (no shared cookies)
- Error handling and status messages
- Configurable via environment variables
- Handles missing characters gracefully

### 3. Batch Scripts

**`setup-and-launch.bat` - All-in-one script:**
- Checks if backend is running
- Checks if frontend is running
- Runs SQL to create test characters
- Launches 3 browsers with auto-login
- Full error handling and user feedback

**`launch.bat` - Quick launch:**
- Just launches browsers (assumes setup already done)
- Faster for repeated test runs

### 4. Documentation

**`README.md` - Complete documentation:**
- Purpose and features
- Prerequisites and setup
- Usage instructions
- Character details
- Troubleshooting guide
- Customization options

**`QUICK_START.md` - Quick reference:**
- Fastest way to launch
- What you'll see
- Quick test scenarios
- Common troubleshooting

**`MANUAL_TESTING_SETUP.md` - This file:**
- Implementation summary
- What was created
- Usage patterns
- Future enhancements

### 5. Package Configuration

**`package.json` updates:**
- Added puppeteer as devDependency
- Added npm scripts:
  - `npm run test:manual` - Launch test scenario
  - `npm run test:setup` - Run SQL setup

---

## 🎯 Usage Patterns

### First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Start backend
cd backend
mvnw.cmd spring-boot:run

# 3. Start frontend (in new terminal)
cd frontend
npm run dev

# 4. Run setup and launch (in new terminal)
test\manual-testing\setup-and-launch.bat
```

### Quick Launch (Subsequent Runs)

```bash
# Backend and frontend already running
npm run test:manual

# OR
test\manual-testing\launch.bat
```

### Manual Database Setup (If Automated Fails)

```bash
psql -U deadlands -d deadlands -f test/manual-testing/setup-test-characters.sql
```

---

## 🧪 Test Scenarios

### Scenario 1: Power Casting
1. Launch test scenario
2. In Player 1 browser, click ⚡ Powers button
3. Cast Bolt (1 PP)
4. Verify power points drop from 20 → 19
5. Check combat log for cast message
6. Repeat with different powers

### Scenario 2: Multiplayer Sync
1. In GM browser, advance turn
2. Verify turn number updates in all 3 browsers
3. Move a character token in one browser
4. Verify token moves in all browsers
5. Test WebSocket synchronization

### Scenario 3: Combat System
1. In GM controls, apply damage to Player 1
2. Verify wounds appear in Player 1 browser
3. Use fate chip to soak damage in Player 1
4. Verify fate chips decrease
5. Test wound recovery

### Scenario 4: Character Powers Comparison
1. Open Powers panel in both player browsers
2. Compare Huckster powers vs Blessed powers
3. Test offensive powers (Bolt, Blast, Stun)
4. Test defensive powers (Armor, Deflection)
5. Test utility powers (Boost Trait, Dispel)
6. Test unique powers (Healing - Blessed only)

---

## 💡 Time Savings

**Without automation:**
- Open 3 browsers manually: ~30 seconds
- Login 3 times: ~1 minute
- Navigate to correct pages: ~30 seconds
- Select characters: ~30 seconds
- **Total:** ~2.5 minutes per test run

**With automation:**
- Run script: 5 seconds
- Wait for browsers to launch: ~15 seconds
- **Total:** ~20 seconds per test run

**Savings:** ~2 minutes per test run = **80% time reduction**

Plus:
- No typing errors in credentials
- No forgetting which character is which
- Consistent test setup every time
- No manual positioning of windows

---

## 🔧 Customization Options

### Change Browser Layout

Edit `launch-test-scenario.js` line 48-49:
```javascript
'--window-position=${index * 640},0',  // Horizontal spacing
'--window-size=640,900',               // Width x Height
```

### Change URLs

Set environment variables:
```bash
set FRONTEND_URL=http://localhost:5173
set API_URL=http://localhost:8081/api
npm run test:manual
```

### Add More Characters

Edit `setup-test-characters.sql`:
1. Add new INSERT for character
2. Add powers, skills, equipment
3. Update accounts array in `launch-test-scenario.js`

### Change Credentials

Update `setup-test-characters.sql` and `launch-test-scenario.js` with new usernames/passwords.

---

## 🚀 Future Enhancements

### Potential Improvements

1. **Additional Characters:**
   - Shaman character (Chi Mastery powers)
   - Mad Scientist character (Weird Science)
   - Non-arcane character (for comparison testing)

2. **Auto-Navigation:**
   - Auto-navigate players to arena
   - Auto-position characters on map
   - Auto-start combat scenario

3. **Pre-configured Scenarios:**
   - Combat scenario (characters in combat positions)
   - Power testing scenario (characters spread out)
   - Multiplayer scenario (all players on different map areas)

4. **Testing Utilities:**
   - Screenshot capture on errors
   - Auto-refresh on code changes
   - Performance monitoring
   - Network traffic inspection

5. **CI/CD Integration:**
   - Headless mode for automated testing
   - Screenshot comparison tests
   - API endpoint validation
   - Database state verification

6. **Advanced Features:**
   - Record test sessions (video)
   - Automated test case execution
   - Test result reporting
   - Integration with Jest/Playwright

---

## 📊 Database Impact

**Tables Modified:**
- `users` - 2 test users added (on conflict: do nothing)
- `characters` - 2 characters created (deletes existing first)
- `arcane_powers` - ~8-10 power assignments per character
- `skills` - 7 skills per character
- `equipment` - 5-6 items per character
- `edges` - 5 edges per character

**Total Rows Added:** ~35-40 rows per run

**Safe to run multiple times:** Yes, script uses DELETE before INSERT for characters, and ON CONFLICT DO NOTHING for users.

---

## 🎓 Learning Benefits

This setup teaches:
- **Puppeteer automation** - Browser automation techniques
- **Test data management** - SQL seeding patterns
- **Multi-session testing** - Simulating real multiplayer scenarios
- **Batch scripting** - Automating developer workflows
- **Time optimization** - Reducing repetitive tasks

---

## 📝 Notes

- **Characters persist** between runs - no need to recreate unless you want fresh state
- **Incognito mode** - Prevents cache conflicts
- **Independent sessions** - Each browser has its own authentication
- **Side-by-side layout** - Easy visual comparison during testing
- **Manual control** - You control when to close browsers

---

## ✅ Verification

To verify setup worked:

1. **Check characters exist:**
   ```sql
   SELECT name, occupation, current_power_points, max_power_points
   FROM characters
   WHERE name IN ('Arcane Huckster', 'Divine Blessed');
   ```

2. **Check powers assigned:**
   ```sql
   SELECT c.name, COUNT(ap.id) as power_count
   FROM characters c
   LEFT JOIN arcane_powers ap ON c.id = ap.character_id
   WHERE c.name IN ('Arcane Huckster', 'Divine Blessed')
   GROUP BY c.name;
   ```

3. **Check browsers launched:**
   - Look for 3 Chrome windows
   - Check each is on correct URL
   - Verify each is logged in

---

**Manual testing setup complete! Time to test Phase 3 powers! 🎮**
