const { Client } = require('pg');

async function cleanupTestData() {
  const client = new Client({
    connectionString: 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway'
  });

  try {
    await client.connect();
    console.log('Connected to production database\n');

    // Get user IDs for test accounts
    const usersResult = await client.query(`
      SELECT id, username FROM users WHERE username LIKE 'e2e_%'
    `);

    for (const user of usersResult.rows) {
      console.log(`\n=== Cleaning up ${user.username} ===`);

      // Count current characters
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM characters WHERE player_id = $1',
        [user.id]
      );
      const currentCount = parseInt(countResult.rows[0].count);
      console.log(`Current characters: ${currentCount}`);

      if (currentCount === 0) {
        console.log('No characters to clean up');
        continue;
      }

      // Keep only the 2 most recent characters
      const keepCount = Math.min(2, currentCount);

      // Get IDs of characters to keep (most recent)
      const keepResult = await client.query(`
        SELECT id FROM characters
        WHERE player_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [user.id, keepCount]);

      const keepIds = keepResult.rows.map(r => r.id);

      if (keepIds.length > 0) {
        // Delete all except the ones we're keeping
        const deleteResult = await client.query(`
          DELETE FROM characters
          WHERE player_id = $1 AND id NOT IN (${keepIds.map((_, i) => `$${i + 2}`).join(',')})
        `, [user.id, ...keepIds]);

        console.log(`Deleted: ${deleteResult.rowCount} duplicate characters`);
        console.log(`Kept: ${keepIds.length} most recent characters`);
      }
    }

    // Update one character for e2e_player1 to have a proper name
    console.log('\n=== Updating character names ===');

    const player1Result = await client.query(`
      SELECT id FROM users WHERE username = 'e2e_player1'
    `);

    if (player1Result.rows.length > 0) {
      const player1Id = player1Result.rows[0].id;

      // Update first character to be "Bob Cratchit"
      const updateResult1 = await client.query(`
        UPDATE characters
        SET name = 'Bob Cratchit',
            occupation = 'Shopkeeper',
            pace = 6,
            parry = 5,
            toughness = 7
        WHERE player_id = $1
        AND id = (SELECT id FROM characters WHERE player_id = $1 ORDER BY created_at DESC LIMIT 1)
      `, [player1Id]);

      if (updateResult1.rowCount > 0) {
        console.log('✅ Created "Bob Cratchit" for e2e_player1');
      }

      // Update second character if it exists
      const secondCharResult = await client.query(`
        SELECT id FROM characters WHERE player_id = $1 ORDER BY created_at DESC LIMIT 1 OFFSET 1
      `, [player1Id]);

      if (secondCharResult.rows.length > 0) {
        await client.query(`
          UPDATE characters
          SET name = 'Test Character 2',
              occupation = 'Gunslinger'
          WHERE id = $1
        `, [secondCharResult.rows[0].id]);
        console.log('✅ Created "Test Character 2" for e2e_player1');
      }
    }

    // Update characters for e2e_player2
    const player2Result = await client.query(`
      SELECT id FROM users WHERE username = 'e2e_player2'
    `);

    if (player2Result.rows.length > 0) {
      const player2Id = player2Result.rows[0].id;

      await client.query(`
        UPDATE characters
        SET name = 'Player 2 Character',
            occupation = 'Huckster',
            pace = 6,
            parry = 5,
            toughness = 6
        WHERE player_id = $1
        AND id = (SELECT id FROM characters WHERE player_id = $1 ORDER BY created_at DESC LIMIT 1)
      `, [player2Id]);

      console.log('✅ Created "Player 2 Character" for e2e_player2');
    }

    // Create a character for e2e_testgm if they don't have one
    const gmResult = await client.query(`
      SELECT id FROM users WHERE username = 'e2e_testgm'
    `);

    if (gmResult.rows.length > 0) {
      const gmId = gmResult.rows[0].id;

      const gmCharCount = await client.query(
        'SELECT COUNT(*) as count FROM characters WHERE player_id = $1',
        [gmId]
      );

      if (parseInt(gmCharCount.rows[0].count) === 0) {
        await client.query(`
          INSERT INTO characters (
            player_id, name, occupation, pace, parry, toughness,
            agility_die, cognition_die, deftness_die, nimbleness_die,
            quickness_die, smarts_die, spirit_die, strength_die, vigor_die,
            charisma, grit, size, wind, total_xp, spent_xp,
            is_npc, created_at, updated_at
          ) VALUES (
            $1, 'GM Character', 'Game Master', 6, 5, 7,
            8, 8, 8, 8, 8, 8, 8, 8, 8,
            0, 0, 0, 12, 0, 0,
            false, NOW(), NOW()
          )
        `, [gmId]);

        console.log('✅ Created "GM Character" for e2e_testgm');
      }
    }

    console.log('\n=== Cleanup Complete ===\n');

    // Show final state
    const finalResult = await client.query(`
      SELECT u.username, COUNT(c.id) as character_count
      FROM users u
      LEFT JOIN characters c ON u.id = c.player_id
      WHERE u.username LIKE 'e2e_%'
      GROUP BY u.username
      ORDER BY u.username
    `);

    console.log('Final state:');
    finalResult.rows.forEach(row => {
      console.log(`  ${row.username}: ${row.character_count} characters`);
    });

  } catch (error) {
    console.error('Error during cleanup:', error.message);
  } finally {
    await client.end();
  }
}

cleanupTestData();
