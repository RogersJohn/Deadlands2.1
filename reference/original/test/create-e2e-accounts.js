const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:MIYRwGqttlrIeJSvgYWstxkmvxRXtMBt@centerbeam.proxy.rlwy.net:31016/railway';

async function createE2EAccounts() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    console.log('Connecting to Railway Postgres...');
    await client.connect();
    console.log('Connected!');

    // Read the SQL file
    const sqlFile = path.join(__dirname, 'e2e-test-accounts.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'));

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      console.log('\nExecuting:', trimmed.substring(0, 80) + '...');
      const result = await client.query(trimmed);

      if (result.command === 'SELECT') {
        console.log('Results:', result.rows);
      } else {
        console.log(`Success: ${result.command} ${result.rowCount} row(s)`);
      }
    }

    console.log('\n✅ E2E test accounts created successfully!');
    console.log('\nTest Credentials:');
    console.log('  GM: e2e_testgm / Test123!');
    console.log('  Player1: e2e_player1 / Test123!');
    console.log('  Player2: e2e_player2 / Test123!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createE2EAccounts();
