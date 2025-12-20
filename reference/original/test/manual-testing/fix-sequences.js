/**
 * Fix PostgreSQL Sequences
 *
 * Resets the auto-increment sequences to be higher than existing max IDs
 * This fixes "duplicate key" errors when inserting new records
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway';

const tables = [
  'edges',
  'skills',
  'equipment',
  'hindrances',
  'arcane_powers',
  'wounds',
  'characters',
  'users'
];

async function fixSequences() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('Connected to database');

    for (const table of tables) {
      try {
        // Get the max ID in the table
        const maxResult = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM ${table}`);
        const maxId = parseInt(maxResult.rows[0].max_id, 10);

        // Get the sequence name
        const seqResult = await client.query(`
          SELECT pg_get_serial_sequence('${table}', 'id') as seq_name
        `);
        const seqName = seqResult.rows[0].seq_name;

        if (seqName) {
          // Set sequence to max_id + 1
          const nextVal = maxId + 1;
          await client.query(`SELECT setval('${seqName}', ${nextVal}, false)`);
          console.log(`✅ ${table}: sequence reset to ${nextVal} (max ID was ${maxId})`);
        } else {
          console.log(`⚠️  ${table}: no sequence found`);
        }
      } catch (error) {
        console.log(`⚠️  ${table}: ${error.message}`);
      }
    }

    console.log('\nSequences fixed!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

fixSequences();
