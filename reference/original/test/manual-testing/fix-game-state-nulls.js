/**
 * Fix NULL values in game_state table
 *
 * Run with production database URL:
 * DATABASE_URL="postgresql://..." node fix-game-state-nulls.js
 */

const { Client } = require('pg');

async function fixGameStateNulls() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('DATABASE_URL environment variable is required');
        process.exit(1);
    }

    const client = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Check current state
        const beforeResult = await client.query(`
            SELECT id, round_number, combat_active, joker_dealt_this_round
            FROM game_state
        `);
        console.log('Before fix:', beforeResult.rows);

        // Fix NULL values
        const updateRoundNumber = await client.query(`
            UPDATE game_state SET round_number = 1 WHERE round_number IS NULL
        `);
        console.log(`Updated ${updateRoundNumber.rowCount} rows for round_number`);

        const updateCombatActive = await client.query(`
            UPDATE game_state SET combat_active = false WHERE combat_active IS NULL
        `);
        console.log(`Updated ${updateCombatActive.rowCount} rows for combat_active`);

        const updateJokerDealt = await client.query(`
            UPDATE game_state SET joker_dealt_this_round = false WHERE joker_dealt_this_round IS NULL
        `);
        console.log(`Updated ${updateJokerDealt.rowCount} rows for joker_dealt_this_round`);

        // Verify fix
        const afterResult = await client.query(`
            SELECT id, round_number, combat_active, joker_dealt_this_round
            FROM game_state
        `);
        console.log('After fix:', afterResult.rows);

        console.log('Fix complete!');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.end();
    }
}

fixGameStateNulls();
