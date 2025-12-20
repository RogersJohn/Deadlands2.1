# Deadlands Savage Worlds Rules - Gap Analysis

**Date:** 2025-11-24
**Purpose:** Identify missing features from Deadlands Reloaded / Savage Worlds rules

---

## Current Implementation Status

### ✅ What EXISTS (Already Implemented)

#### Character System
- **Attributes:** All 5 Savage Worlds attributes (Agility, Smarts, Spirit, Strength, Vigor) ✅
- **Derived Stats:** Pace, Parry, Toughness, Charisma ✅
- **Skills:** 70+ skills with dice values (Fighting, Shooting, Guts, Hexslinging, Faith, etc.) ✅
- **Edges:** 10 edges (Duelist, Hip-Shooting, Martial Arts, Card Sharp, etc.) ✅
- **Hindrances:** 18 hindrances (Bad Dreams, Grim Servant o' Death, Tenderfoot, etc.) ✅
- **Equipment:** 20+ weapons (Colt Peacemaker, Winchester, etc.) and gear ✅
- **Arcane Powers:** 18 powers (Healing, Smite, Bolt, Mind Rider, etc.) ✅
- **Wounds:** Wound tracking with location and severity ✅
- **Grit:** Field exists (not used in combat yet) ✅
- **Wind:** Field exists (legacy, might be deprecated) ✅

#### Game State & Combat
- **Turn Management:** Turn number and phase (player/enemy/resolution) ✅
- **Token Positioning:** X/Y coordinates on maps ✅
- **Map System:** Current map tracking ✅
- **Basic Combat:** CombatManager with Savage Worlds rules ✅
  - Ranged combat modifiers (aiming, called shots)
  - Illumination penalties (Bright/Dim/Dark/Pitch Black)
  - Multi-action penalties
  - Gang Up bonus (partial)
  - Shaken condition (not persisted)
- **WebSocket Sync:** Real-time updates for moves and turns ✅

#### Reference Data
- **18 Hindrances** (need ~40 total from Deadlands Reloaded)
- **10 Edges** (need ~60 total from Deadlands Reloaded)
- **70+ Skills** (comprehensive)
- **20+ Equipment items** (need ~100 for full catalog)
- **18 Arcane Powers** (need ~50 for all Savage Worlds + Deadlands)

---

## ❌ CRITICAL GAPS (Game-Breaking Omissions)

### 1. **Power Points System** ⚠️ HIGHEST PRIORITY
**Status:** NOT IMPLEMENTED
**Impact:** Characters with arcane backgrounds cannot use their powers

**Missing:**
- `currentPowerPoints` field on Character
- `maxPowerPoints` field on Character
- API to spend/restore power points
- UI to display PP: 10/15
- Power point costs enforced when casting
- Natural recovery (1 PP per hour rest)

**Database Change Required:** YES
```sql
ALTER TABLE characters ADD COLUMN current_power_points INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN max_power_points INTEGER DEFAULT 10;
```

---

### 2. **Fate Chips (Bennies)** ⚠️ HIGHEST PRIORITY
**Status:** NOT IMPLEMENTED
**Impact:** Core Savage Worlds mechanic missing - players can't reroll or soak

**Missing:**
- `fateChips` field on Character
- Starting chips per session (3 for extras, 4 for Wild Cards)
- GM fate chip pool
- UI to display chips
- Actions: Reroll, Soak damage, Recover from Shaken, Influence story
- WebSocket sync for chip usage

**Database Change Required:** YES
```sql
ALTER TABLE characters ADD COLUMN fate_chips INTEGER DEFAULT 3;
```

---

### 3. **Wounds & Incapacitation in Combat** ⚠️ HIGH PRIORITY
**Status:** PARTIALLY IMPLEMENTED (database exists, not integrated)
**Impact:** Damage doesn't affect characters properly

**Missing:**
- Apply wounds when damage exceeds Toughness
- Track wound penalties (-1 per wound)
- Incapacitation at 4+ wounds
- Bleeding out mechanic
- Vigor roll to avoid incapacitation
- UI to show wound count and penalties
- Healing in combat

**Current:** Wounds table exists but CombatManager uses separate health tracking

---

### 4. **Dice Mechanics - Acing (Exploding Dice)** ⚠️ HIGH PRIORITY
**Status:** UNKNOWN (need to check DiceRoller.ts)
**Impact:** Dice rolls may not follow Savage Worlds rules

**Required:**
- When die shows max value (6 on d6, 8 on d8, etc.), roll again and add
- Wild Cards roll Trait die + Wild Die (d6), take higher
- Only Trait die aces, not Wild Die in Savage Worlds Deluxe
- Damage dice all ace

---

### 5. **Card-Based Initiative** ⚠️ HIGH PRIORITY
**Status:** NOT IMPLEMENTED
**Impact:** Turn order is not Savage Worlds compliant

**Missing:**
- Deal cards to all combatants each round
- Turn order by card rank (Aces high, then King, Queen, etc.)
- Jokers give bonus (+2 to all actions, +2 to damage, act whenever)
- Quick Edge: Draw additional card, choose best
- Level Headed Edge: Draw 2 cards, choose best

**Alternative:** Could use "Going Last" optional rule (Agility rolls)

---

### 6. **Soaking Damage** ⚠️ HIGH PRIORITY
**Status:** NOT IMPLEMENTED
**Impact:** Players can't spend bennies to reduce wounds

**Required:**
- After taking wound(s), spend 1 Fate Chip
- Make Vigor roll at -1 per wound taken this hit
- Each success/raise removes one wound
- Must be done immediately after taking damage

---

### 7. **Shaken & Recovery** ⚠️ MEDIUM PRIORITY
**Status:** PARTIALLY IMPLEMENTED (in CombatManager, not persisted)
**Impact:** Stun effects don't work properly

**Missing:**
- When damaged but no wounds, character becomes Shaken
- Shaken = can only take free actions
- Recovery: Spirit roll to remove Shaken (start of turn)
- Spend Fate Chip to instantly recover
- Multiple Shaken hits can cause wounds

---

### 8. **Huckster Hexslinging (Card Draw)** ⚠️ MEDIUM PRIORITY
**Status:** NOT IMPLEMENTED
**Impact:** Huckster archetype doesn't work as designed

**Required:**
- Draw 5 cards from deck
- Make poker hand (pair, two pair, flush, etc.)
- Better hand = easier hex (TN reduction)
- Bust (pair or less) = backlash
- Hexslinging skill modifies TN
- Optional: Use actual UI card deck for immersion

---

### 9. **Grit Mechanic** ⚠️ MEDIUM PRIORITY
**Status:** FIELD EXISTS, NOT USED
**Impact:** Fear effects and morale don't work

**Missing:**
- Grit = bonus to Guts rolls vs fear
- Used in Fear Table lookups
- Modified by edges (True Grit) and hindrances (Tenderfoot)
- Currently stored on Character but not referenced in combat

---

### 10. **Range & Cover Modifiers** ⚠️ MEDIUM PRIORITY
**Status:** PARTIALLY IMPLEMENTED
**Impact:** Ranged combat not fully accurate

**Have:** Range brackets in equipment, illumination, called shots
**Missing:**
- Medium range: -2 penalty
- Long range: -4 penalty
- Extreme range: -8 penalty (with scope/edge)
- Cover: -2 (half cover), -4 (three-quarters), -6 (nearly total)
- Unstable platform: -2 (moving vehicle, horse)
- Recoil: -2 for automatic weapons

---

## 📊 REFERENCE DATA GAPS

### Edges (Need ~50 more)
**Current:** 10 edges
**Missing Categories:**
- **Combat:** Block, Counter-Attack, Dodge, First Strike, Frenzy, Level Headed, Nerves of Steel, Quick Draw, Trademark Weapon
- **Leadership:** Command, Hold the Line, Inspire, Natural Leader
- **Power:** New Power, Power Points, Rapid Recharge, Soul Drain
- **Professional:** Agent, Blessed, Huckster, Mad Scientist, Chi Master, Shaman
- **Social:** Charismatic, Connections, Common Bond, Strong Willed
- **Weird:** Brave, Sand, True Grit

### Hindrances (Need ~22 more)
**Current:** 18 hindrances
**Missing:**
- All Thumbs, Anemic, Arrogant, Bad Luck, Big Mouth, Bloodthirsty, Code of Honor, Curious, Death Wish, Delusional, Doubting Thomas, Elderly, Greedy, Habit, Hard of Hearing, Heroic, Illiterate, Loyal, Mean, Obese, Overconfident, Pacifist, Phobia, Poverty, Quirk, Small, Stubborn, Ugly, Vow, Wanted, Yellow

### Arcane Powers (Need ~35 more)
**Current:** 18 powers
**Missing Core Savage Worlds:**
- Armor, Banish, Barrier, Beast Friend, Blind, Bless, Confusion, Damage Field, Darksight, Detect/Conceal Arcana, Dispel, Divination, Drain Power Points, Elemental Manipulation, Entangle, Environmental Protection, Farsight, Fear, Fly, Growth/Shrink, Havoc, Illusion, Intangibility, Light/Darkness, Object Reading, Puppet, Sloth/Speed, Slumber, Sound/Silence, Speak Language, Stun, Summon Ally, Telekinesis, Teleport, Wall Walker, Warrior's Gift, Wilderness Walk, Zombie

**Missing Deadlands-Specific:**
- **Huckster Hexes:** Soul Blast, Texas Twister, Trinkets, Whateley Blood
- **Blessed Miracles:** Consecrate Ground, Guardian Angel, Holy Roller, Sanctify
- **Shaman:** Vision Quest, Totem Guardian, Nature's Fury
- **Mad Science:** Analytical Engine, Gatling Gun, Spring-Heeled Boots, Ghost Rock Bomb, Tesla Coil

### Equipment (Need ~80 more)
**Current:** 20+ items
**Missing:**
- More firearms (Gatling gun, Smith & Wesson, Remington, etc.)
- Armor (leather jacket, duster, iron plates)
- Explosives (dynamite, nitro, ghost rock bombs)
- Mad Science devices
- Horses and wagons
- Survival gear

---

## 🎮 GAMEPLAY FEATURES MISSING

### Combat Actions
- **Aim:** Take -2 action, get +2 on next attack (exists in CombatManager)
- **All-Out Attack:** +2 to attack, -2 to Parry until next action ❌
- **Called Shot:** -2 to -4 penalty for bonus effect (exists in CombatManager)
- **Defend:** +2 to Parry ❌
- **Disarm:** Opposed attack vs Agility or Strength ❌
- **Full Defense:** Parry +2, no attacks ❌
- **Grapple:** Opposed Strength rolls ❌
- **Multi-Action:** -2 per additional action (exists in CombatManager)
- **Run:** Move 2x Pace (exists in CombatManager)
- **Test of Wills:** Opposed Spirit or Intimidation ❌
- **Trick:** Opposed Smarts or Taunt, gain +2 on next action ❌
- **Wild Attack:** +2 to attack and damage, -2 to Parry ❌

### Chase Rules ❌
- Not needed for tabletop tactical combat yet

### Dramatic Tasks ❌
- Complex multi-turn challenges (not needed for MVP)

### Interludes ❌
- Story-building between sessions (not needed for MVP)

### Mass Battle Rules ❌
- Large-scale warfare (not needed for MVP)

### Social Conflict ❌
- Persuasion, Intimidation, Taunt mechanics partially exist

### Vehicle Rules ❌
- Trains, wagons, steamboats (not needed for MVP)

---

## 🏆 PRIORITY IMPLEMENTATION ROADMAP

### **PHASE 1: Core Mechanics (Essential for Playable Game)**
**Time Estimate:** 8-12 hours

1. **Power Points System** (2-3 hours)
   - Add fields to Character model
   - Create API endpoints (spend, restore)
   - Add UI to CharacterSheet
   - Display in GameArena HUD
   - Track during power casting

2. **Fate Chips (Bennies)** (3-4 hours)
   - Add field to Character model
   - GM chip pool in GameState
   - API: spend chip, reroll, soak
   - UI: chip display in HUD
   - Actions: Reroll, Soak, Remove Shaken

3. **Wounds in Combat** (2-3 hours)
   - Integrate Wound table with CombatManager
   - Apply wounds when damage > Toughness
   - Track wound penalties (-1 per wound)
   - Incapacitation at 4 wounds
   - Update UI to show wounds

4. **Verify Acing/Exploding Dice** (1 hour)
   - Review DiceRoller.ts
   - Test Wild Card trait + wild die
   - Ensure damage dice ace properly

---

### **PHASE 2: Savage Worlds Core Rules (Standard Gameplay)**
**Time Estimate:** 10-15 hours

5. **Shaken & Recovery** (2 hours)
   - Persist Shaken status to database
   - Add recovery action (Spirit roll)
   - Add "Soak" with Fate Chip
   - Update UI markers

6. **Card-Based Initiative** (3-4 hours)
   - Virtual card deck
   - Deal cards each combat round
   - Sort combatants by card rank
   - Joker handling (+2, act whenever)
   - Quick/Level Headed edge support

7. **Soaking Damage** (2 hours)
   - Spend Fate Chip after damage
   - Vigor roll to remove wounds
   - UI prompt after taking wounds

8. **Additional Combat Actions** (3-4 hours)
   - All-Out Attack
   - Defend/Full Defense
   - Disarm
   - Grapple
   - Test of Wills
   - Trick
   - Wild Attack
   - UI action buttons in combat

9. **Range & Cover Modifiers** (2-3 hours)
   - Calculate range brackets from token positions
   - Add cover selection in UI
   - Apply modifiers to attack rolls
   - Display in combat log

---

### **PHASE 3: Deadlands-Specific Features (Flavor)**
**Time Estimate:** 12-18 hours

10. **Huckster Hexslinging** (4-5 hours)
    - Virtual card deck for drawing
    - Poker hand evaluation
    - Backlash on poor hands
    - UI card display
    - Hexslinging TN modifiers

11. **Grit & Fear** (2-3 hours)
    - Integrate Grit into Guts rolls
    - Fear Table with effects
    - Marshal's rolls for horror
    - Phobia edge/hindrance support

12. **Blessed Miracles** (2 hours)
    - Faith checks
    - Sin penalties (track character behavior)
    - Divine favor mechanic

13. **Mad Science Devices** (3-4 hours)
    - Gizmo creation system
    - Malfunction rolls
    - Ghost Rock fuel tracking
    - Reliability mechanic

14. **Shaman Spirit World** (2-3 hours)
    - Favor with spirits
    - Ritual casting
    - Spirit guardian summoning

---

### **PHASE 4: Content Expansion (Polish)**
**Time Estimate:** 15-20 hours

15. **Expanded Reference Data** (6-8 hours)
    - Add 50+ edges
    - Add 22+ hindrances
    - Add 35+ arcane powers
    - Add 80+ equipment items
    - Database seed scripts

16. **Power Casting in Combat** (4-5 hours)
    - "Cast Power" action in GameArena
    - Target selection (friendly/enemy)
    - Power Point deduction
    - Visual effects in Phaser
    - WebSocket broadcast power casts

17. **Character Advancement** (3-4 hours)
    - XP tracking (already exists)
    - Spend XP to increase skills
    - Buy new edges
    - Increase attributes
    - Learn new powers

18. **Healing System** (2-3 hours)
    - Natural healing (Vigor roll per day)
    - Medicine skill healing
    - Blessed Healing power
    - Track healing attempts per wound

---

## 📝 RECOMMENDED NEXT STEPS

### Session 1: Power Points & Fate Chips (4-6 hours)
**Goal:** Make arcane characters and bennies functional

1. Database migration: Add `current_power_points`, `max_power_points`, `fate_chips`
2. Backend: Character model, API endpoints
3. Frontend: Display in CharacterSheet and GameArena HUD
4. Test with Blessed/Huckster characters

### Session 2: Wounds & Shaken (4-5 hours)
**Goal:** Integrate damage system properly

1. Connect Wounds table to CombatManager
2. Apply wounds based on Toughness
3. Implement Shaken persistence
4. Add wound penalties to UI
5. Test combat damage flow

### Session 3: Soaking & Acing (3-4 hours)
**Goal:** Complete core Savage Worlds mechanics

1. Verify exploding dice in DiceRoller
2. Implement Soak action with Fate Chips
3. Test full damage → wounds → soak → recovery flow
4. Polish UI feedback

### Session 4: Choose Your Path
- **Option A:** Card initiative + Huckster hex slinging (Deadlands flavor)
- **Option B:** Expand reference data (edges, powers, equipment)
- **Option C:** Power casting in combat (gameplay depth)

---

## 🎯 CRITICAL SUCCESS FACTORS

### Must-Have for "Playable" MVP:
1. ✅ Power Points (cast spells)
2. ✅ Fate Chips (reroll, soak)
3. ✅ Wounds (take damage properly)
4. ✅ Acing (dice rules correct)
5. ✅ Shaken (stun effects)

### Should-Have for "Good" Experience:
6. Card Initiative (Savage Worlds feel)
7. Soaking Damage (survivability)
8. Combat Actions (tactical depth)
9. Huckster Card Draw (Deadlands flavor)
10. More Powers (variety)

### Nice-to-Have for "Complete" System:
11. Grit & Fear (horror atmosphere)
12. Blessed/Shaman/Mad Science mechanics
13. Full reference data catalog
14. Character advancement
15. Healing system

---

## 📚 RESOURCES

### Official Rules References:
- **Savage Worlds Deluxe Edition** (core rules)
- **Deadlands Reloaded Player's Guide** (setting-specific)
- **Deadlands Reloaded Marshal's Handbook** (GM rules)

### Implementation Patterns:
- Turn Management: See `TURN_MANAGEMENT_IMPLEMENTATION.md`
- State Management: See `STATE_MANAGEMENT.md`
- WebSocket Sync: See `websocketService.ts`
- Combat Mechanics: See `CombatManager.ts`

---

**Next Action:** Review this analysis and choose Phase 1 features to implement first.
