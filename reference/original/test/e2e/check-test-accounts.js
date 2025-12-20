const { Client } = require('pg');

async function checkTestAccounts() {
  const client = new Client({
    connectionString: 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway'
  });

  try {
    await client.connect();

    // Get all e2e test users
    const usersResult = await client.query(`
      SELECT u.id, u.username, u.role,
             COUNT(c.id) as character_count
      FROM users u
      LEFT JOIN characters c ON u.id = c.player_id
      WHERE u.username LIKE 'e2e_%'
      GROUP BY u.id, u.username, u.role
      ORDER BY u.username
    `);

    console.log('\n=== E2E Test Accounts in Production ===\n');
    console.log('Username'.padEnd(25) + 'Role'.padEnd(15) + 'Characters');
    console.log('-'.repeat(60));

    usersResult.rows.forEach(row => {
      console.log(
        row.username.padEnd(25) +
        row.role.padEnd(15) +
        row.character_count
      );
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`Total E2E accounts: ${usersResult.rows.length}`);

    // Get character details for e2e accounts
    console.log('\n=== E2E Characters ===\n');
    const charsResult = await client.query(`
      SELECT u.username, c.name as character_name, c.occupation
      FROM users u
      JOIN characters c ON u.id = c.player_id
      WHERE u.username LIKE 'e2e_%'
      ORDER BY u.username, c.name
    `);

    if (charsResult.rows.length > 0) {
      console.log('User'.padEnd(25) + 'Character'.padEnd(30) + 'Occupation');
      console.log('-'.repeat(70));
      charsResult.rows.forEach(row => {
        console.log(
          row.username.padEnd(25) +
          row.character_name.padEnd(30) +
          (row.occupation || 'N/A')
        );
      });
    } else {
      console.log('No characters found for e2e accounts');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTestAccounts();
