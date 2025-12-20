# Manual Testing Scenario

Quick-launch tool for manual testing with 3 browsers auto-logged in as game master and 2 arcane player characters.

## 🎯 Purpose

Save time during manual testing by:
- ✅ Automatically creating 2 fully-equipped arcane test characters
- ✅ Launching 3 incognito Chrome browsers simultaneously
- ✅ Auto-logging in as GM and 2 players
- ✅ Auto-selecting characters and navigating to game
- ✅ Characters pre-loaded with all powers, skills, and equipment

## 📋 Prerequisites

1. **Backend running** on http://localhost:8080
2. **Frontend running** on http://localhost:3000
3. **PostgreSQL database** accessible
4. **Node.js** installed with Puppeteer

## 🚀 Quick Start

### First Time Setup

1. **Install Puppeteer** (one-time):
   ```bash
   npm install --save-dev puppeteer
   ```

2. **Run the all-in-one script**:
   ```bash
   cd test/manual-testing
   setup-and-launch.bat
   ```

   This will:
   - Check if backend/frontend are running
   - Create test characters in database
   - Launch 3 browsers with auto-login

### Quick Launch (After First Setup)

If you've already run setup before:

```bash
cd test/manual-testing
launch.bat
```

This just launches the 3 browsers without re-creating characters.

## 🎮 Test Characters

### Player 1: Arcane Huckster
- **Username:** `testplayer1`
- **Password:** `password`
- **Powers:** All Huckster and universal powers (Bolt, Blast, Lower Trait, Deflection, Smite, Stun, Dispel)
- **Skills:** Hexslinging d10, Shooting d8, Fighting d6, Notice d8, Persuasion d6, Stealth d6, Guts d8
- **Equipment:** Colt Peacemaker, Knife, Playing Cards, Ammunition
- **Stats:**
  - Agility d8, Smarts d10, Spirit d8, Strength d6, Vigor d6
  - Power Points: 20/20
  - Fate Chips: 5

### Player 2: Divine Blessed
- **Username:** `testplayer2`
- **Password:** `password`
- **Powers:** All Blessed and universal powers (Bolt, Blast, Armor, Healing, Boost Trait, Deflection, Smite, Stun, Dispel)
- **Skills:** Faith d10, Shooting d6, Fighting d8, Notice d8, Healing d8, Persuasion d8, Guts d10
- **Equipment:** Winchester Rifle, Bowie Knife, Holy Symbol, Bible, Medical Supplies
- **Stats:**
  - Agility d6, Smarts d8, Spirit d10, Strength d6, Vigor d8
  - Power Points: 20/20
  - Fate Chips: 5

### Game Master
- **Username:** `gamemaster`
- **Password:** `password`
- **Access:** Full GM controls, AI Assistant, map generation, etc.

## 📂 Files

```
test/manual-testing/
├── README.md                      # This file
├── setup-test-characters.sql      # SQL to create test characters
├── launch-test-scenario.js        # Node.js script to launch browsers
├── setup-and-launch.bat          # All-in-one: setup + launch
└── launch.bat                     # Quick launch only
```

## 🔧 Manual Setup (If Scripts Fail)

### 1. Create Test Characters Manually

Run the SQL script directly:

```bash
psql -U deadlands -d deadlands -f test/manual-testing/setup-test-characters.sql
```

Or copy/paste the SQL from `setup-test-characters.sql` into your database client (pgAdmin, DBeaver, etc.)

### 2. Launch Browsers Manually

```bash
node test/manual-testing/launch-test-scenario.js
```

## 🎨 Customization

### Change URLs

Set environment variables before running:

```bash
set FRONTEND_URL=http://localhost:5173
set API_URL=http://localhost:8081/api
launch.bat
```

### Modify Test Characters

Edit `setup-test-characters.sql` to:
- Change character stats
- Add/remove powers
- Modify equipment
- Adjust skill levels

### Browser Window Positions

Edit `launch-test-scenario.js` line 48:
```javascript
'--window-position=${index * 640},0',  // Change 640 to adjust spacing
'--window-size=640,900',               // Change size
```

## 🐛 Troubleshooting

### "Backend is not running"
Start the backend:
```bash
cd backend
mvnw.cmd spring-boot:run
```

### "Frontend is not running"
Start the frontend:
```bash
cd frontend
npm run dev
```

### "Characters not found"
The SQL setup didn't run. Run manually:
```bash
psql -U deadlands -d deadlands -f test/manual-testing/setup-test-characters.sql
```

### Puppeteer errors
Install Puppeteer:
```bash
npm install --save-dev puppeteer
```

### Chrome doesn't launch
Make sure Chrome is installed and in your PATH, or Puppeteer will download Chromium automatically.

## 📊 What Gets Created

### Database Tables Modified
- `users` - Creates testplayer1 and testplayer2 (if they don't exist)
- `characters` - Creates 2 arcane characters
- `arcane_powers` - Links all appropriate powers to characters
- `skills` - Adds 7 skills per character
- `equipment` - Adds 5-6 items per character
- `edges` - Adds 5 edges per character

### Browser Sessions
- 3 independent incognito Chrome instances
- Each with its own session (no shared cookies)
- Positioned side-by-side for easy viewing
- Auto-logged in and ready to test

## 🎯 Testing Workflow

1. Run `setup-and-launch.bat`
2. Wait for 3 browsers to open
3. All browsers auto-login and navigate
4. **GM Browser:** Control turn order, manage game state
5. **Player 1 Browser:** Test Huckster powers (Bolt, Stun, etc.)
6. **Player 2 Browser:** Test Blessed powers (Healing, Armor, etc.)
7. Test power casting, fate chips, wound management
8. Close browsers when done

## 💡 Use Cases

### Testing Power Casting
- Cast Bolt from Huckster
- See power points deduct in real-time
- Cast Healing from Blessed on wounded character
- Verify WebSocket sync across all browsers

### Testing Combat
- GM advances turn
- Players see turn update in all browsers
- Test wound application and soaking
- Test fate chip spending

### Testing Multiplayer Sync
- Move token in one browser
- See it move in all browsers
- Test turn management
- Test character state sync

## 📝 Notes

- **Characters persist** between runs - no need to recreate unless you want fresh state
- **Browsers stay open** - close manually when done testing
- **Incognito mode** - no cache conflicts between test runs
- **Side-by-side layout** - Easy to see all 3 browsers at once
- **Auto-login** - Saves time typing credentials repeatedly

## 🚀 Future Enhancements

Potential improvements:
- [ ] Add more test characters (Shaman, Mad Scientist)
- [ ] Auto-navigate all characters to arena
- [ ] Pre-position characters on map
- [ ] Auto-start combat scenario
- [ ] Headless mode option for CI/CD
- [ ] Screenshot capture on test completion

---

**Happy Testing! 🎮**
