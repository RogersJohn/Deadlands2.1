#!/usr/bin/env node

/**
 * Reset gamemaster password to Test123!
 *
 * This script uses bcrypt to generate the same password hash format
 * as the application, then provides SQL to update the database.
 */

const bcrypt = require('bcryptjs');

const newPassword = 'Test123!';
const saltRounds = 10;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║           Reset Gamemaster Password                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`New password will be: ${newPassword}\n`);
console.log('Generating BCrypt hash...\n');

bcrypt.hash(newPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }

  console.log('✓ Password hash generated\n');
  console.log('Execute this SQL in Railway production database:\n');
  console.log('─'.repeat(70));
  console.log(`UPDATE users`);
  console.log(`SET password = '${hash}'`);
  console.log(`WHERE username = 'gamemaster';`);
  console.log();
  console.log(`SELECT id, username, email, role, active`);
  console.log(`FROM users WHERE username = 'gamemaster';`);
  console.log('─'.repeat(70));
  console.log('\nAfter running this SQL, you can login with:');
  console.log(`  Username: gamemaster`);
  console.log(`  Password: ${newPassword}`);
  console.log('\nYour old sessions (Sess1, Sess1, Sess3) will be accessible!');
});
