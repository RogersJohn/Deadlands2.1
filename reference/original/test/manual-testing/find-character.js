/**
 * Find character owner by character name
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway';

async function findCharacter(characterName) {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log(`Searching for character: "${characterName}"...\n`);

    const result = await client.query(`
      SELECT
        c.id as character_id,
        c.name as character_name,
        c.occupation,
        u.id as user_id,
        u.username,
        u.role
      FROM characters c
      JOIN users u ON c.player_id = u.id
      WHERE LOWER(c.name) LIKE LOWER($1)
      ORDER BY c.name
    `, [`%${characterName}%`]);

    if (result.rows.length === 0) {
      console.log('No characters found matching that name.');

      // Show all characters
      console.log('\nAll characters in database:');
      const allChars = await client.query(`
        SELECT c.name, u.username
        FROM characters c
        JOIN users u ON c.player_id = u.id
        ORDER BY c.name
      `);
      allChars.rows.forEach(r => console.log(`  - ${r.name} (owned by: ${r.username})`));
    } else {
      console.log('Found character(s):');
      result.rows.forEach(row => {
        console.log(`\n  Character: ${row.character_name}`);
        console.log(`  Character ID: ${row.character_id}`);
        console.log(`  Occupation: ${row.occupation || 'N/A'}`);
        console.log(`  ---`);
        console.log(`  Owner Username: ${row.username}`);
        console.log(`  Owner Role: ${row.role}`);
        console.log(`  Password: Test123!`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

const searchName = process.argv[2] || 'Jack Horner';
findCharacter(searchName);
