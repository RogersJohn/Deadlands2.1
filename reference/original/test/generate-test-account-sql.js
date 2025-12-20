const bcrypt = require('bcryptjs');

const accounts = [
  { username: 'e2e_testgm', email: 'e2e_testgm@test.com', password: 'Test123!', role: 'GAME_MASTER' },
  { username: 'e2e_player1', email: 'e2e_player1@test.com', password: 'Test123!', role: 'PLAYER' },
  { username: 'e2e_player2', email: 'e2e_player2@test.com', password: 'Test123!', role: 'PLAYER' }
];

async function generateSQL() {
  console.log('-- E2E Test Account Setup SQL');
  console.log('-- Generated:', new Date().toISOString());
  console.log('');
  console.log('-- Delete existing test accounts if they exist');
  console.log("DELETE FROM users WHERE username IN ('e2e_testgm', 'e2e_player1', 'e2e_player2');");
  console.log('');
  console.log('-- Create test accounts');

  for (const account of accounts) {
    const hashedPassword = await bcrypt.hash(account.password, 10);

    const sql = `INSERT INTO users (username, email, password, role, active, created_at, updated_at)
VALUES ('${account.username}', '${account.email}', '${hashedPassword}', '${account.role}', true, NOW(), NOW());`;

    console.log(sql);
  }

  console.log('');
  console.log('-- Verify accounts created');
  console.log("SELECT id, username, email, role, active FROM users WHERE username IN ('e2e_testgm', 'e2e_player1', 'e2e_player2');");
}

generateSQL().catch(console.error);
