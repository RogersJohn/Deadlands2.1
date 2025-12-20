# Ranged Combat Development Plan
## Savage Worlds & Deadlands Combat Rules Implementation

**Created:** 2025-11-11
**Status:** Planning Phase
**Priority:** HIGH - Core Gameplay Feature

---

## Executive Summary

The Game Arena v1.0 has a solid foundation with basic Savage Worlds mechanics, but is missing critical ranged combat rules that are essential for authentic Deadlands gameplay. This document outlines a phased approach to implementing comprehensive ranged combat mechanics.

**Current State:** Basic combat with parry rules, movement, and damage
**Goal:** Full Savage Worlds ranged combat with all modifiers, cover, ammo tracking, and weapon properties

---

## Phase 1: Core Ranged Combat Modifiers (PRIORITY)
**Estimated Time:** 4-6 hours
**Goal:** Implement essential shooting modifiers for realistic gunfights

### 1.1 Range Penalties (Consistent Application)
**Status:** Function exists but not consistently applied
**Location:** `SavageWorldsRules.ts:266-283`, `CombatManager.ts:83-84`

**Tasks:**
- [x] Verify `getRangePenalty()` function is correct
- [ ] Ensure all ranged attacks call `getRangePenalty()`
- [ ] Display range penalty in combat log (e.g., "Attack at medium range (-2)")
- [ ] Add range indicator to UI showing which range band target is in
- [ ] Test with various weapon ranges (pistol vs rifle vs shotgun)

**Implementation:**
```typescript
// In CombatManager.playerAttackEnemy()
const rangePenalty = isRangedWeapon
  ? getRangePenalty(distance, weapon.range || '12/24/48')
  : 0;

// Add to combat log
if (rangePenalty < 0) {
  const rangeBand = distance <= shortRange ? 'short' :
                    distance <= mediumRange ? 'medium' : 'long';
  this.addLog(`Attacking at ${rangeBand} range (${rangePenalty})`, 'info');
}
```

**Testing Checklist:**
- [ ] Pistol at 5, 10, 15, 20 squares (range 12/24/48)
- [ ] Rifle at 12, 24, 48 squares (range 24/48/96)
- [ ] Shotgun at 6, 12, 24 squares (range 12/24/48)
- [ ] Verify penalty displayed in combat log
- [ ] Verify penalty affects hit chance

---

### 1.2 Aim Action Implementation
**Status:** Action defined but bonus not tracked/applied
**Location:** `ActionMenu.tsx:13-161`, `ArenaScene.ts`

**Tasks:**
- [ ] Add `isAiming` state to player combat state
- [ ] Set `isAiming = true` when Aim action selected
- [ ] Apply +2 bonus to next ranged attack roll
- [ ] Clear `isAiming` after attack or movement
- [ ] Display "Aiming" status effect in UI
- [ ] Add visual indicator on grid (crosshair icon?)

**Implementation:**
```typescript
// In ArenaScene or CombatManager
private playerAiming = false;

public playerAimAction() {
  this.playerAiming = true;
  this.addLog('Taking careful aim... (+2 to next ranged attack)', 'info');
  // End turn
}

public playerAttackEnemy(enemy, weapon, distance) {
  const aimBonus = this.playerAiming && isRangedWeapon ? 2 : 0;
  const totalModifier = woundPenalty + rangePenalty + aimBonus;

  // Clear aim after attack
  this.playerAiming = false;

  // ... rest of attack logic
}

// Clear aim if player moves
public movePlayer() {
  if (this.playerAiming) {
    this.playerAiming = false;
    this.addLog('Aim cancelled by movement', 'info');
  }
}
```

**Testing Checklist:**
- [ ] Aim action sets aiming state
- [ ] Next ranged attack gets +2 bonus
- [ ] Aim cleared after attack
- [ ] Aim cleared if player moves
- [ ] Aim not applicable to melee attacks
- [ ] Visual indicator appears/disappears correctly

---

### 1.3 Running Target Modifier
**Status:** Not implemented
**Location:** New implementation needed

**Tasks:**
- [ ] Track if target ran this turn (enemies and player)
- [ ] Apply -2 penalty to hit running targets
- [ ] Display "Target is running" in combat log
- [ ] Clear running status at start of next turn

**Implementation:**
```typescript
// Add to GameEnemy interface
interface GameEnemy {
  // ... existing fields
  hasRun: boolean; // Whether this enemy ran this turn
}

// In CombatManager
public playerAttackEnemy(enemy, weapon, distance) {
  const runningPenalty = enemy.hasRun ? -2 : 0;
  const totalModifier = woundPenalty + rangePenalty + aimBonus + runningPenalty;

  if (runningPenalty < 0) {
    this.addLog('Target is running (-2 to hit)', 'info');
  }
  // ... rest of attack logic
}

// When enemy runs
public enemyRunAction(enemy) {
  enemy.hasRun = true;
  // ... movement logic
}

// At start of new turn
public startNewTurn() {
  // Clear all running flags
  this.enemies.forEach(e => e.hasRun = false);
}
```

**Testing Checklist:**
- [ ] Enemy run action sets hasRun flag
- [ ] Attacks against running enemies get -2 penalty
- [ ] Running flag cleared at start of new turn
- [ ] Combat log shows "Target is running (-2)"

---

### 1.4 Called Shot Implementation
**Status:** Action defined but not implemented
**Location:** `ActionMenu.tsx` has 'called_shot' defined

**Savage Worlds Rules:**
- **Head/Vitals:** -4 to hit, +4 damage (or special effects)
- **Limb:** -2 to hit, can cause disarm/knockdown
- **Small Target:** -2 to hit
- **Tiny Target:** -4 to hit

**Tasks:**
- [ ] Create called shot UI (dropdown or dialog to select target area)
- [ ] Add `calledShotTarget` state ('head', 'limbs', 'vitals', 'small', 'tiny')
- [ ] Apply appropriate to-hit penalty
- [ ] Apply damage bonus or special effects on hit
- [ ] Display called shot target in combat log

**Implementation:**
```typescript
type CalledShotTarget = 'head' | 'vitals' | 'limb' | 'small' | 'tiny' | null;

interface CombatState {
  calledShotTarget: CalledShotTarget;
}

const CALLED_SHOT_MODIFIERS = {
  head: { toHit: -4, damageBonus: 4, description: 'Head Shot' },
  vitals: { toHit: -4, damageBonus: 4, description: 'Vital Shot' },
  limb: { toHit: -2, damageBonus: 0, description: 'Limb Shot' },
  small: { toHit: -2, damageBonus: 0, description: 'Small Target' },
  tiny: { toHit: -4, damageBonus: 0, description: 'Tiny Target' },
};

public playerAttackEnemy(enemy, weapon, distance) {
  const calledShotMod = this.calledShotTarget
    ? CALLED_SHOT_MODIFIERS[this.calledShotTarget]
    : null;

  const toHitModifier = woundPenalty + rangePenalty + aimBonus + runningPenalty +
                        (calledShotMod?.toHit || 0);

  // ... roll attack

  if (hit && calledShotMod) {
    this.addLog(`${calledShotMod.description}! (+${calledShotMod.damageBonus} damage)`, 'success');
    // Apply damage bonus
    damageResult.totalDamage += calledShotMod.damageBonus;
  }

  // Clear called shot
  this.calledShotTarget = null;
}
```

**UI Component:**
```typescript
// In ActionMenu or new CalledShotDialog
<FormControl>
  <InputLabel>Called Shot Target</InputLabel>
  <Select onChange={(e) => setCalledShotTarget(e.target.value)}>
    <MenuItem value="head">Head (-4 to hit, +4 damage)</MenuItem>
    <MenuItem value="vitals">Vitals (-4 to hit, +4 damage)</MenuItem>
    <MenuItem value="limb">Limb (-2 to hit, disarm/knockdown)</MenuItem>
    <MenuItem value="small">Small Target (-2 to hit)</MenuItem>
    <MenuItem value="tiny">Tiny Target (-4 to hit)</MenuItem>
  </Select>
</FormControl>
```

**Testing Checklist:**
- [ ] Called shot UI appears when action selected
- [ ] Each target type applies correct to-hit penalty
- [ ] Damage bonus applied on successful hit
- [ ] Combat log shows called shot description
- [ ] Called shot cleared after attack

---

## Phase 2: Cover System
**Estimated Time:** 6-8 hours
**Goal:** Implement cover mechanics for tactical positioning

### 2.1 Cover Types & Mechanics

**Savage Worlds Rules:**
- **Light Cover:** -2 to ranged attacks (bush, fence, small tree)
- **Medium Cover:** -4 to ranged attacks (half wall, boulder)
- **Heavy Cover:** -6 to ranged attacks (firing slit, narrow window)
- **Total Cover:** Cannot be targeted at all

**Tasks:**
- [ ] Extend grid tile data to include cover type
- [ ] Add cover property to tile map
- [ ] Visual indicators for cover tiles (different colors/icons)
- [ ] Line of sight calculation
- [ ] Determine cover between attacker and target
- [ ] Apply cover penalty to ranged attacks
- [ ] UI to place cover on map (GM only?)

**Implementation:**
```typescript
// Extend tile data
interface GridTile {
  x: number;
  y: number;
  terrain: 'normal' | 'difficult' | 'impassable';
  cover: 'none' | 'light' | 'medium' | 'heavy' | 'total';
}

const COVER_MODIFIERS = {
  none: 0,
  light: -2,
  medium: -4,
  heavy: -6,
  total: -999, // Cannot target
};

// In CombatManager
public getCoverBetween(attackerPos, targetPos): 'none' | 'light' | 'medium' | 'heavy' {
  // Calculate line of sight
  const line = this.calculateLine(attackerPos, targetPos);

  // Check tiles along line for cover
  let maxCover = 'none';
  for (const pos of line) {
    const tile = this.getTile(pos.x, pos.y);
    if (tile.cover !== 'none') {
      // Upgrade to highest cover along line
      maxCover = this.getHigherCover(maxCover, tile.cover);
    }
  }

  return maxCover;
}

public playerAttackEnemy(enemy, weapon, distance) {
  const cover = this.getCoverBetween(playerPos, enemy.gridPosition);
  const coverPenalty = COVER_MODIFIERS[cover];

  if (coverPenalty < 0) {
    this.addLog(`Target has ${cover} cover (${coverPenalty})`, 'info');
  }

  const totalModifier = woundPenalty + rangePenalty + aimBonus +
                        runningPenalty + calledShotPenalty + coverPenalty;
  // ... rest of attack
}
```

**Visual Design:**
- Light cover: Yellow tint on tile
- Medium cover: Orange tint on tile
- Heavy cover: Red tint on tile
- Icon overlay (shield, wall, etc.)

**Testing Checklist:**
- [ ] Cover tiles marked on grid
- [ ] Line of sight correctly identifies cover
- [ ] Light cover applies -2 penalty
- [ ] Medium cover applies -4 penalty
- [ ] Heavy cover applies -6 penalty
- [ ] Cover penalty displayed in combat log
- [ ] Visual indicators render correctly

---

## Phase 3: Ammunition & Reload System
**Estimated Time:** 4-5 hours
**Goal:** Track ammo and implement realistic reload mechanics

### 3.1 Ammo Tracking

**Tasks:**
- [ ] Add `currentAmmo` field to equipped weapon state
- [ ] Initialize ammo from equipment `shots` property
- [ ] Decrement ammo on each shot
- [ ] Display current ammo in UI (e.g., "6/6 shots")
- [ ] Prevent firing when out of ammo
- [ ] Warning when ammo is low (< 25%)

**Implementation:**
```typescript
interface WeaponState {
  equipment: Equipment;
  currentAmmo: number;
}

// In CombatManager
private equippedWeapon: WeaponState | null = null;

public equipWeapon(weapon: Equipment) {
  this.equippedWeapon = {
    equipment: weapon,
    currentAmmo: weapon.shots || 999, // Default to unlimited if not specified
  };
}

public playerAttackEnemy(enemy, weapon, distance) {
  // Check ammo
  if (this.equippedWeapon && this.equippedWeapon.currentAmmo <= 0) {
    this.addLog('Out of ammo! Must reload.', 'miss');
    return { hit: false, rollDetails: 'No ammo' };
  }

  // Decrement ammo
  if (this.equippedWeapon) {
    this.equippedWeapon.currentAmmo--;

    // Low ammo warning
    if (this.equippedWeapon.currentAmmo === 2) {
      this.addLog('⚠️ Low on ammo!', 'info');
    }
  }

  // ... rest of attack logic
}
```

**UI Updates:**
```typescript
// In weapon display
<Typography>
  {weapon.name} ({currentAmmo}/{weapon.shots} shots)
</Typography>

// Add ammo bar
<LinearProgress
  variant="determinate"
  value={(currentAmmo / weapon.shots) * 100}
  color={currentAmmo <= weapon.shots * 0.25 ? 'error' : 'primary'}
/>
```

---

### 3.2 Reload Action

**Savage Worlds Rules:**
- Reload takes 1 action
- Some weapons require multiple actions to reload
- Edge "Quick Draw" speeds up reload

**Tasks:**
- [ ] Implement reload action handler
- [ ] Restore ammo to weapon's max shots
- [ ] End player turn after reload
- [ ] Display reload message in combat log
- [ ] Consider multi-action reload for slow weapons

**Implementation:**
```typescript
public playerReloadAction() {
  if (!this.equippedWeapon) {
    this.addLog('No weapon equipped to reload', 'miss');
    return;
  }

  const weapon = this.equippedWeapon.equipment;
  this.equippedWeapon.currentAmmo = weapon.shots || 6;

  this.addLog(`Reloaded ${weapon.name} (${weapon.shots} shots)`, 'info');

  // Consume action, end turn
  this.endPlayerTurn();
}
```

**Testing Checklist:**
- [ ] Ammo decrements on each attack
- [ ] Out of ammo prevents firing
- [ ] Reload action restores ammo
- [ ] UI shows current ammo count
- [ ] Low ammo warning appears
- [ ] Reload consumes action

---

## Phase 4: Rate of Fire & Automatic Weapons
**Estimated Time:** 6-8 hours
**Goal:** Implement RoF mechanics for semi-auto and full-auto weapons

### 4.1 Rate of Fire Basics

**Savage Worlds Rules:**
- **RoF 1:** Single shot (most revolvers, bolt-action rifles)
- **RoF 2:** Semi-automatic (can fire 2 shots at -2 each)
- **RoF 3:** 3-round burst (single attack, +1 damage die if hit)
- **RoF 4+:** Full auto (multiple targets or focused fire)

**Tasks:**
- [ ] Read RoF from equipment
- [ ] Modify attack based on RoF
- [ ] RoF 2: Allow 2 shots with multi-action penalty (-2 each)
- [ ] RoF 3: Add +1 damage die to successful hit
- [ ] Display RoF in weapon info

**Implementation:**
```typescript
// Equipment already has rof field

public playerAttackEnemy(enemy, weapon, distance) {
  const rof = weapon.rof || 1;

  // RoF 3: 3-round burst bonus
  if (rof === 3) {
    this.addLog('3-round burst! (+1 damage die)', 'info');
    // Add extra damage die in calculateDamageWithRaises
  }

  // ... rest of attack
}

// For RoF 2 (semi-auto double tap)
public playerDoubleTapAction(enemy, weapon, distance) {
  if (weapon.rof < 2) {
    this.addLog('Weapon cannot fire twice in one action', 'miss');
    return;
  }

  // Fire twice with -2 penalty each
  this.addLog('Double Tap! Two shots at -2 each', 'info');

  const shot1 = this.playerAttackEnemy(enemy, weapon, distance, -2);
  const shot2 = this.playerAttackEnemy(enemy, weapon, distance, -2);

  // Consume 2 ammo
  this.equippedWeapon.currentAmmo -= 2;
}
```

---

### 4.2 Full Auto Rules

**Savage Worlds Rules:**
- Can attack all targets in a cone
- Or focused fire: make 3 attack rolls vs single target
- -2 Recoil penalty
- Uses 5x ammo

**Tasks:**
- [ ] Implement full auto area attack
- [ ] Implement full auto focused fire
- [ ] Apply recoil penalty (-2)
- [ ] Consume 5x ammo
- [ ] Visual cone indicator on grid

**Implementation:**
```typescript
public playerFullAutoAction(targets: GameEnemy[], weapon, focused: boolean) {
  if (weapon.rof < 4) {
    this.addLog('Weapon does not support full auto', 'miss');
    return;
  }

  // Check ammo
  const ammoRequired = 5;
  if (this.equippedWeapon.currentAmmo < ammoRequired) {
    this.addLog(`Not enough ammo for full auto (need ${ammoRequired})`, 'miss');
    return;
  }

  this.addLog('FULL AUTO!', 'info');
  this.equippedWeapon.currentAmmo -= ammoRequired;

  if (focused) {
    // Focused fire: 3 attacks vs single target with -2 recoil
    const target = targets[0];
    for (let i = 0; i < 3; i++) {
      this.playerAttackEnemy(target, weapon, distance, -2);
    }
  } else {
    // Area attack: 1 attack per target in cone
    targets.forEach(target => {
      this.playerAttackEnemy(target, weapon, distance, -2);
    });
  }
}
```

**Testing Checklist:**
- [ ] RoF 1 fires single shot
- [ ] RoF 2 allows double tap
- [ ] RoF 3 adds damage die
- [ ] RoF 4+ enables full auto
- [ ] Full auto cone visualized
- [ ] Full auto focused fire works
- [ ] Recoil penalty applied
- [ ] Ammo consumption correct

---

## Phase 5: Advanced Weapon Properties
**Estimated Time:** 4-6 hours
**Goal:** Implement AP, minimum strength, and other weapon properties

### 5.1 Armor Piercing (AP)

**Savage Worlds Rule:**
- AP reduces target's armor by that amount
- Example: AP 2 reduces armor from 4 to 2

**Tasks:**
- [ ] Add `ap` field to Equipment type
- [ ] Reduce target's armor bonus to Toughness
- [ ] Display AP in weapon info
- [ ] Show armor reduction in combat log

**Implementation:**
```typescript
interface Equipment {
  // ... existing fields
  ap?: number; // Armor piercing value
}

public playerAttackEnemy(enemy, weapon, distance) {
  // ... attack roll logic

  if (hit) {
    // Calculate damage vs adjusted toughness
    const ap = weapon.ap || 0;
    const armorReduction = Math.min(ap, enemy.armor); // Can't reduce below 0
    const adjustedToughness = enemy.toughness - armorReduction;

    if (ap > 0) {
      this.addLog(`AP ${ap} reduces armor by ${armorReduction}`, 'info');
    }

    // ... damage calculation with adjustedToughness
  }
}
```

---

### 5.2 Minimum Strength Requirement

**Savage Worlds Rule:**
- Weapons have minimum Strength requirement
- Each die step below minimum: -1 penalty

**Tasks:**
- [ ] Add `minStrength` field to Equipment
- [ ] Compare to character's Strength die
- [ ] Apply penalty if below minimum
- [ ] Display warning in UI

**Implementation:**
```typescript
interface Equipment {
  // ... existing fields
  minStrength?: string; // e.g., "d6", "d8"
}

public getStrengthPenalty(weapon: Equipment): number {
  if (!weapon.minStrength) return 0;

  const playerStrength = this.dieToNumber(this.character.strengthDie);
  const weaponMinStr = this.dieToNumber(weapon.minStrength);

  const diff = playerStrength - weaponMinStr;

  if (diff < 0) {
    // Below minimum, -1 per die step
    return diff; // Already negative
  }

  return 0;
}

private dieToNumber(die: string): number {
  const match = die.match(/d(\d+)/);
  if (!match) return 4; // Default d4

  const sides = parseInt(match[1]);
  // d4=4, d6=6, d8=8, d10=10, d12=12
  return sides;
}
```

---

### 5.3 Heavy Weapon Property

**Savage Worlds Rule:**
- Heavy weapons cannot be fired from moving vehicles
- May require setup/mounting

**Tasks:**
- [ ] Add `heavy` boolean to Equipment
- [ ] Prevent use if player moved this turn (or moving vehicle)
- [ ] Display heavy weapon indicator

---

### 5.4 Weapon Reach (Melee)

**Savage Worlds Rule:**
- Reach 1: Can attack adjacent enemies (1 square)
- Reach 2: Can attack 2 squares away (polearms, whips)

**Tasks:**
- [ ] Add `reach` field to Equipment
- [ ] Allow melee attacks up to reach distance
- [ ] Modify movement range indicators for melee weapons

---

## Phase 6: Additional Combat Modifiers
**Estimated Time:** 3-4 hours
**Goal:** Implement remaining situational modifiers

### 6.1 Illumination Modifiers

**Savage Worlds Rules:**
- **Dim Light:** -1 to Notice and attack rolls
- **Dark:** -2 to Notice and attack rolls
- **Pitch Black:** -4 to Notice and attack rolls

**Tasks:**
- [ ] Add lighting level to combat state
- [ ] Apply illumination penalty to attacks
- [ ] UI to change lighting (GM control?)

---

### 6.2 Unstable Platform

**Savage Worlds Rule:**
- Shooting from moving vehicle: -2 penalty

**Tasks:**
- [ ] Add platform state (stable, moving vehicle)
- [ ] Apply -2 penalty if on moving platform

---

### 6.3 Recoil

**Savage Worlds Rule:**
- Some weapons have Recoil property: -2 to all shots after first

**Tasks:**
- [ ] Add `recoil` boolean to Equipment
- [ ] Track if weapon was fired this turn
- [ ] Apply -2 on subsequent shots

---

## Phase 7: Testing & Polish
**Estimated Time:** 4-6 hours

### 7.1 Comprehensive Testing

**Test Scenarios:**
1. **Pistol Duel at 10 Paces:**
   - Two characters with pistols at medium range
   - Verify -2 range penalty applied
   - Test aim action (+2 bonus)
   - Test called shot to head

2. **Rifle Sniper at Long Range:**
   - Rifle at 50 squares (long range)
   - Verify -4 range penalty
   - Test aim action
   - Test target behind cover

3. **Shotgun Close Quarters:**
   - Shotgun at 5 squares
   - Verify short range (no penalty)
   - Test automatic fire (if applicable)

4. **Ammo Exhaustion:**
   - Fire 6-shot revolver until empty
   - Verify reload action
   - Verify can't fire when empty

5. **Full Auto Mayhem:**
   - Gatling gun against multiple targets
   - Verify RoF mechanics
   - Verify ammo consumption
   - Verify recoil penalty

---

### 7.2 UI Polish

**Tasks:**
- [ ] Consistent combat log formatting
- [ ] Clear visual indicators for all modifiers
- [ ] Tooltip explanations for penalties
- [ ] Responsive layout on different screen sizes
- [ ] Accessibility (keyboard navigation, screen reader)

---

### 7.3 Performance Optimization

**Tasks:**
- [ ] Profile combat calculations
- [ ] Optimize line of sight calculations
- [ ] Cache range calculations
- [ ] Reduce re-renders

---

## Phase 8: Documentation & Deployment
**Estimated Time:** 2-3 hours

### 8.1 Documentation

**Tasks:**
- [ ] Update `GAME_ARENA_V1.md` with new features
- [ ] Create "Ranged Combat Rules" reference guide
- [ ] Document all modifier formulas
- [ ] Create testing guide for QA

---

### 8.2 Deployment

**Tasks:**
- [ ] Run full test suite
- [ ] Build production bundle
- [ ] Deploy to Railway
- [ ] Smoke test in production
- [ ] Monitor for errors

---

## Summary of Priorities

**Week 1 Focus (Phase 1):**
- Range penalties consistently applied
- Aim action working
- Running target modifier
- Called shots

**Week 2 Focus (Phases 2-3):**
- Cover system
- Ammo tracking
- Reload mechanics

**Week 3 Focus (Phases 4-5):**
- Rate of Fire
- Automatic weapons
- Weapon properties (AP, min strength)

**Week 4 Focus (Phases 6-8):**
- Additional modifiers
- Testing & polish
- Deployment

---

## Success Criteria

✅ **Ranged Combat Complete When:**
1. All range penalties correctly applied
2. Cover provides defensive bonuses
3. Ammo tracked and reload works
4. RoF mechanics implemented
5. Weapon properties (AP, min strength) working
6. All modifiers stack correctly
7. Combat log clearly shows all modifiers
8. UI displays all relevant information
9. All tests passing
10. Documentation complete

---

## References

- **Savage Worlds Deluxe Edition Core Rules** - Combat section
- **Deadlands Reloaded Player's Guide** - Weapon stats
- **Deadlands Marshal's Handbook** - Additional combat rules
- Current implementation:
  - `frontend/src/game/engine/SavageWorldsRules.ts`
  - `frontend/src/game/engine/CombatManager.ts`
  - `frontend/src/game/types/GameTypes.ts`

---

**Last Updated:** 2025-11-11
**Next Review:** After Phase 1 completion
