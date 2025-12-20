/**
 * Stress Test: Concurrent Users
 *
 * Tests system performance with many concurrent users.
 * - 50 players join same session
 * - Each player sends 100 token movements
 * - Measures response times, throughput, and memory usage
 *
 * Run: node test/stress/concurrent-users.js
 */

const WebSocket = require('ws');
const axios = require('axios');

// Configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:8080',
  WS_URL: process.env.WS_URL || 'ws://localhost:8080/ws',
  NUM_PLAYERS: 50,
  MOVES_PER_PLAYER: 100,
  TIMEOUT_MS: 60000, // 1 minute timeout
};

const stats = {
  connectionsSucceeded: 0,
  connectionsFailed: 0,
  messagesSent: 0,
  messagesReceived: 0,
  totalLatency: 0,
  minLatency: Infinity,
  maxLatency: 0,
  errors: [],
};

// Test data
let testSessionId;
let testCharacterIds = [];
let testTokens = [];

/**
 * Setup: Create test session and characters
 */
async function setup() {
  console.log('🔧 Setting up test environment...\n');

  try {
    // 1. Login as GM
    console.log('1. Logging in as GM...');
    const gmLogin = await axios.post(`${CONFIG.API_URL}/auth/login`, {
      username: 'testgm',
      password: 'testpassword',
    });
    const gmToken = gmLogin.data.token;
    console.log('✅ GM logged in');

    // 2. Create test session
    console.log('2. Creating test session...');
    const session = await axios.post(
      `${CONFIG.API_URL}/sessions`,
      {
        name: `Stress Test Session ${Date.now()}`,
        description: 'Automated stress test',
        maxPlayers: CONFIG.NUM_PLAYERS,
      },
      { headers: { Authorization: `Bearer ${gmToken}` } }
    );
    testSessionId = session.data.id;
    console.log(`✅ Session created: ID ${testSessionId}`);

    // 3. Create test players and characters
    console.log(`3. Creating ${CONFIG.NUM_PLAYERS} test players...`);
    for (let i = 0; i < CONFIG.NUM_PLAYERS; i++) {
      // Register player
      const playerReg = await axios.post(`${CONFIG.API_URL}/auth/register`, {
        username: `stresstest_player_${i}_${Date.now()}`,
        email: `stresstest${i}@test.com`,
        password: 'testpassword',
      });
      const playerToken = playerReg.data.token;

      // Create character
      const character = await axios.post(
        `${CONFIG.API_URL}/characters`,
        {
          name: `Stress Test Character ${i}`,
          agilityDie: 'd8',
          smartsDie: 'd6',
          spiritDie: 'd6',
          strengthDie: 'd6',
          vigorDie: 'd6',
          parry: 5,
          toughness: 5,
          pace: 6,
        },
        { headers: { Authorization: `Bearer ${playerToken}` } }
      );

      testCharacterIds.push(character.data.id);
      testTokens.push({
        playerId: i,
        token: playerToken,
        characterId: character.data.id,
      });

      if ((i + 1) % 10 === 0) {
        console.log(`   Created ${i + 1}/${CONFIG.NUM_PLAYERS} players`);
      }
    }
    console.log(`✅ Created ${CONFIG.NUM_PLAYERS} players and characters\n`);

    // 4. Join session
    console.log('4. Joining session with all players...');
    for (let i = 0; i < testTokens.length; i++) {
      const { token, characterId } = testTokens[i];
      await axios.post(
        `${CONFIG.API_URL}/sessions/${testSessionId}/join`,
        { characterId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if ((i + 1) % 10 === 0) {
        console.log(`   Joined ${i + 1}/${CONFIG.NUM_PLAYERS} players`);
      }
    }
    console.log(`✅ All players joined session\n`);

    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    return false;
  }
}

/**
 * Create WebSocket connection for a player
 */
function createPlayerConnection(playerIndex, token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${CONFIG.WS_URL}?token=${token}`);
    const player = {
      index: playerIndex,
      ws,
      messagesReceived: 0,
      messagesSent: 0,
      latencies: [],
    };

    ws.on('open', () => {
      stats.connectionsSucceeded++;
      console.log(`   Player ${playerIndex} connected`);

      // Send connect message
      ws.send(
        JSON.stringify({
          destination: `/app/session/${testSessionId}/connect`,
          body: {},
        })
      );

      resolve(player);
    });

    ws.on('message', (data) => {
      player.messagesReceived++;
      stats.messagesReceived++;

      const message = JSON.parse(data);
      if (message.destination === `/topic/session/${testSessionId}/token-moved`) {
        const sentTime = message.body.timestamp;
        const latency = Date.now() - sentTime;

        player.latencies.push(latency);
        stats.totalLatency += latency;
        stats.minLatency = Math.min(stats.minLatency, latency);
        stats.maxLatency = Math.max(stats.maxLatency, latency);
      }
    });

    ws.on('error', (error) => {
      stats.connectionsFailed++;
      stats.errors.push(`Player ${playerIndex}: ${error.message}`);
      reject(error);
    });

    ws.on('close', () => {
      console.log(`   Player ${playerIndex} disconnected`);
    });

    // Timeout if connection takes too long
    setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error(`Connection timeout for player ${playerIndex}`));
      }
    }, 10000);
  });
}

/**
 * Send token movements from a player
 */
async function sendMovements(player, numMoves) {
  const { ws, index } = player;
  const characterId = testCharacterIds[index];

  for (let i = 0; i < numMoves; i++) {
    // Generate random movement within grid
    const toX = Math.floor(Math.random() * 200);
    const toY = Math.floor(Math.random() * 200);

    const moveMessage = {
      destination: `/app/session/${testSessionId}/move-token`,
      body: {
        tokenId: String(characterId),
        tokenType: 'PLAYER',
        fromX: null,
        fromY: null,
        toX,
        toY,
      },
    };

    ws.send(JSON.stringify(moveMessage));
    player.messagesSent++;
    stats.messagesSent++;

    // Small delay between moves to avoid overwhelming server
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

/**
 * Main stress test
 */
async function runStressTest() {
  console.log('🚀 Starting Concurrent Users Stress Test\n');
  console.log('Configuration:');
  console.log(`  Players: ${CONFIG.NUM_PLAYERS}`);
  console.log(`  Moves per player: ${CONFIG.MOVES_PER_PLAYER}`);
  console.log(`  Total moves: ${CONFIG.NUM_PLAYERS * CONFIG.MOVES_PER_PLAYER}`);
  console.log(`  Timeout: ${CONFIG.TIMEOUT_MS}ms\n`);

  const startTime = Date.now();

  try {
    // 1. Setup
    const setupSuccess = await setup();
    if (!setupSuccess) {
      throw new Error('Setup failed');
    }

    // 2. Connect all players
    console.log('📡 Connecting all players via WebSocket...');
    const connections = [];
    for (let i = 0; i < CONFIG.NUM_PLAYERS; i++) {
      const { token } = testTokens[i];
      try {
        const player = await createPlayerConnection(i, token);
        connections.push(player);
      } catch (error) {
        console.error(`❌ Failed to connect player ${i}:`, error.message);
      }

      if ((i + 1) % 10 === 0) {
        console.log(`   Connected ${i + 1}/${CONFIG.NUM_PLAYERS} players`);
      }
    }
    console.log(`✅ ${connections.length} players connected\n`);

    // Give time for all connections to stabilize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Send movements concurrently
    console.log('🎮 Sending token movements...');
    const movementPromises = connections.map((player) =>
      sendMovements(player, CONFIG.MOVES_PER_PLAYER)
    );
    await Promise.all(movementPromises);
    console.log('✅ All movements sent\n');

    // 4. Wait for messages to be received
    console.log('⏳ Waiting for message propagation...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 5. Close all connections
    console.log('🔌 Closing connections...');
    connections.forEach((player) => {
      player.ws.close();
    });

    // 6. Calculate results
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`\n⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`\n📡 Connections:`);
    console.log(`   Succeeded: ${stats.connectionsSucceeded}`);
    console.log(`   Failed: ${stats.connectionsFailed}`);
    console.log(`\n📨 Messages:`);
    console.log(`   Sent: ${stats.messagesSent}`);
    console.log(`   Received: ${stats.messagesReceived}`);
    console.log(
      `   Reception Rate: ${((stats.messagesReceived / stats.messagesSent) * 100).toFixed(2)}%`
    );
    console.log(`\n⚡ Latency:`);
    console.log(`   Min: ${stats.minLatency}ms`);
    console.log(`   Max: ${stats.maxLatency}ms`);
    console.log(
      `   Avg: ${(stats.totalLatency / stats.messagesReceived).toFixed(2)}ms`
    );
    console.log(`\n🔄 Throughput:`);
    console.log(
      `   Messages/sec: ${(stats.messagesSent / duration).toFixed(2)}`
    );

    if (stats.errors.length > 0) {
      console.log(`\n❌ Errors (${stats.errors.length}):`);
      stats.errors.slice(0, 10).forEach((err) => console.log(`   ${err}`));
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more`);
      }
    }

    console.log('\n' + '='.repeat(60));

    // 7. Determine pass/fail
    const passThresholds = {
      connectionSuccessRate: 0.95, // 95% of connections succeed
      messageReceptionRate: 0.9, // 90% of messages received
      avgLatency: 100, // Average latency < 100ms
    };

    const connectionSuccessRate =
      stats.connectionsSucceeded / CONFIG.NUM_PLAYERS;
    const messageReceptionRate = stats.messagesReceived / stats.messagesSent;
    const avgLatency = stats.totalLatency / stats.messagesReceived;

    const passed =
      connectionSuccessRate >= passThresholds.connectionSuccessRate &&
      messageReceptionRate >= passThresholds.messageReceptionRate &&
      avgLatency <= passThresholds.avgLatency;

    if (passed) {
      console.log('\n✅ STRESS TEST PASSED');
    } else {
      console.log('\n❌ STRESS TEST FAILED');
      console.log('\nThresholds:');
      console.log(
        `   Connection Success Rate: ${(connectionSuccessRate * 100).toFixed(2)}% (required: ${passThresholds.connectionSuccessRate * 100}%)`
      );
      console.log(
        `   Message Reception Rate: ${(messageReceptionRate * 100).toFixed(2)}% (required: ${passThresholds.messageReceptionRate * 100}%)`
      );
      console.log(
        `   Avg Latency: ${avgLatency.toFixed(2)}ms (required: < ${passThresholds.avgLatency}ms)`
      );
    }

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Stress test failed:', error);
    process.exit(1);
  }
}

// Run the test
runStressTest();
