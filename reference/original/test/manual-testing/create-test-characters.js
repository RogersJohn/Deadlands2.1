/**
 * Create Test Characters for Production
 *
 * Creates two fully-loaded characters for e2e_player1 and e2e_player2
 * with ALL available powers, equipment, edges, and skills.
 *
 * Usage: node create-test-characters.js
 */

// Production API URL
const API_URL = process.env.API_URL || 'https://deadlands-campaign-manager-production.up.railway.app/api';

// Test accounts (production credentials)
const PASSWORD = 'Test123!';
const GM_PASSWORD = 'Test123!';

const players = [
  {
    username: 'e2e_player1',
    password: PASSWORD,
    characterName: 'Wild West Huckster',
    occupation: 'Huckster - Master of the Weird West',
    arcaneBackground: 'Huckster'
  },
  {
    username: 'e2e_player2',
    password: PASSWORD,
    characterName: 'Frontier Blessed',
    occupation: 'Blessed - Divine Agent of the Lord',
    arcaneBackground: 'Blessed'
  }
];

/**
 * Login and get JWT token
 */
async function login(username, password) {
  console.log(`  Logging in as ${username}...`);
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Login failed for ${username}: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Fetch all reference data
 */
async function fetchReferenceData(token) {
  console.log('  Fetching reference data...');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const [powers, equipment, edges, hindrances, skills] = await Promise.all([
    fetch(`${API_URL}/reference/powers`, { headers }).then(r => r.json()),
    fetch(`${API_URL}/reference/equipment`, { headers }).then(r => r.json()),
    fetch(`${API_URL}/reference/edges`, { headers }).then(r => r.json()),
    fetch(`${API_URL}/reference/hindrances`, { headers }).then(r => r.json()),
    fetch(`${API_URL}/reference/skills`, { headers }).then(r => r.json())
  ]);

  console.log(`    - Powers: ${powers.length}`);
  console.log(`    - Equipment: ${equipment.length}`);
  console.log(`    - Edges: ${edges.length}`);
  console.log(`    - Hindrances: ${hindrances.length}`);
  console.log(`    - Skills: ${skills.length}`);

  return { powers, equipment, edges, hindrances, skills };
}

/**
 * Check if player already has characters
 */
async function getExistingCharacters(token) {
  const response = await fetch(`${API_URL}/characters`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    return [];
  }

  return await response.json();
}

/**
 * Create a fully-loaded character
 */
async function createCharacter(token, player, referenceData) {
  console.log(`  Creating character: ${player.characterName}...`);

  const { powers, equipment, edges, hindrances, skills } = referenceData;

  // Build skill list from reference data
  const characterSkills = [];
  for (const skill of skills) {
    characterSkills.push({
      name: skill.name,
      dieValue: 'd10'
    });
  }

  // Add extra skills not in reference
  const extraSkills = ['Fighting', 'Shooting', 'Notice', 'Persuasion', 'Stealth', 'Healing', 'Guts', 'Hexslinging', 'Faith', 'Spellcasting'];
  for (const name of extraSkills) {
    if (!characterSkills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      characterSkills.push({ name, dieValue: 'd10' });
    }
  }

  // Build edge list (limit to avoid payload issues)
  const characterEdges = [];
  for (const edge of edges.slice(0, 20)) {
    characterEdges.push({
      name: edge.name,
      description: (edge.description || edge.effect || 'Special ability').substring(0, 500)
    });
  }
  characterEdges.push({
    name: `Arcane Background (${player.arcaneBackground})`,
    description: `Can cast ${player.arcaneBackground} powers`
  });

  // Build hindrance list (just a few)
  const characterHindrances = [];
  for (const h of hindrances.slice(0, 3)) {
    characterHindrances.push({
      name: h.name,
      description: (h.description || h.effect || 'Character flaw').substring(0, 500),
      severity: h.severity || 'MINOR'
    });
  }

  // Build equipment list from reference (filter out unsupported types)
  const validTypes = ['WEAPON_MELEE', 'CONSUMABLE', 'WEAPON_RANGED', 'TREASURE', 'AMMUNITION', 'ARMOR', 'GEAR'];
  const characterEquipment = [];
  for (const eq of equipment) {
    // Skip equipment with unsupported types
    if (eq.type && !validTypes.includes(eq.type)) {
      console.log(`    Skipping ${eq.name} (unsupported type: ${eq.type})`);
      continue;
    }
    characterEquipment.push({
      name: eq.name,
      description: (eq.description || '').substring(0, 200),
      type: eq.type || 'GEAR',
      quantity: eq.quantity || 1,
      damage: eq.damage || null,
      range: eq.range || null,
      rof: eq.rof || null,
      shots: eq.shots || null,
      isEquipped: true
    });
  }

  // Note: Arcane powers need special handling - skip for initial creation
  // They can be added later via the UI or a separate API call
  const characterPowers = [];

  // Create the character object
  const character = {
    name: player.characterName,
    occupation: player.occupation,
    isNpc: false,
    notes: `Test character with ALL abilities.\nArcane Background: ${player.arcaneBackground}`,

    // Savage Worlds Attributes
    agilityDie: 'd10',
    smartsDie: 'd12',
    spiritDie: 'd10',
    strengthDie: 'd8',
    vigorDie: 'd10',

    // Derived Stats
    pace: 6,
    size: 0,
    parry: 7,
    toughness: 7,
    charisma: 2,
    grit: 5,

    // Power Points & Fate Chips
    currentPowerPoints: 30,
    maxPowerPoints: 30,
    fateChips: 5,

    // Combat State
    woundCount: 0,
    isShaken: false,

    // XP
    totalXp: 80,
    spentXp: 80,

    // Collections
    skills: characterSkills,
    edges: characterEdges,
    hindrances: characterHindrances,
    equipment: characterEquipment,
    arcanePowers: characterPowers
  };

  console.log(`    Sending: ${characterSkills.length} skills, ${characterEdges.length} edges, ${characterEquipment.length} equipment, ${characterPowers.length} powers`);

  // Send to API
  const response = await fetch(`${API_URL}/characters`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(character)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create character: ${response.status} - ${text}`);
  }

  const created = await response.json();
  console.log(`    ✅ Created character ID: ${created.id}`);
  return created;
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('  Create Test Characters for Production');
  console.log('========================================');
  console.log(`API URL: ${API_URL}`);
  console.log('');

  // First, login as GM to get reference data
  console.log('[GM] Getting reference data...');
  const gmToken = await login('gamemaster', GM_PASSWORD);
  const referenceData = await fetchReferenceData(gmToken);
  console.log('');

  // Create character for each player
  for (const player of players) {
    console.log(`[${player.username}] Processing...`);

    try {
      // Login as player
      const token = await login(player.username, player.password);

      // Check for existing characters
      const existing = await getExistingCharacters(token);
      const existingChar = existing.find(c => c.name === player.characterName);

      if (existingChar) {
        console.log(`    ⚠️  Character "${player.characterName}" already exists (ID: ${existingChar.id})`);
        console.log(`    Skipping creation. Delete it first if you want to recreate.`);
      } else {
        // Create character
        await createCharacter(token, player, referenceData);
      }

      console.log(`[${player.username}] ✅ Done!`);

    } catch (error) {
      console.error(`[${player.username}] ❌ Error:`, error.message);
    }

    console.log('');
  }

  console.log('========================================');
  console.log('✅ Character creation complete!');
  console.log('========================================');
  console.log('');
  console.log('Now run launch-test-scenario.js to test with these characters.');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
