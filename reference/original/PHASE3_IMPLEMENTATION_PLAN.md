# Phase 3 Implementation Plan: Power Casting in Combat

**Date:** 2025-11-24
**Status:** 🔨 PLANNING
**Implements:** Savage Worlds power casting system for arcane characters

---

## 🎯 Overview

Phase 3 integrates the power points system (from Phase 1) with actual in-combat power casting. This allows arcane characters (Hucksters, Shamans, Blessed) to use their powers during gameplay.

**Key Features:**
1. **Powers Database** - Store Deadlands powers with costs, ranges, and effects
2. **Character Powers** - Track which powers each character knows
3. **Cast Power Action** - Spend power points to cast powers in combat
4. **Target Selection** - Choose targets for powers (allies, enemies, area)
5. **Visual Feedback** - Show power effects in the arena
6. **WebSocket Sync** - Broadcast power usage to all players

---

## ✅ Acceptance Criteria

- [ ] Powers database table created (name, cost, range, duration, effects)
- [ ] Character-Powers relationship established (join table)
- [ ] API endpoint for casting powers (validates cost and known powers)
- [ ] Powers panel in GameArena UI
- [ ] "Cast Power" action button in combat controls
- [ ] Target selection UI for targeted powers
- [ ] Visual effects when power is cast
- [ ] WebSocket broadcast of power casting events
- [ ] Backend tests with full coverage
- [ ] Frontend compiles without errors
- [ ] UI is intuitive and well-designed
- [ ] Security and authorization implemented

---

## 📊 Database Schema

### New Table: `powers`

```sql
CREATE TABLE powers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    power_type VARCHAR(50) NOT NULL,  -- OFFENSIVE, DEFENSIVE, HEALING, UTILITY
    power_point_cost INTEGER NOT NULL,
    range_value VARCHAR(50),  -- "Touch", "Smarts", "12/24/48", "Cone Template"
    duration VARCHAR(50),     -- "Instant", "3 (1/round)", "Permanent"
    description TEXT NOT NULL,
    effect_description TEXT,  -- Mechanical effects (e.g., "2d6 damage")
    requires_roll BOOLEAN DEFAULT false,  -- Does casting require an arcane skill roll?
    arcane_skill VARCHAR(50),  -- "Faith", "Huckster", "Shamanism"
    is_touch_attack BOOLEAN DEFAULT false,
    is_sustained BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### New Table: `character_powers`

```sql
CREATE TABLE character_powers (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    power_id BIGINT NOT NULL REFERENCES powers(id) ON DELETE CASCADE,
    learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(character_id, power_id)
);
```

### Initial Powers Seed Data

Start with 10 common combat-relevant Deadlands powers:

1. **Bolt** - 1 PP, Ranged touch attack, 2d6 damage
2. **Blast** - 2 PP, Medium Burst Template, 2d6 damage
3. **Armor** - 2 PP, Touch, +2/+4 Armor for 3 rounds
4. **Healing** - 3 PP, Touch, Heal 1 wound
5. **Boost Trait** - 2 PP, Smarts range, +1 die step to trait for 3 rounds
6. **Lower Trait** - 2 PP, Smarts range, -1 die step to trait for 3 rounds
7. **Deflection** - 2 PP, Smarts range, -2/-4 to ranged attacks for 3 rounds
8. **Smite** - 2 PP, Touch, +2/+4 damage for 3 rounds
9. **Stun** - 2 PP, Smarts range, Target makes Vigor roll or Shaken
10. **Dispel** - 3 PP, Smarts range, Opposed arcane skill roll to end power

---

## 🔧 Backend Implementation

### 1. Power Model (`Power.java`)

```java
@Entity
@Table(name = "powers")
public class Power {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "power_type", nullable = false, length = 50)
    private String powerType;  // OFFENSIVE, DEFENSIVE, HEALING, UTILITY

    @Column(name = "power_point_cost", nullable = false)
    private Integer powerPointCost;

    @Column(name = "range_value", length = 50)
    private String range;

    @Column(length = 50)
    private String duration;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "effect_description", columnDefinition = "TEXT")
    private String effectDescription;

    @Column(name = "requires_roll")
    private Boolean requiresRoll = false;

    @Column(name = "arcane_skill", length = 50)
    private String arcaneSkill;  // "Faith", "Huckster", "Shamanism"

    @Column(name = "is_touch_attack")
    private Boolean isTouchAttack = false;

    @Column(name = "is_sustained")
    private Boolean isSustained = false;

    // Getters and setters
}
```

### 2. CharacterPower Join Entity (`CharacterPower.java`)

```java
@Entity
@Table(name = "character_powers")
public class CharacterPower {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "character_id", nullable = false)
    private Character character;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "power_id", nullable = false)
    private Power power;

    @Column(name = "learned_at")
    private LocalDateTime learnedAt;

    // Getters and setters
}
```

### 3. Update Character Model

Add relationship to powers:

```java
@OneToMany(mappedBy = "character", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
private List<CharacterPower> characterPowers = new ArrayList<>();
```

### 4. Power Repository (`PowerRepository.java`)

```java
@Repository
public interface PowerRepository extends JpaRepository<Power, Long> {
    Optional<Power> findByName(String name);
    List<Power> findByPowerType(String powerType);
    List<Power> findByArcaneSkill(String arcaneSkill);
}
```

### 5. Power Controller (`PowerController.java`)

```java
@RestController
@RequestMapping("/api/powers")
public class PowerController {

    @GetMapping
    public ResponseEntity<List<Power>> getAllPowers() {
        // Return all powers (for reference)
    }

    @GetMapping("/{id}")
    public ResponseEntity<Power> getPower(@PathVariable Long id) {
        // Get power details
    }
}
```

### 6. Character Controller - Add Power Casting Endpoint

```java
@PostMapping("/{id}/powers/cast")
@PreAuthorize("hasAnyRole('PLAYER', 'GAME_MASTER')")
public ResponseEntity<?> castPower(
    @PathVariable Long id,
    @RequestBody CastPowerRequest request,
    Authentication authentication
) {
    // Validate ownership or GM
    Character character = characterRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Character not found"));

    if (!isOwnerOrGM(character, authentication)) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
    }

    // Validate character knows this power
    Power power = powerRepository.findById(request.getPowerId())
        .orElseThrow(() -> new ResourceNotFoundException("Power not found"));

    boolean knowsPower = character.getCharacterPowers().stream()
        .anyMatch(cp -> cp.getPower().getId().equals(power.getId()));

    if (!knowsPower) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Character does not know this power"));
    }

    // Validate sufficient power points
    if (character.getCurrentPowerPoints() < power.getPowerPointCost()) {
        return ResponseEntity.badRequest()
            .body(Map.of("error", "Insufficient power points"));
    }

    // Deduct power points
    character.setCurrentPowerPoints(
        character.getCurrentPowerPoints() - power.getPowerPointCost()
    );
    characterRepository.save(character);

    // Return updated state and power details
    return ResponseEntity.ok(Map.of(
        "currentPowerPoints", character.getCurrentPowerPoints(),
        "maxPowerPoints", character.getMaxPowerPoints(),
        "powerCast", power.getName(),
        "powerEffect", power.getEffectDescription(),
        "targetId", request.getTargetId()  // For WebSocket broadcast
    ));
}
```

### 7. Request DTO

```java
public class CastPowerRequest {
    private Long powerId;
    private Long targetId;  // Character or enemy ID (null for self/area powers)
    private Integer gridX;  // For area effect powers
    private Integer gridY;

    // Getters and setters
}
```

### 8. Add Powers to CharacterDTO

```java
public class CharacterDTO {
    // ... existing fields ...
    private List<PowerDTO> powers;
}

public class PowerDTO {
    private Long id;
    private String name;
    private String powerType;
    private Integer powerPointCost;
    private String range;
    private String duration;
    private String description;
    private String effectDescription;
    private Boolean requiresRoll;
    private Boolean isTouchAttack;
}
```

---

## 🎨 Frontend Implementation

### 1. Power Interface (`characterService.ts`)

```typescript
export interface Power {
  id: number
  name: string
  powerType: 'OFFENSIVE' | 'DEFENSIVE' | 'HEALING' | 'UTILITY'
  powerPointCost: number
  range: string
  duration: string
  description: string
  effectDescription: string
  requiresRoll: boolean
  isTouchAttack: boolean
  isSustained: boolean
}

export interface Character {
  // ... existing fields ...
  powers?: Power[]
}
```

### 2. Power Service Methods (`characterService.ts`)

```typescript
castPower: async (
  characterId: number,
  powerId: number,
  targetId?: number,
  gridX?: number,
  gridY?: number
): Promise<CastPowerResponse> => {
  const response = await api.post(
    `/characters/${characterId}/powers/cast`,
    { powerId, targetId, gridX, gridY }
  )
  return response.data
}
```

### 3. Powers Panel Component (`PowersPanel.tsx`)

New component to display and select powers:

```typescript
interface PowersPanelProps {
  character: GameCharacter
  onCastPower: (powerId: number) => void
  disabled?: boolean
}

export const PowersPanel: React.FC<PowersPanelProps> = ({
  character,
  onCastPower,
  disabled
}) => {
  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom>
        ⚡ Powers
      </Typography>

      <Grid container spacing={1}>
        {character.powers?.map(power => (
          <Grid item xs={12} sm={6} md={4} key={power.id}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2">{power.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Cost: {power.powerPointCost} PP | Range: {power.range}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {power.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onCastPower(power.id)}
                  disabled={
                    disabled ||
                    (character.currentPowerPoints || 0) < power.powerPointCost
                  }
                >
                  Cast ({power.powerPointCost} PP)
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {(!character.powers || character.powers.length === 0) && (
        <Typography variant="body2" color="text.secondary">
          This character knows no powers.
        </Typography>
      )}
    </Box>
  )
}
```

### 4. Integrate into GameArena (`GameArena.tsx`)

Add powers panel and cast power handler:

```typescript
const [showPowers, setShowPowers] = useState(false)
const [selectedPowerId, setSelectedPowerId] = useState<number | null>(null)
const [selectingTarget, setSelectingTarget] = useState(false)

const handleCastPower = async (powerId: number) => {
  if (!selectedCharacter) return

  const power = selectedCharacter.powers?.find(p => p.id === powerId)
  if (!power) return

  // If power needs target, enter target selection mode
  if (power.isTouchAttack || power.range !== 'Self') {
    setSelectedPowerId(powerId)
    setSelectingTarget(true)
    return
  }

  // Self-targeting power, cast immediately
  await castPowerOnSelf(powerId)
}

const castPowerOnSelf = async (powerId: number) => {
  if (!selectedCharacter) return

  try {
    const result = await characterService.castPower(
      selectedCharacter.id,
      powerId
    )

    // Update character's power points
    setSelectedCharacter({
      ...selectedCharacter,
      currentPowerPoints: result.currentPowerPoints
    })

    // Add to combat log
    addToCombatLog(
      `${selectedCharacter.name} casts ${result.powerCast}!`,
      'success'
    )
  } catch (error) {
    console.error('Failed to cast power:', error)
    addToCombatLog('Power casting failed!', 'damage')
  }
}
```

### 5. Visual Effects

Add power casting animation in ArenaScene:

```typescript
showPowerEffect(casterId: number, powerId: number, targetId?: number) {
  // Create particle effect at caster
  const casterSprite = this.characterSprites.get(casterId)
  if (!casterSprite) return

  // Emit particles (arcane energy)
  const emitter = this.add.particles('arcane_particle')
    .createEmitter({
      x: casterSprite.x,
      y: casterSprite.y,
      speed: { min: -100, max: 100 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000
    })

  // If targeted, show projectile
  if (targetId) {
    const targetSprite = this.getTokenSprite(targetId)
    if (targetSprite) {
      this.showPowerProjectile(casterSprite, targetSprite)
    }
  }
}
```

### 6. WebSocket Integration

Broadcast power casting events:

```typescript
// In GameStateController.java
@MessageMapping("/game/power/cast")
@SendTo("/topic/game/power")
public PowerCastEvent broadcastPowerCast(PowerCastEvent event) {
    return event;
}

// In frontend websocketService.ts
subscribeToPowerCasts(callback: (event: PowerCastEvent) => void) {
  if (!this.stompClient?.connected) {
    console.warn('Cannot subscribe to power casts: not connected')
    return
  }

  this.stompClient.subscribe('/topic/game/power', (message) => {
    const event = JSON.parse(message.body)
    callback(event)
  })
}
```

---

## 🧪 Testing Strategy

### Backend Tests (`CharacterControllerTest.java`)

Add comprehensive power casting tests:

1. **testCastPower_Success** - Valid power casting
2. **testCastPower_InsufficientPowerPoints** - Not enough PP
3. **testCastPower_UnknownPower** - Character doesn't know power
4. **testCastPower_Unauthorized** - Not owner or GM
5. **testGetCharacterPowers** - Retrieve character's powers

```java
@Test
@DisplayName("Cast power - SUCCESS")
@WithMockUser(username = "testplayer", roles = "PLAYER")
void testCastPower_Success() throws Exception {
    // Setup
    Power bolt = new Power();
    bolt.setId(1L);
    bolt.setName("Bolt");
    bolt.setPowerPointCost(1);

    CharacterPower cp = new CharacterPower();
    cp.setPower(bolt);
    playerCharacter.getCharacterPowers().add(cp);
    playerCharacter.setCurrentPowerPoints(5);

    // Execute
    mockMvc.perform(post("/characters/1/powers/cast")
            .with(csrf())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"powerId\": 1, \"targetId\": 99}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.currentPowerPoints").value(4))
        .andExpect(jsonPath("$.powerCast").value("Bolt"));
}
```

---

## 📈 Implementation Timeline

**Estimated Time:** 6-8 hours

### Step 1: Database (1 hour)
- Create migration V7
- Create powers table
- Create character_powers table
- Seed initial 10 powers

### Step 2: Backend Models (1 hour)
- Create Power entity
- Create CharacterPower entity
- Update Character with powers relationship
- Create repositories

### Step 3: Backend API (2 hours)
- PowerController with GET endpoints
- CharacterController cast power endpoint
- Request/response DTOs
- Validation logic

### Step 4: Frontend Services (1 hour)
- Update Character interface
- Add Power interface
- Add castPower service method
- Update GameTypes.ts

### Step 5: Frontend UI (2-3 hours)
- Create PowersPanel component
- Integrate into GameArena
- Add target selection mode
- Add visual effects
- WebSocket integration

### Step 6: Testing (1 hour)
- 5 backend tests
- Manual testing of all powers
- WebSocket sync testing

---

## 🎮 User Experience Flow

1. **View Powers**: Player clicks "Powers" button in combat HUD
2. **Powers Panel Opens**: Shows grid of known powers with costs
3. **Select Power**: Player clicks "Cast" on a power
4. **Target Selection** (if needed):
   - For self powers: Cast immediately
   - For touch/ranged powers: Click target on map
   - For area powers: Click location on map
5. **Validation**: Check power points, range, line of sight
6. **Cast**: Deduct power points, show visual effect
7. **Broadcast**: All players see the power cast and effects
8. **Update**: Power points update in real-time

---

## 🔒 Security Considerations

- ✅ Validate character owns power before casting
- ✅ Validate sufficient power points
- ✅ Validate target is valid (exists, in range)
- ✅ Require authentication for cast endpoint
- ✅ Allow GM to cast any power (for NPC casting)
- ✅ Rate limit power casting (prevent spam)

---

## 📝 Documentation Checklist

- [ ] API endpoint documentation
- [ ] Power mechanics guide
- [ ] UI/UX usage guide
- [ ] WebSocket event format
- [ ] Testing guide
- [ ] Migration safety verification

---

## 🚀 Next Steps After Phase 3

### Phase 4: Additional Combat Actions
- Reroll with fate chips
- All-out Attack, Defend, Wild Attack
- Multi-action penalties
- Called shots integration

### Phase 5: Advanced Powers
- Sustained powers (concentration)
- Power modifiers (extra damage, range, etc.)
- Counterspell mechanics
- Power backfire (Huckster hexslinging)

---

**Ready to implement Phase 3! 🎊**
