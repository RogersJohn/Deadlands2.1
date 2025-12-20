/**
 * Rename a user in the production database
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway';

async function renameUser(oldUsername, newUsername) {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log(`Renaming user: ${oldUsername} -> ${newUsername}`);

    // Check if old user exists
    const checkOld = await client.query('SELECT id, username FROM users WHERE username = $1', [oldUsername]);
    if (checkOld.rows.length === 0) {
      console.log(`❌ User "${oldUsername}" not found.`);
      return;
    }

    // Check if new username is already taken
    const checkNew = await client.query('SELECT id, username FROM users WHERE username = $1', [newUsername]);
    if (checkNew.rows.length > 0) {
      console.log(`❌ Username "${newUsername}" is already taken.`);
      return;
    }

    // Rename the user
    await client.query('UPDATE users SET username = $1 WHERE username = $2', [newUsername, oldUsername]);

    console.log(`✅ User renamed successfully!`);
    console.log(`\nNew login details:`);
    console.log(`  Username: ${newUsername}`);
    console.log(`  Password: Test123!`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

renameUser('JCKullman', 'JCKullmann');
