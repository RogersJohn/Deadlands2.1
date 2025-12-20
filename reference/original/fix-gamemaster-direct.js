#!/usr/bin/env node

/**
 * Directly update gamemaster password in Railway database
 * Uses Railway environment variables to connect
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function fixGamemasterPassword() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         Fix Gamemaster Password in Database                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Get database URL from Railway environment
  const dbUrl = process.env.DATABASE_URL || process.env.SPRING_DATASOURCE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.log('\nSet it with:');
    console.log('  DATABASE_URL="postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway" node fix-gamemaster-direct.js');
    process.exit(1);
  }

  // Parse JDBC URL if needed
  let connectionString = dbUrl;
  if (dbUrl.startsWith('jdbc:postgresql://')) {
    connectionString = dbUrl.replace('jdbc:postgresql://', 'postgresql://');
  }

  console.log('Connecting to database...\n');

  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Generate new password hash
    const newPassword = 'Test123!';
    const hash = await bcrypt.hash(newPassword, 10);
    console.log(`Generated BCrypt hash for password: ${newPassword}\n`);

    // Update gamemaster password
    console.log('Updating gamemaster password...');
    const updateResult = await client.query(
      `UPDATE users
       SET password = $1,
           active = true,
           role = 'GAME_MASTER',
           updated_at = NOW()
       WHERE username = 'gamemaster'`,
      [hash]
    );

    console.log(`✓ Updated ${updateResult.rowCount} row(s)\n`);

    // Verify the update
    console.log('Verifying gamemaster account...');
    const verifyResult = await client.query(
      `SELECT id, username, email, role, active, created_at
       FROM users
       WHERE username = 'gamemaster'`
    );

    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log('\n✓ Gamemaster Account Details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.active}`);
      console.log(`  Created: ${user.created_at}`);
    } else {
      console.log('\n❌ Gamemaster account not found in database');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    SUCCESS!                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log('Gamemaster password has been reset to: Test123!');
  console.log('\nYou can now login at:');
  console.log('  URL: https://deadlands-frontend-production.up.railway.app');
  console.log('  Username: gamemaster');
  console.log('  Password: Test123!');
  console.log('\nYour old sessions (Sess1, Sess1, Sess3) should be accessible!\n');
}

fixGamemasterPassword().catch(console.error);
