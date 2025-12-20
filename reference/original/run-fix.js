const { Client } = require('pg');
const fs = require('fs');

// Railway Postgres connection (internal URL won't work from outside Railway)
// We need the PUBLIC connection URL
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:MIYRwGqttlrIeJSvgYWstxkmvxRXtMBt@postgres.railway.internal:5432/railway';

console.log('Connecting to Railway Postgres...');

const client = new Client({
  connectionString: connectionString,
});

async function runFix() {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read the SQL file
    const sql = fs.readFileSync('./fix-railway-characters.sql', 'utf8');

    console.log('Running fix script...');
    await client.query(sql);

    console.log('✅ Fix script completed successfully!');

    // Verify the changes
    console.log('\nVerifying changes:');
    const result = await client.query(`
      SELECT id, name, agility_die, smarts_die, spirit_die, strength_die, vigor_die, charisma
      FROM characters
      ORDER BY id
    `);

    console.log('\nCharacters after fix:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

runFix();
