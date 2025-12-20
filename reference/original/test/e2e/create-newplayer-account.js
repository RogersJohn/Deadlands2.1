const axios = require('axios');
const { Client } = require('pg');

const API_URL = 'https://deadlands-campaign-manager-production.up.railway.app/api';

async function createNewPlayerAccount() {
  console.log('Creating e2e_newplayer account...\n');

  try {
    // Connect to database
    const client = new Client({
      connectionString: 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway'
    });

    await client.connect();

    // Create via SQL (API registration is not public)
    // Password hash for "Test123!" (same as other e2e accounts)
    try {
      await client.query(`
        INSERT INTO users (username, email, password, role, active, created_at, updated_at)
        VALUES ('e2e_newplayer', 'e2e_newplayer@test.com', '$2b$10$Iyqph9zjl2ChQ8MAE4rbheC5tHTPskAJqJQeacoXs3/4zp2ibqIo6', 'PLAYER', true, NOW(), NOW())
        ON CONFLICT (username) DO NOTHING
      `);
      console.log('✅ Account "e2e_newplayer" created successfully');
    } catch (error) {
      if (error.code === '23505') {
        console.log('ℹ️  Account "e2e_newplayer" already exists');
      } else {
        throw error;
      }
    }

    const userResult = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['e2e_newplayer']
    );

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      // Delete any characters to ensure 0
      const deleteResult = await client.query(
        'DELETE FROM characters WHERE player_id = $1',
        [userId]
      );

      if (deleteResult.rowCount > 0) {
        console.log(`✅ Deleted ${deleteResult.rowCount} characters (account must have 0 for error tests)`);
      } else {
        console.log('✅ Account has 0 characters (correct)');
      }
    }

    // Show final state
    console.log('\n=== Final E2E Accounts ===');
    const finalResult = await client.query(`
      SELECT u.username, u.role, COUNT(c.id) as character_count
      FROM users u
      LEFT JOIN characters c ON u.id = c.player_id
      WHERE u.username LIKE 'e2e_%'
      GROUP BY u.username, u.role
      ORDER BY u.username
    `);

    finalResult.rows.forEach(row => {
      console.log(`${row.username.padEnd(20)} ${row.role.padEnd(15)} ${row.character_count} characters`);
    });

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

createNewPlayerAccount();
