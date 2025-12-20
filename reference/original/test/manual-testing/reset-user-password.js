/**
 * Reset user password to Test123!
 * Uses bcrypt to hash the password properly
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:wCwfSYwLvDslGeepWAiPYvxbEmEtzIhN@switchyard.proxy.rlwy.net:15935/railway';

async function resetPassword(username) {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log(`Looking up user: ${username}...\n`);

    // Check if user exists
    const userResult = await client.query(
      'SELECT id, username, role, password FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      console.log(`User "${username}" not found.`);

      // List all users
      console.log('\nAll users in database:');
      const allUsers = await client.query('SELECT username, role FROM users ORDER BY username');
      allUsers.rows.forEach(r => console.log(`  - ${r.username} (${r.role})`));
      return;
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.username} (${user.role})`);
    console.log(`Current password hash: ${user.password.substring(0, 20)}...`);

    // Generate new password hash
    const newPassword = 'Test123!';
    const saltRounds = 10;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    console.log(`\nNew password hash: ${newHash.substring(0, 20)}...`);

    // Update password
    await client.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [newHash, user.id]
    );

    console.log(`\n✅ Password reset successfully!`);
    console.log(`\nLogin details:`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${newPassword}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

const username = process.argv[2] || 'JCKullman';
resetPassword(username);
