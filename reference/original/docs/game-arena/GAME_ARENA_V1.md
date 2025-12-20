# Game Arena v1.0 - Feature Documentation

## Overview
The Game Arena is a tactical combat system for Deadlands Savage Worlds RPG, implementing core rulebook mechanics in an interactive grid-based environment.

**Version:** 1.0.0
**Release Date:** TBD (Next Session)
**Platform:** Web (React + Phaser 3)

---

## Core Features

### 1. Movement Budget System
**Status:** ✅ Implemented

#### Description
Characters have a limited movement budget each turn, initialized to their Pace value. Movement is tracked and deducted in real-time as the player moves.

#### Savage Worlds Rules
- Base movement = Character's Pace (typically 6 squares)
- Sprint action: Pace + d6 additional movement
- Diagonal movement counts as 1 square (Chebyshev distance)

#### Implementation
- **Location:** `frontend/src/game/engine/ArenaScene.ts`
- **Properties:**
  - `movementBudget`: Current remaining movement
  - `maxMovementBudget`: Total movement for the turn
- **Reset:** Automatically resets at start of each player turn

#### UI Elements
- Movement budget display in right HUD panel
- Shows "X / Y squares" format
- Blue progress bar (gray when depleted)
- Real-time updates as player moves

#### Testing
- **Test File:** `frontend/src/game/engine/__tests__/MovementBudget.test.ts`
- **Coverage:** Budget initialization, deduction, sprint action, validation

---

### 2. Sprint Action
**Status:** ✅ Implemented

#### Description
Players can use their action to sprint, gaining extra movement for the turn.

#### Savage Worlds Rules
- Movement = Pace + d6
- Consumes the character's action for the turn
- Cannot attack after sprinting

#### Implementation
- **Location:** `frontend/src/game/engine/ArenaScene.ts:1000-1036`
- **Action Type:** `'run'`
- **Roll:** Math.floor(Math.random() * 6) + 1
- **Updates:** Movement budget, combat log, UI display

#### Usage
1. Select "Run" from Combat Actions dropdown
2. System rolls d6 automatically
3. Movement budget updated to Pace + roll result
4. Combat log shows the roll and total movement

---

### 3. Parry Rules (Ranged Attacks)
**Status:** ✅ Implemented

#### Description
Correct implementation of Savage Worlds parry rules for ranged attacks.

#### Savage Worlds Rules
- **Melee Attacks:** Always use target's Parry
- **Ranged Attacks in Melee Range (≤1 square):** Use target's Parry
- **Ranged Attacks Beyond Melee Range (>1 square):** Use TN 4

#### Implementation
- **Location:**
  - `frontend/src/game/engine/ArenaScene.ts:731-755`
  - `frontend/src/game/engine/CombatManager.ts:88-116`
- **Logic:**
```typescript
const isInMeleeRange = distance <= 1;
const targetNumber = isRangedWeapon
  ? (isInMeleeRange ? enemy.parry : 4)
  : enemy.parry;
```

#### Combat Log Messages
- Melee: "Hit! (Rolled X vs Parry Y)"
- Ranged in melee: "Hit! (Rolled X vs Parry Y)"
- Ranged beyond melee: "Hit! (Rolled X vs TN 4)"

#### Testing
- **Test File:** `frontend/src/game/engine/__tests__/ParryRules.test.ts`
- **Coverage:** Melee range detection, target number calculation, skill selection

---

### 4. Range Display Toggles
**Status:** ✅ Implemented

#### Description
Independent toggles for weapon range and movement range indicators on the grid.

#### Features
- **Weapon Ranges Toggle:**
  - Shows/hides color-coded weapon range indicators
  - Green (short), Orange (medium), Red (long)

- **Movement Ranges Toggle:**
  - Shows/hides blue movement range indicators
  - Displays tiles within current movement budget

#### Implementation
- **Location:** `frontend/src/game/GameArena.tsx:423-468`
- **State Management:**
```typescript
const [showWeaponRanges, setShowWeaponRanges] = useState(true);
const [showMovementRanges, setShowMovementRanges] = useState(true);
```

#### UI Elements
- Radio buttons in "Range Display Toggles" panel
- Located in center column above game canvas
- Show/Hide options for each toggle
- Independent operation

---

### 5. Combat Action Tooltips
**Status:** ✅ Implemented

#### Description
Hover tooltips for combat action dropdown menu items providing detailed information.

#### Features
- 1-second hover delay before tooltip appears
- Shows full action description
- Displays modifiers (e.g., "+2 attack", "-2 Parry") in orange
- Styled to match game theme

#### Implementation
- **Location:** `frontend/src/game/components/ActionMenu.tsx:283-327`
- **Component:** Material-UI Tooltip
- **Delay:** `enterDelay={1000}` (1000ms)
- **Placement:** `placement="right"`

#### Styling
- Background: `#2d1b0e` (dark brown)
- Border: `#8b4513` (brown)
- Arrow indicator
- Max width: 250px

#### Testing
- **Test File:** `frontend/src/game/components/__tests__/ActionMenu.test.tsx`
- **Coverage:** Tooltip rendering, delay, content display

---

### 6. Combat Actions
**Status:** ✅ Implemented

#### Available Actions
1. **Attack (Melee)** - Fighting roll vs Parry
2. **Attack (Ranged)** - Shooting roll vs Parry/TN 4
3. **Aim** - +2 to next ranged attack
4. **Full Defense** - +2 to Parry until next turn
5. **Run** - Sprint for Pace + d6 movement
6. **Wild Attack** - +2 attack/damage, -2 Parry
7. **Called Shot** - -2 to attack for special effects
8. **Grapple** - Opposed Fighting roll
9. **Disarm** - Attack at -2 to disarm
10. **Trick** - Gain advantage with skill roll
11. **Test of Wills** - Intimidation/Taunt to Shake
12. **Support** - Give +1 to ally's action
13. **Recover from Shaken** - Spirit roll to remove Shaken
14. **Use Arcane Power** - Cast spells (requires Arcane Background)
15. **Reload** - Reload weapon
16. **Change Weapon** - Draw/holster weapon
17. **Use Item** - Use consumable item
18. **Coup de Grâce** - Auto-kill helpless target
19. **Evasion** - Athletics -2 to avoid area attacks
20. **Withdraw** - Leave melee safely
21. **Multi-Action** - Multiple actions at -2 each

#### Implementation
- **Location:** `frontend/src/game/components/ActionMenu.tsx:13-161`
- **Type Definitions:** `frontend/src/game/types/GameTypes.ts:97-129`

---

## Technical Architecture

### Frontend Components
```
frontend/src/game/
├── GameArena.tsx              # Main game container
├── components/
│   ├── GameCanvas.tsx         # Phaser game wrapper
│   ├── ActionMenu.tsx         # Combat actions dropdown
│   ├── WeaponSelection.tsx    # Weapon selector
│   └── StatusEffects.tsx      # Wounds/Shaken display
├── engine/
│   ├── ArenaScene.ts          # Phaser game scene
│   ├── CombatManager.ts       # Combat rules engine
│   └── SavageWorldsRules.ts   # Dice rolling & rules
└── types/
    └── GameTypes.ts           # TypeScript definitions
```

### State Management
- **React State:** UI controls, toggles, budgets
- **Phaser Events:** Combat events, dice rolls, updates
- **Event Flow:** Phaser → React via game.events.emit()

### Communication Pattern
```
React (GameArena)
    ↓ Props
GameCanvas
    ↓ Event Listeners
Phaser (ArenaScene)
    ↓ game.events.emit()
React Callbacks
    ↓ setState
UI Updates
```

---

## Testing Strategy

### Unit Tests
- **Movement Budget:** Budget initialization, deduction, sprint
- **Parry Rules:** Melee range, target numbers, weapon types
- **Action Menu:** Rendering, tooltips, arcane powers

### Test Commands
```bash
cd frontend
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

### Test Files
- `frontend/src/game/engine/__tests__/MovementBudget.test.ts`
- `frontend/src/game/engine/__tests__/ParryRules.test.ts`
- `frontend/src/game/components/__tests__/ActionMenu.test.tsx`

---

## Configuration

### Environment Variables
```bash
# Frontend
VITE_API_URL=http://localhost:8080/api

# Backend
DATABASE_URL=jdbc:postgresql://localhost:5432/deadlands
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_password
CORS_ORIGINS=http://localhost:3000
```

### Phaser Configuration
```typescript
{
  type: Phaser.AUTO,
  width: 1280,
  height: 800,
  physics: { default: 'arcade' },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
}
```

---

## Known Issues & Limitations

### v1.0 Limitations
1. **AI:** Simple movement AI (move toward player, attack when adjacent)
2. **Actions:** Not all 21 actions are fully implemented
3. **Powers:** Arcane power effects not yet implemented
4. **Items:** Item usage not yet implemented
5. **Multi-Action:** Penalty applied but no action validation

### Future Enhancements
- Advanced AI with tactics
- Full action implementation
- Spell/power effects system
- Inventory management
- Save/load combat state
- Multiplayer support

---

## Performance Metrics

### Target Performance
- **Initial Load:** < 2 seconds
- **Frame Rate:** 60 FPS
- **Grid Size:** 200x200 tiles
- **Tile Size:** 32x32 pixels
- **Memory:** < 200 MB

### Optimization Techniques
- Sprite pooling for enemies
- Graphics layer management
- Event debouncing
- Efficient collision detection

---

## Browser Support

### Minimum Requirements
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Features
- ES2020 JavaScript
- WebGL 2.0
- CSS Grid
- Flexbox

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No console errors
- [ ] Performance profiling complete
- [ ] Documentation up to date
- [ ] Version bumped to 1.0.0

### Build Process
```bash
# Frontend
cd frontend
npm run build
npm run preview  # Test production build

# Backend
cd backend
./mvnw clean package
java -jar target/*.jar  # Test JAR
```

### Production Environment
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] CORS origins updated
- [ ] SSL certificates installed
- [ ] Monitoring configured

---

## Support & Resources

### Documentation
- [Savage Worlds Deluxe Edition](https://www.peginc.com/store/savage-worlds-deluxe-edition/)
- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [React Documentation](https://react.dev/)

### Contact
- **Issues:** GitHub Issues
- **Development:** See `next_session.md`

---

**Last Updated:** 2025-11-10
**Status:** Ready for v1.0 Deployment
