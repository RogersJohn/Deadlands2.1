const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL;

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database');

    const sql = fs.readFileSync('./add-xp-columns.sql', 'utf8');

    console.log('Running migration to add XP columns...\n');
    const result = await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('\nColumns added:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
