const { Client } = require('pg');

async function verifyTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check for game_state table
    const gameStateCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'game_state'
      );
    `);
    console.log('game_state table exists:', gameStateCheck.rows[0].exists);

    // Check for token_positions table
    const tokenPosCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'token_positions'
      );
    `);
    console.log('token_positions table exists:', tokenPosCheck.rows[0].exists);

    // If tables exist, check their structure
    if (gameStateCheck.rows[0].exists) {
      const gameStateColumns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'game_state'
        ORDER BY ordinal_position;
      `);
      console.log('\ngame_state columns:');
      gameStateColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }

    if (tokenPosCheck.rows[0].exists) {
      const tokenPosColumns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'token_positions'
        ORDER BY ordinal_position;
      `);
      console.log('\ntoken_positions columns:');
      tokenPosColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });

      // Check if there's any data
      const count = await client.query('SELECT COUNT(*) FROM token_positions');
      console.log(`\ntoken_positions rows: ${count.rows[0].count}`);
    }

    // Check GameState singleton
    if (gameStateCheck.rows[0].exists) {
      const gameState = await client.query('SELECT * FROM game_state WHERE id = 1');
      if (gameState.rows.length > 0) {
        console.log('\nGameState singleton (id=1):');
        console.log('  - Turn:', gameState.rows[0].turn_number);
        console.log('  - Phase:', gameState.rows[0].turn_phase);
        console.log('  - Map:', gameState.rows[0].current_map || 'none');
      } else {
        console.log('\nNo GameState singleton found (will be auto-created on first use)');
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyTables();
