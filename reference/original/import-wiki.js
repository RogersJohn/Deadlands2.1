const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL;

// Mapping of filenames to wiki entries
const wikiFiles = [
  // Public campaign lore
  {
    file: 'civil-war-wiki.md',
    title: 'The Great Civil War',
    slug: 'civil-war',
    category: 'CAMPAIGN_LORE',
    visibility: 'PUBLIC',
    isPublic: true,
    sortOrder: 1
  },
  {
    file: 'railroad-race-wiki.md',
    title: 'The Great Railroad Race',
    slug: 'railroad-race',
    category: 'CAMPAIGN_LORE',
    visibility: 'PUBLIC',
    isPublic: true,
    sortOrder: 2
  },
  {
    file: 'global-affairs-wiki.md',
    title: 'Global Affairs & The Weird West',
    slug: 'global-affairs',
    category: 'CAMPAIGN_LORE',
    visibility: 'PUBLIC',
    isPublic: true,
    sortOrder: 3
  },

  // Character bios - public
  {
    file: 'bob-public-bio.md',
    title: 'Mexicali Bob - Public Profile',
    slug: 'mexicali-bob-public',
    category: 'CHARACTER_BIO',
    visibility: 'PUBLIC',
    isPublic: true,
    relatedCharacterId: 1, // Mexicali Bob's character ID
    sortOrder: 10
  },
  {
    file: 'john-henry-public.md',
    title: 'John Henry Farraday - Public Profile',
    slug: 'john-henry-farraday-public',
    category: 'CHARACTER_BIO',
    visibility: 'PUBLIC',
    isPublic: true,
    relatedCharacterId: 4, // John Henry's character ID
    sortOrder: 11
  },

  // Character bios - public (more profiles)
  {
    file: 'cornelius-bio.md',
    title: 'Cornelius Wilberforce III - Biography',
    slug: 'cornelius-wilberforce-bio',
    category: 'CHARACTER_BIO',
    visibility: 'PUBLIC',
    isPublic: true,
    relatedCharacterId: 2, // Cornelius
    sortOrder: 12
  },
  {
    file: 'jack-horner-bio.md',
    title: 'Jack Horner - The Old Prospector',
    slug: 'jack-horner-bio',
    category: 'CHARACTER_BIO',
    visibility: 'PUBLIC',
    isPublic: true,
    relatedCharacterId: 5, // Jack Horner
    sortOrder: 13
  },

  // Character bios - private (character-specific, only visible to owner)
  {
    file: 'bob-private-bio.md',
    title: 'Mexicali Bob - Private Background',
    slug: 'mexicali-bob-private',
    category: 'CHARACTER_BIO',
    visibility: 'CHARACTER_SPECIFIC',
    isPublic: false,
    relatedCharacterId: 1, // Mexicali Bob
    sortOrder: 20
  },
  {
    file: 'john-henry-private.md',
    title: 'John Henry Farraday - Secret Past',
    slug: 'john-henry-farraday-private',
    category: 'CHARACTER_BIO',
    visibility: 'CHARACTER_SPECIFIC',
    isPublic: false,
    relatedCharacterId: 4, // John Henry
    sortOrder: 21
  }
];

async function importWiki() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if wiki_entries table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'wiki_entries'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  wiki_entries table does not exist yet.');
      console.log('Please restart the Spring Boot backend to create tables, then run this script again.\n');
      return;
    }

    // Clear existing wiki entries
    console.log('🗑️  Clearing existing wiki entries...');
    await client.query('DELETE FROM wiki_entries');

    const wikiDir = path.join(__dirname, 'Wiki');
    let imported = 0;
    let skipped = 0;

    console.log('\n📚 Importing wiki entries:\n');

    for (const entry of wikiFiles) {
      const filePath = path.join(wikiDir, entry.file);

      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Skipping ${entry.file} - file not found`);
        skipped++;
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');

      const query = `
        INSERT INTO wiki_entries
          (title, slug, content, category, visibility, is_public, related_character_id, sort_order, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id
      `;

      const values = [
        entry.title,
        entry.slug,
        content,
        entry.category,
        entry.visibility,
        entry.isPublic,
        entry.relatedCharacterId || null,
        entry.sortOrder
      ];

      const result = await client.query(query, values);
      const id = result.rows[0].id;

      const visibilityIcon = entry.visibility === 'PUBLIC' ? '🌍' :
                            entry.visibility === 'CHARACTER_SPECIFIC' ? '👤' : '🔒';

      console.log(`${visibilityIcon} [${id}] ${entry.title} (${entry.category})`);
      imported++;
    }

    console.log(`\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\nWiki entries are now available in the database.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await client.end();
  }
}

importWiki();
