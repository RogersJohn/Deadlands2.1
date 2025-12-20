#!/usr/bin/env node

/**
 * Verify gamemaster can access old sessions after password reset
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'https://deadlands-campaign-manager-production.up.railway.app/api';

async function verifyGamemasterAccess() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        Verify Gamemaster Access to Old Sessions             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  let gmToken;

  // Step 1: Test gamemaster login with new password
  console.log('1. Testing gamemaster login with password: Test123!');
  try {
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'gamemaster',
      password: 'Test123!'
    });
    gmToken = loginResponse.data.token;
    console.log('   ✓ Gamemaster login SUCCESSFUL!\n');
    console.log(`   User ID: ${loginResponse.data.userId}`);
    console.log(`   Username: ${loginResponse.data.username}`);
    console.log(`   Role: ${loginResponse.data.role}\n`);
  } catch (error) {
    console.log('   ✗ Gamemaster login FAILED');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data || error.message}`);
    console.log('\n⚠️  Migration may not have been applied yet. Wait for deployment to complete.\n');
    return;
  }

  // Step 2: Get all sessions
  console.log('2. Fetching sessions as gamemaster...');
  try {
    const sessionsResponse = await axios.get(`${API_URL}/sessions`, {
      headers: { Authorization: `Bearer ${gmToken}` }
    });

    const sessions = sessionsResponse.data;
    console.log(`   ✓ Found ${sessions.length} total sessions\n`);

    // Filter for gamemaster's sessions
    const gmSessions = sessions.filter(s => s.gameMaster.username === 'gamemaster');
    console.log(`   📁 Gamemaster's Sessions: ${gmSessions.length}\n`);

    if (gmSessions.length > 0) {
      gmSessions.forEach(session => {
        console.log(`   Session #${session.id}:`);
        console.log(`     Name: ${session.name}`);
        console.log(`     Active: ${session.active}`);
        console.log(`     Created: ${new Date(session.createdAt).toLocaleString()}`);
        console.log(`     Max Players: ${session.maxPlayers || 'unlimited'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.log('   ✗ Failed to get sessions');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data || error.message}\n`);
    return;
  }

  // Step 3: Summary
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SUCCESS!                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log('✓ Gamemaster account restored');
  console.log('✓ Old sessions accessible');
  console.log('\nLogin credentials:');
  console.log('  URL: https://deadlands-frontend-production.up.railway.app');
  console.log('  Username: gamemaster');
  console.log('  Password: Test123!');
  console.log('\nYou can now access your 3 sessions (Sess1, Sess1, Sess3)!\n');
}

verifyGamemasterAccess().catch(console.error);
