/**
 * Verify characters exist for test players
 */

const API_URL = 'https://deadlands-campaign-manager-production.up.railway.app/api';

async function verify() {
  for (const username of ['e2e_player1', 'e2e_player2']) {
    console.log(`\n[${username}] Checking characters...`);

    // Login
    const loginResp = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'Test123!' })
    });

    if (!loginResp.ok) {
      console.log(`  ❌ Login failed: ${loginResp.status}`);
      continue;
    }

    const { token } = await loginResp.json();
    console.log(`  ✅ Logged in`);

    // Get characters
    const charResp = await fetch(`${API_URL}/characters`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!charResp.ok) {
      console.log(`  ❌ Failed to fetch characters: ${charResp.status}`);
      continue;
    }

    const characters = await charResp.json();
    console.log(`  Found ${characters.length} character(s):`);
    for (const char of characters) {
      console.log(`    - ${char.name} (ID: ${char.id})`);
      console.log(`      Skills: ${char.skills?.length || 0}, Edges: ${char.edges?.length || 0}, Equipment: ${char.equipment?.length || 0}`);
      console.log(`      PP: ${char.currentPowerPoints}/${char.maxPowerPoints}, Fate Chips: ${char.fateChips}`);
    }
  }
}

verify().catch(console.error);
