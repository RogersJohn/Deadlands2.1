# Wiki System Implementation Guide

**Date:** 2025-11-05
**Status:** Ready for deployment
**Estimated Setup Time:** 15-20 minutes

---

## Overview

The wiki system allows you to display campaign lore, character bios, and session notes with granular access control:

- **Public entries**: Visible to all players
- **Character-specific private entries**: Only visible to the character's player + GM
- **Private entries**: Visible only to GM (can grant access to specific players)
- **Grantable access**: GM can give players access to secrets over time

---

## Step 1: Install Frontend Dependencies

The wiki uses `react-markdown` for rendering markdown content.

```bash
cd frontend
npm install react-markdown
```

---

## Step 2: Restart Backend

The backend needs to create new database tables for wiki entries and access control.

**Stop and restart your Spring Boot application** (IntelliJ/VS Code/Docker).

The backend will automatically create these tables:
- `wiki_entries` - Stores wiki content
- `wiki_access` - Tracks who has access to private entries

---

## Step 3: Import Wiki Markdown Files

Run the import script to load your existing markdown files into the database:

```bash
# From project root
DATABASE_URL="postgresql://postgres:MIYRwGqttlrIeJSvgYWstxkmvxRXtMBt@centerbeam.proxy.rlwy.net:31016/railway" node import-wiki.js
```

This will import all your wiki files:

### Public Entries
- `civil-war-wiki.md` → The Great Civil War
- `railroad-race-wiki.md` → The Great Railroad Race
- `global-affairs-wiki.md` → Global Affairs & The Weird West
- `bob-public-bio.md` → Mexicali Bob - Public Profile
- `john-henry-public.md` → John Henry Farraday - Public Profile

### Character-Specific Private Entries
- `bob-private-bio.md` → Mexicali Bob - Private Background (only Bob's player + GM)
- `john-henry-private.md` → John Henry Farraday - Secret Past (only John's player + GM)
- `cornelius-bio.md` → Cornelius Wilberforce III - Biography
- `jack-horner-bio.md` → Jack Horner - The Old Prospector

---

## Step 4: Test the Wiki

1. **Log in as a player** (not GM)
2. Go to the **Wiki** page
3. You should see:
   - ✅ All public entries (campaign lore, public bios)
   - ✅ Character-specific private entries for YOUR character only
   - ❌ Other characters' private entries (should not appear)

4. **Log in as Game Master**
5. You should see ALL wiki entries

---

## Access Control Examples

### Example 1: Mexicali Bob's Player

**Can see:**
- All public entries
- Bob's public bio
- Bob's private bio (character-specific)

**Cannot see:**
- John Henry's private bio
- Cornelius's private bio
- Jack Horner's private bio

*(Unless GM grants access)*

### Example 2: GM Granting Access

When Bob's player discovers John Henry's secret in Session 8:

```typescript
// GM uses access management UI (coming soon) or API:
POST /api/wiki/7/grant-access/2
{
  "reason": "Discovered John Henry's secret in Session 8"
}
```

Now Bob's player can see John Henry's private entry.

---

## Wiki File Structure

Each wiki entry has:

**Required Fields:**
- `file`: Filename in Wiki/ directory
- `title`: Display title
- `slug`: URL-friendly identifier
- `category`: CHARACTER_BIO | CAMPAIGN_LORE | LOCATION | SESSION_NOTE | OTHER
- `visibility`: PUBLIC | CHARACTER_SPECIFIC | PRIVATE
- `isPublic`: true/false (quick filter)
- `sortOrder`: Display order within category

**Optional Fields:**
- `relatedCharacterId`: Link to a character (for bios)

---

## Frontend Features

### Wiki Page (`/wiki`)

**List View:**
- Search bar (searches title and content)
- Category tabs (All, Character Bios, Campaign Lore, Locations, Session Notes, Other)
- Cards showing entry title with visibility icon
  - 🌍 Green = Public
  - 👤 Blue = Character-specific
  - 🔒 Orange = Private

**Entry View:**
- Full markdown rendering
- Beautiful typography
- Back button to return to list
- Shows related character name if applicable

---

## API Endpoints

### Public Endpoints (Player + GM)

```
GET /api/wiki
```
Returns all wiki entries visible to current user

```
GET /api/wiki/slug/{slug}
```
Get specific entry by slug (403 if no access)

```
GET /api/wiki/category/{category}
```
Filter by category

### GM-Only Endpoints

```
POST /api/wiki/{entryId}/grant-access/{userId}
Body: { "reason": "Why access was granted" }
```
Grant a player access to a private entry

```
DELETE /api/wiki/{entryId}/revoke-access/{userId}
```
Revoke access

```
GET /api/wiki/{entryId}/access-grants
```
See who has access to an entry

---

## Adding New Wiki Entries

### Option 1: Create Markdown File + Re-import

1. Create new `.md` file in `Wiki/` directory
2. Add entry to `import-wiki.js` file
3. Re-run import script (it clears and re-imports all)

### Option 2: Direct Database Insert (Advanced)

```sql
INSERT INTO wiki_entries
  (title, slug, content, category, visibility, is_public, related_character_id, sort_order, created_at, updated_at)
VALUES
  ('New Entry', 'new-entry', '# Content here', 'CAMPAIGN_LORE', 'PUBLIC', true, NULL, 100, NOW(), NOW());
```

---

## Future Enhancements (Phase 2)

- [ ] In-browser markdown editor for GM
- [ ] Create/edit/delete wiki entries from UI
- [ ] Bulk access management interface
- [ ] Revision history for wiki entries
- [ ] Comments/notes on entries
- [ ] File attachments (images, maps)
- [ ] Wiki entry templates
- [ ] Link wiki entries to session logs

---

## Troubleshooting

### "No wiki entries found"

**Check:**
1. Did you run the import script?
2. Did backend create the tables? (check logs)
3. Are you logged in?

**Fix:**
```bash
# Check if tables exist
DATABASE_URL="..." node -e "
const {Client} = require('pg');
const c = new Client({connectionString: process.env.DATABASE_URL});
c.connect().then(() => c.query('SELECT COUNT(*) FROM wiki_entries'))
  .then(r => console.log('Wiki entries:', r.rows[0].count))
  .finally(() => c.end());
"
```

### "403 Forbidden" on wiki entry

This is correct! You don't have access to that private entry.

### Frontend shows "ReactMarkdown is not defined"

Install the package:
```bash
cd frontend
npm install react-markdown
```

---

## Database Schema

### wiki_entries

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| title | VARCHAR | Display title |
| slug | VARCHAR | URL-friendly unique identifier |
| content | TEXT | Markdown content (up to 50,000 chars) |
| category | ENUM | CHARACTER_BIO, CAMPAIGN_LORE, etc. |
| visibility | ENUM | PUBLIC, CHARACTER_SPECIFIC, PRIVATE |
| is_public | BOOLEAN | Quick filter for public entries |
| related_character_id | BIGINT | FK to characters (nullable) |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMP | Auto-set on creation |
| updated_at | TIMESTAMP | Auto-updated |

### wiki_access

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| wiki_entry_id | BIGINT | FK to wiki_entries |
| user_id | BIGINT | FK to users |
| granted_by | BIGINT | FK to users (GM who granted) |
| grant_reason | VARCHAR | Why access was granted |
| granted_at | TIMESTAMP | When access was granted |

**Unique constraint:** `(wiki_entry_id, user_id)` - prevents duplicate grants

---

## Access Control Logic

```java
// Visibility rules:

1. GM sees everything
2. PUBLIC entries → everyone sees
3. CHARACTER_SPECIFIC entries → character owner + GM + granted users
4. PRIVATE entries → GM + granted users only
```

---

**Implementation Complete!** ✅

Follow the steps above to deploy the wiki system to your campaign.
