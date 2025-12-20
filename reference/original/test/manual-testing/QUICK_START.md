# Manual Testing - Quick Start Guide

## 🚀 Fastest Way to Launch

1. **Install Puppeteer** (first time only):
   ```bash
   npm install
   ```

2. **Make sure backend and frontend are running**:
   - Backend: `cd backend && mvnw.cmd spring-boot:run`
   - Frontend: `cd frontend && npm run dev`

3. **Run the test scenario**:
   ```bash
   # Option 1: Use batch script (Windows)
   test\manual-testing\setup-and-launch.bat

   # Option 2: Use npm script
   npm run test:manual

   # Option 3: Run Node.js directly
   node test/manual-testing/launch-test-scenario.js
   ```

## 🎮 What You'll See

**3 Chrome browsers will open automatically:**

1. **Browser 1 (Left):** Game Master @ http://localhost:3000/dashboard
2. **Browser 2 (Middle):** Player 1 (Arcane Huckster) @ http://localhost:3000/arena
3. **Browser 3 (Right):** Player 2 (Divine Blessed) @ http://localhost:3000/arena

**All browsers are:**
- ✅ Incognito mode (no cache conflicts)
- ✅ Auto-logged in
- ✅ Ready to test immediately

## 🧙 Test Characters

### Arcane Huckster (Player 1)
- **Powers:** Bolt, Blast, Lower Trait, Deflection, Smite, Stun, Dispel
- **Power Points:** 20/20
- **Fate Chips:** 5
- **Best for testing:** Offensive powers, hexslinging

### Divine Blessed (Player 2)
- **Powers:** Bolt, Blast, Armor, Healing, Boost Trait, Deflection, Smite, Stun, Dispel
- **Power Points:** 20/20
- **Fate Chips:** 5
- **Best for testing:** Healing, defensive buffs, miracles

## ⚡ Quick Test Scenarios

### Test Power Casting
1. Click ⚡ Powers button in Player 1 browser
2. Click "Cast" on Bolt (1 PP)
3. See power points drop from 20 → 19
4. Check combat log for cast message

### Test Multiplayer Sync
1. In GM browser, click "Next Turn"
2. See turn number update in all 3 browsers
3. Test WebSocket synchronization

### Test Combat System
1. Open GM controls
2. Apply 10 damage to Player 1
3. See wounds update in Player 1 browser
4. Use fate chip to soak damage
5. See power points and fate chips update

## 🔧 Troubleshooting

**"Backend not running"**
```bash
cd backend
mvnw.cmd spring-boot:run
```

**"Frontend not running"**
```bash
cd frontend
npm run dev
```

**"Characters not found"**
The SQL didn't run. The batch script tries to run it automatically, but if it fails:
```bash
psql -U deadlands -d deadlands -f test/manual-testing/setup-test-characters.sql
```

**"Puppeteer not installed"**
```bash
npm install
```

## 💡 Pro Tips

1. **Keep browsers open** between test runs - just refresh if needed
2. **Use incognito** to avoid cache issues
3. **Position windows side-by-side** - script does this automatically
4. **Close manually** when done - browsers stay open after script completes

## 📊 What Gets Created

- 2 test users: `testplayer1`, `testplayer2` (password: `password`)
- 2 arcane characters with all powers, skills, and equipment
- Ready-to-test combat scenario

## 🎯 Next Steps

Once browsers are open:
1. Test Phase 3 power casting
2. Test multiplayer synchronization
3. Test combat mechanics
4. Test WebSocket updates

See [README.md](README.md) for full documentation.

---

**Time Saved:** ~5 minutes per test run! 🚀
