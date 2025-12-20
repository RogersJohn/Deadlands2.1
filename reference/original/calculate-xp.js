const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

// Savage Worlds die notation to number mapping
const dieToNumber = (die) => {
  const match = die.match(/d(\d+)/);
  if (!match) return 4; // Default to d4
  return parseInt(match[1]);
};

// Calculate die steps above d4
const calculateDieSteps = (die) => {
  const dieValue = dieToNumber(die);
  const steps = {
    4: 0,
    6: 1,
    8: 2,
    10: 3,
    12: 4
  };
  return steps[dieValue] || 0;
};

// Calculate XP cost for attribute raises
const calculateAttributeXP = (attributes) => {
  let totalXP = 0;
  const costs = {};

  for (const [name, die] of Object.entries(attributes)) {
    const steps = calculateDieSteps(die);
    const cost = steps * 2; // 2 XP per step above d4
    costs[name] = { die, steps, cost };
    totalXP += cost;
  }

  return { totalXP, costs };
};

// Determine linked attribute for a skill
const getLinkedAttribute = (skillName, attributes) => {
  // Common skill to attribute mappings for Savage Worlds
  const mappings = {
    'Fighting': 'agility',
    "Fightin'": 'agility',
    'Shooting': 'agility',
    'Throwing': 'agility',
    'Riding': 'agility',
    'Stealth': 'agility',
    'Lockpicking': 'agility',
    'Climbing': 'strength',
    'Swimming': 'strength',
    'Guts': 'spirit',
    'Knowledge': 'smarts',
    'Notice': 'smarts',
    'Tracking': 'smarts',
    'Healing': 'smarts',
    'Persuasion': 'spirit',
    'Intimidation': 'spirit',
    'Taunt': 'smarts',
    'Streetwise': 'smarts',
    'Gambling': 'smarts'
  };

  // Check for partial matches
  for (const [key, attr] of Object.entries(mappings)) {
    if (skillName.toLowerCase().includes(key.toLowerCase())) {
      return attr;
    }
  }

  // Default mappings based on common patterns
  if (skillName.toLowerCase().includes('knowledge')) return 'smarts';
  if (skillName.toLowerCase().includes('craft')) return 'smarts';

  return 'smarts'; // Default to smarts if unknown
};

// Calculate XP cost for skills
const calculateSkillsXP = (skills, attributes) => {
  let totalXP = 0;
  const costs = [];

  for (const skill of skills) {
    const skillDie = dieToNumber(skill.die_value);
    const linkedAttr = getLinkedAttribute(skill.name, attributes);
    const attrDie = dieToNumber(attributes[linkedAttr]);

    // Each die step costs XP
    const steps = calculateDieSteps(skill.die_value);
    let cost;

    if (skillDie <= attrDie) {
      // Below or equal to attribute: 1 XP per step
      cost = steps * 1;
    } else {
      // Above attribute: 2 XP per step above attribute
      const attrSteps = calculateDieSteps(attributes[linkedAttr]);
      const belowAttrCost = attrSteps * 1;
      const aboveAttrCost = (steps - attrSteps) * 2;
      cost = belowAttrCost + aboveAttrCost;
    }

    costs.push({
      name: skill.name,
      die: skill.die_value,
      linkedAttr,
      attrDie: attributes[linkedAttr],
      steps,
      cost
    });

    totalXP += cost;
  }

  return { totalXP, costs };
};

// Calculate XP cost for edges
const calculateEdgesXP = (edges) => {
  const totalXP = edges.length * 2; // 2 XP per edge
  return { totalXP, edges: edges.map(e => ({ name: e.name, cost: 2 })) };
};

async function calculateXP() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database\n');

    // Get all player characters (not NPCs)
    const charsResult = await client.query(`
      SELECT
        id, name, occupation,
        agility_die, smarts_die, spirit_die, strength_die, vigor_die
      FROM characters
      WHERE is_npc = false
      ORDER BY id
    `);

    console.log(`Found ${charsResult.rows.length} player characters\n`);
    console.log('=' .repeat(80));

    const updates = [];

    for (const char of charsResult.rows) {
      console.log(`\n${char.name} (${char.occupation})`);
      console.log('-'.repeat(80));

      // Get character's skills
      const skillsResult = await client.query(
        'SELECT name, die_value FROM skills WHERE character_id = $1',
        [char.id]
      );

      // Get character's edges
      const edgesResult = await client.query(
        'SELECT name FROM edges WHERE character_id = $1',
        [char.id]
      );

      const attributes = {
        agility: char.agility_die,
        smarts: char.smarts_die,
        spirit: char.spirit_die,
        strength: char.strength_die,
        vigor: char.vigor_die
      };

      // Calculate XP costs
      const attrXP = calculateAttributeXP(attributes);
      const skillsXP = calculateSkillsXP(skillsResult.rows, attributes);
      const edgesXP = calculateEdgesXP(edgesResult.rows);

      // Display breakdown
      console.log('\n📊 ATTRIBUTES (2 XP per step above d4):');
      for (const [name, data] of Object.entries(attrXP.costs)) {
        if (data.steps > 0) {
          console.log(`  ${name.padEnd(10)} ${data.die} (${data.steps} steps) = ${data.cost} XP`);
        }
      }
      console.log(`  Subtotal: ${attrXP.totalXP} XP`);

      console.log('\n🎯 SKILLS:');
      skillsXP.costs.forEach(skill => {
        console.log(`  ${skill.name.padEnd(20)} ${skill.die} (linked: ${skill.linkedAttr} ${skill.attrDie}) = ${skill.cost} XP`);
      });
      console.log(`  Subtotal: ${skillsXP.totalXP} XP`);

      console.log('\n⭐ EDGES (2 XP each):');
      edgesXP.edges.forEach(edge => {
        console.log(`  ${edge.name.padEnd(30)} = ${edge.cost} XP`);
      });
      console.log(`  Subtotal: ${edgesXP.totalXP} XP`);

      const totalSpent = attrXP.totalXP + skillsXP.totalXP + edgesXP.totalXP;

      // Assign total XP (typically starting characters get some base XP)
      // Let's give them their spent XP + 10 unspent for advancement
      const totalXP = totalSpent + 10;

      console.log(`\n💰 TOTAL XP SPENT: ${totalSpent} XP`);
      console.log(`💎 TOTAL XP: ${totalXP} XP (${totalXP - totalSpent} unspent)`);

      updates.push({
        id: char.id,
        name: char.name,
        totalXP,
        spentXP: totalSpent
      });

      console.log('=' .repeat(80));
    }

    // Display summary
    console.log('\n📋 SUMMARY - XP Updates:');
    console.log('-'.repeat(80));
    updates.forEach(u => {
      console.log(`${u.name.padEnd(25)} | Total: ${u.totalXP.toString().padStart(3)} XP | Spent: ${u.spentXP.toString().padStart(3)} XP | Available: ${(u.totalXP - u.spentXP).toString().padStart(2)} XP`);
    });

    // Ask user to confirm before updating
    console.log('\n\n⚠️  Ready to update database with these values.');
    console.log('Run this script with UPDATE=true to apply changes:');
    console.log('  DATABASE_URL="..." UPDATE=true node calculate-xp.js\n');

    if (process.env.UPDATE === 'true') {
      console.log('🔄 Updating database...\n');

      for (const update of updates) {
        await client.query(
          'UPDATE characters SET total_xp = $1, spent_xp = $2 WHERE id = $3',
          [update.totalXP, update.spentXP, update.id]
        );
        console.log(`✅ Updated ${update.name}`);
      }

      console.log('\n✅ All characters updated successfully!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

calculateXP();
