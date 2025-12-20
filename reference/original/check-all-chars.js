const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function checkAll() {
  await client.connect();

  const result = await client.query(`
    SELECT id, name, pace, size, grit
    FROM characters
    ORDER BY id
  `);

  // Also get edges and hindrances for each
  const edgesResult = await client.query('SELECT character_id, name FROM edges ORDER BY character_id');
  const hindrancesResult = await client.query('SELECT character_id, name FROM hindrances ORDER BY character_id');

  console.log('\nAll Characters - Pace and Size Check:\n');

  for (const char of result.rows) {
    const charEdges = edgesResult.rows.filter(e => e.character_id == char.id);
    const charHindrances = hindrancesResult.rows.filter(h => h.character_id == char.id);

    // Check for pace modifiers
    const hasFleetFooted = charEdges.some(e => e.name.includes('Fleet'));
    const hasLame = charHindrances.some(h => h.name === 'Lame');

    // Check for size modifiers
    const hasBrawny = charEdges.some(e => e.name === 'Brawny');
    const hasYoung = charHindrances.some(h => h.name === 'Young');

    let expectedPace = 6;
    if (hasFleetFooted) expectedPace += 2;
    if (hasLame) expectedPace -= 2;

    let expectedSize = 0;
    if (hasBrawny) expectedSize += 1;
    if (hasYoung) expectedSize -= 1;

    const paceOK = char.pace == expectedPace;
    const sizeOK = char.size == expectedSize;

    console.log(`ID ${char.id}: ${char.name}`);
    console.log(`  Pace: ${char.pace} (expected ${expectedPace}) ${paceOK ? '✅' : '❌'}`);
    console.log(`  Size: ${char.size} (expected ${expectedSize}) ${sizeOK ? '✅' : '❌'}`);
    if (!paceOK || !sizeOK) {
      const mods = [];
      if (hasFleetFooted) mods.push('Fleet-Footed (+2 Pace)');
      if (hasLame) mods.push('Lame (-2 Pace)');
      if (hasBrawny) mods.push('Brawny (+1 Size)');
      if (hasYoung) mods.push('Young (-1 Size)');
      if (mods.length > 0) {
        console.log(`  Modifiers: ${mods.join(', ')}`);
      }
    }
    console.log('');
  }

  await client.end();
}

checkAll().catch(err => console.error(err));
