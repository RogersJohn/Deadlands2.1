# Character Editing Implementation Plan with XP & Version History

**Date:** 2025-11-05
**Priority:** HIGH
**Complexity:** MEDIUM-HIGH
**Estimated Time:** 4-6 hours

---

## Requirements

1. ✅ **Basic Editing** - Players and GM can edit characters they have permission to
2. ✅ **Save to Database** - All edits persist to PostgreSQL
3. ✅ **XP Cost Tracking** - Show experience point costs for improvements
4. ✅ **Version History** - Track all changes with ability to revert
5. ✅ **Authorization** - GM can edit all, players can only edit their own

---

## Savage Worlds Advancement Rules (XP Costs)

### Experience Points System
- **Typical Session:** 1-3 XP per session
- **Ranks:**
  - Novice: 0-19 XP
  - Seasoned: 20-39 XP
  - Veteran: 40-59 XP
  - Heroic: 60-79 XP
  - Legendary: 80+ XP

### Advancement Costs

#### Attributes (2 XP each)
- Can only raise **one attribute per rank**
- Cannot exceed d12
- Cost: **2 XP**

#### Skills
- **Below linked attribute:** 1 XP
- **Equal to or above linked attribute:** 2 XP
- Cannot exceed linked attribute until attribute is raised
- New skill: Start at d4 (1 XP)

#### Edges (2 XP each)
- Must meet all requirements (rank, attributes, skills)
- Cost: **2 XP**

#### Remove Hindrance
- **Major hindrance:** 2 XP (requires GM approval)
- **Minor hindrance:** 1 XP (requires GM approval)
- Represents character overcoming the hindrance

#### Other Improvements
- **Increase wealth:** 1 XP per wealth level
- **New power (arcane characters):** 1 XP per power

---

## Database Schema Design

### New Table: `character_versions`

Stores snapshots of character state for version history and rollback.

```sql
CREATE TABLE character_versions (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Snapshot of character data (JSON)
    character_data JSONB NOT NULL,

    -- Change tracking
    change_summary TEXT,
    xp_cost INTEGER DEFAULT 0,
    total_xp_spent INTEGER DEFAULT 0,

    -- Audit fields
    edited_by BIGINT REFERENCES users(id),
    edited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reason TEXT,

    -- Is this version active?
    is_current BOOLEAN DEFAULT FALSE,

    UNIQUE(character_id, version_number)
);

CREATE INDEX idx_character_versions_character ON character_versions(character_id);
CREATE INDEX idx_character_versions_current ON character_versions(character_id, is_current);
```

### Add to `characters` table:

```sql
ALTER TABLE characters ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS spent_xp INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;
```

---

## Implementation Phases

### Phase 1: Backend - Basic Edit Endpoint (1 hour)

**Goal:** Implement PUT endpoint with ownership validation

**Tasks:**
1. Update `CharacterController.updateCharacter()` method
2. Add ownership validation in `CharacterService`
3. Handle nested entity updates (skills, edges, hindrances, equipment, powers)
4. Implement cascade operations with orphan removal

**Files to Modify:**
- `backend/src/main/java/com/deadlands/campaign/controller/CharacterController.java`
- `backend/src/main/java/com/deadlands/campaign/service/CharacterService.java`

**Authorization Logic:**
```java
// Check ownership: must be GM or character owner
boolean isGameMaster = currentUser.getRoles().stream()
    .anyMatch(role -> role.getName().equals("GAME_MASTER"));
boolean isOwner = existingCharacter.getPlayer().getId().equals(currentUser.getId());

if (!isGameMaster && !isOwner) {
    throw new UnauthorizedException("You do not have permission to edit this character");
}
```

---

### Phase 2: Backend - Version History & XP System (1.5 hours)

**Goal:** Track all changes with XP costs and enable rollback

**Tasks:**
1. Create `CharacterVersion` entity and repository
2. Create `XpCalculationService` to calculate costs
3. Update `CharacterService` to create version snapshots before edits
4. Implement `revertToVersion()` method
5. Run database migration to add tables/columns

**Files to Create:**
- `backend/src/main/java/com/deadlands/campaign/model/CharacterVersion.java`
- `backend/src/main/java/com/deadlands/campaign/repository/CharacterVersionRepository.java`
- `backend/src/main/java/com/deadlands/campaign/service/XpCalculationService.java`
- `backend/src/main/resources/db/migration/add-version-history.sql`

**XP Calculation Logic:**
```java
public class XpCalculationService {

    public int calculateAttributeRaise(String from, String to) {
        // Cost: 2 XP
        return 2;
    }

    public int calculateSkillRaise(String currentDie, String newDie, String linkedAttribute) {
        // Below attribute: 1 XP
        // At or above attribute: 2 XP
        if (dieToNumber(newDie) <= dieToNumber(linkedAttribute)) {
            return 1;
        }
        return 2;
    }

    public int calculateNewEdge() {
        return 2; // Always 2 XP
    }

    public int calculateRemoveHindrance(String severity) {
        return severity.equals("MAJOR") ? 2 : 1;
    }
}
```

---

### Phase 3: Frontend - Edit Mode UI (1.5 hours)

**Goal:** Add inline editing with XP cost preview

**Tasks:**
1. Add edit mode state to `CharacterSheet.tsx`
2. Create edit forms for each section
3. Display XP costs as user makes changes
4. Add Save/Cancel buttons
5. Extract reusable components from `CharacterCreate.tsx`

**Components to Create:**
- `frontend/src/components/character/EditModeToggle.tsx`
- `frontend/src/components/character/XpCostDisplay.tsx`
- `frontend/src/components/character/AttributeEditor.tsx`
- `frontend/src/components/character/SkillEditor.tsx` (reuse from CharacterCreate)

**Edit Mode UI Structure:**
```tsx
{isEditing ? (
  <Box>
    {/* XP Summary at top */}
    <Card sx={{ mb: 2, bgcolor: 'warning.dark' }}>
      <CardContent>
        <Typography variant="h6">XP Cost Preview</Typography>
        <Typography>
          Total XP: {character.totalXp} |
          Spent: {character.spentXp} |
          Available: {character.totalXp - character.spentXp}
        </Typography>
        <Typography color="warning.main">
          This Edit: {calculatedXpCost} XP
        </Typography>
      </CardContent>
    </Card>

    {/* Editable sections */}
    <AttributeEditor character={editedCharacter} onChange={handleAttributeChange} />
    <SkillEditor skills={editedCharacter.skills} onChange={handleSkillsChange} />

    {/* Save/Cancel */}
    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={calculatedXpCost > availableXp}
      >
        Save Changes ({calculatedXpCost} XP)
      </Button>
      <Button variant="outlined" onClick={handleCancel}>
        Cancel
      </Button>
    </Box>
  </Box>
) : (
  {/* Read-only display */}
)}
```

---

### Phase 4: Frontend - Version History & Revert (1 hour)

**Goal:** Display edit history and allow reverting

**Tasks:**
1. Create `VersionHistoryDialog.tsx` component
2. Fetch version history from backend
3. Display changes with timestamps and XP costs
4. Implement revert functionality with confirmation

**Version History UI:**
```tsx
<Dialog open={showHistory}>
  <DialogTitle>Edit History - {character.name}</DialogTitle>
  <DialogContent>
    <Timeline>
      {versions.map(version => (
        <TimelineItem key={version.id}>
          <TimelineSeparator>
            <TimelineDot color={version.isCurrent ? 'primary' : 'grey'} />
            <TimelineConnector />
          </TimelineSeparator>
          <TimelineContent>
            <Typography variant="h6">
              Version {version.versionNumber} {version.isCurrent && '(Current)'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {format(version.editedAt, 'PPpp')} by {version.editedBy}
            </Typography>
            <Typography variant="body2">
              {version.changeSummary}
            </Typography>
            <Typography variant="body2" color="warning.main">
              XP Cost: {version.xpCost}
            </Typography>
            {!version.isCurrent && (
              <Button
                size="small"
                onClick={() => handleRevert(version.id)}
              >
                Revert to This Version
              </Button>
            )}
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  </DialogContent>
</Dialog>
```

---

### Phase 5: Backend - Version History Endpoints (30 min)

**Goal:** API endpoints for version history

**New Endpoints:**
```java
// CharacterController.java

@GetMapping("/{id}/versions")
public List<CharacterVersion> getVersionHistory(@PathVariable Long id) {
    // Return all versions for character
}

@PostMapping("/{id}/revert/{versionId}")
public Character revertToVersion(@PathVariable Long id, @PathVariable Long versionId) {
    // Revert character to specified version
    // Creates a NEW version (doesn't delete history)
}

@GetMapping("/{id}/xp-preview")
public XpPreview calculateXpCost(@PathVariable Long id, @RequestBody Character proposedChanges) {
    // Calculate XP cost without saving
}
```

---

### Phase 6: Testing (1 hour)

**Test Cases:**

#### As GAME_MASTER:
- [ ] Can edit any character
- [ ] XP costs displayed correctly
- [ ] Can revert any character to previous version
- [ ] Version history shows all changes

#### As PLAYER:
- [ ] Can edit only own characters
- [ ] Cannot edit other players' characters (403)
- [ ] XP costs displayed correctly
- [ ] Can revert own character
- [ ] Version history shows only own character's changes

#### XP Calculations:
- [ ] Attribute raise: 2 XP
- [ ] Skill below attribute: 1 XP
- [ ] Skill at/above attribute: 2 XP
- [ ] New edge: 2 XP
- [ ] Remove hindrance: 1-2 XP

#### Version History:
- [ ] Each edit creates new version
- [ ] Revert creates new version (doesn't delete history)
- [ ] Change summaries are descriptive
- [ ] Timestamps and user tracking works

---

## Database Migration Script

```sql
-- File: backend/src/main/resources/db/migration/V3__add_version_history.sql

-- Add XP tracking to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Create character_versions table
CREATE TABLE IF NOT EXISTS character_versions (
    id BIGSERIAL PRIMARY KEY,
    character_id BIGINT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Snapshot of character data (JSON)
    character_data JSONB NOT NULL,

    -- Change tracking
    change_summary TEXT,
    xp_cost INTEGER DEFAULT 0,
    total_xp_spent INTEGER DEFAULT 0,

    -- Audit fields
    edited_by BIGINT REFERENCES users(id),
    edited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reason TEXT,

    -- Is this version active?
    is_current BOOLEAN DEFAULT FALSE,

    CONSTRAINT unique_character_version UNIQUE(character_id, version_number)
);

CREATE INDEX idx_character_versions_character ON character_versions(character_id);
CREATE INDEX idx_character_versions_current ON character_versions(character_id, is_current);

-- Create initial version for all existing characters
INSERT INTO character_versions (
    character_id,
    version_number,
    character_data,
    change_summary,
    xp_cost,
    total_xp_spent,
    edited_at,
    is_current
)
SELECT
    id,
    1,
    row_to_json(characters.*)::jsonb,
    'Initial version',
    0,
    0,
    created_at,
    true
FROM characters;

-- Update current_version on all characters
UPDATE characters SET current_version = 1;
```

---

## XP Cost Examples

### Example 1: Raise Agility from d8 to d10
- **Cost:** 2 XP
- **Validation:** Can only raise one attribute per rank

### Example 2: Raise Shooting from d8 to d10 (Agility is d10)
- **Current:** d8
- **New:** d10
- **Linked Attribute:** d10
- **Cost:** 2 XP (because new value equals attribute)

### Example 3: Add "Quick" Edge
- **Cost:** 2 XP
- **Validation:** Check requirements (Novice, Agility d8+)

### Example 4: Remove "Ugly" Hindrance (Minor)
- **Cost:** 1 XP
- **Validation:** Requires GM approval

---

## Success Criteria

- [ ] Players can edit their own characters
- [ ] GM can edit any character
- [ ] All edits save to database
- [ ] XP costs calculated and displayed accurately
- [ ] Version history tracked for all characters
- [ ] Revert functionality works without data loss
- [ ] Authorization properly enforced
- [ ] Derived stats recalculate after edits
- [ ] UI shows clear XP cost preview before saving

---

## Rollout Plan

1. **Phase 1-2 (Backend):** Deploy database migration and backend endpoints
2. **Test backend** with Postman/curl
3. **Phase 3-4 (Frontend):** Deploy UI components
4. **Phase 5:** Add version history endpoints
5. **Phase 6:** Comprehensive testing
6. **Deploy to Railway** production

---

**Status:** Ready to implement
**Next Step:** Start with Phase 1 - Backend basic edit endpoint
