const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway';

async function createE2ECharacters() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    console.log('Connecting to Railway Postgres...');
    await client.connect();
    console.log('Connected!');

    // Get user IDs
    const usersResult = await client.query(
      "SELECT id, username FROM users WHERE username IN ('e2e_player1', 'e2e_player2')"
    );

    if (usersResult.rows.length === 0) {
      console.error('❌ Player accounts not found!');
      process.exit(1);
    }

    console.log(`Found ${usersResult.rows.length} player accounts`);

    for (const user of usersResult.rows) {
      const characterName = `${user.username}_character`;

      // Check if character already exists
      const existing = await client.query(
        'SELECT id FROM characters WHERE player_id = $1',
        [user.id]
      );

      if (existing.rows.length > 0) {
        console.log(`Character already exists for ${user.username} (skipping)`);
        continue;
      }

      // Create character (using Deadlands attributes)
      const result = await client.query(`
        INSERT INTO characters (
          player_id, name, cognition_die, deftness_die, nimbleness_die,
          quickness_die, smarts_die, spirit_die, strength_die, vigor_die,
          parry, toughness, pace, grit, wind, size, charisma, spent_xp, total_xp,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
        RETURNING id, name
      `, [
        user.id,
        characterName,
        'd8',  // cognition_die
        'd8',  // deftness_die
        'd8',  // nimbleness_die
        'd8',  // quickness_die
        'd6',  // smarts_die
        'd6',  // spirit_die
        'd6',  // strength_die
        'd8',  // vigor_die
        5,     // parry
        6,     // toughness
        6,     // pace
        1,     // grit
        12,    // wind
        0,     // size
        0,     // charisma
        0,     // spent_xp
        0      // total_xp
      ]);

      console.log(`✓ Created character: ${result.rows[0].name} (ID: ${result.rows[0].id})`);
    }

    console.log('\n✅ E2E test characters created successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createE2ECharacters();
