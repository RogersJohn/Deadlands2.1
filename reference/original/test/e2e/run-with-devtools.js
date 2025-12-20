#!/usr/bin/env node

/**
 * E2E Test Runner with Chrome DevTools
 *
 * This script runs Cucumber E2E tests with:
 * - Chrome browser in visible (non-headless) mode
 * - DevTools automatically opened
 * - Network tab activated for request/response inspection
 * - Console tab for backend log messages
 * - Slow-motion mode for step-by-step debugging
 *
 * Usage:
 *   node run-with-devtools.js                 # Run all tests
 *   node run-with-devtools.js --tags @api     # Run only API tests
 *   node run-with-devtools.js --slow          # Run in slow motion
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const slowMode = args.includes('--slow');
const tags = args.find(arg => arg.startsWith('--tags'))?.split('=')[1] || args[args.indexOf('--tags') + 1];

// Configuration
const config = {
  headless: false,  // Always visible for debugging
  devtools: true,   // Auto-open DevTools
  slowMo: slowMode ? 500 : 0,  // Slow down actions for visibility
  args: [
    '--auto-open-devtools-for-tabs',  // Open DevTools automatically
    '--start-maximized',              // Maximize window
    '--disable-blink-features=AutomationControlled',  // Hide automation detection
  ]
};

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   Deadlands E2E Tests - Chrome DevTools Debug Mode          ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Configuration:');
console.log(`  • Browser: Chrome (visible mode)`);
console.log(`  • DevTools: Auto-open`);
console.log(`  • Slow Motion: ${slowMode ? 'ENABLED (500ms delay)' : 'disabled'}`);
console.log(`  • Tags: ${tags || 'all tests'}`);
console.log('');
console.log('DevTools Tips:');
console.log('  1. Network Tab: Monitor API requests/responses');
console.log('  2. Console Tab: View browser console logs');
console.log('  3. Application Tab: Inspect LocalStorage/SessionStorage');
console.log('  4. Preserve log: Check "Preserve log" to keep requests across pages');
console.log('');
console.log('Backend Logs:');
console.log('  • Run "railway logs" in another terminal to see server logs');
console.log('  • Look for "JWT FILTER DEBUG" messages');
console.log('  • Check for "SESSION FIX - Corrected Pattern Matching"');
console.log('');
console.log('Starting tests...');
console.log('════════════════════════════════════════════════════════════════');
console.log('');

// Set environment variables for Selenium WebDriver
process.env.HEADLESS = 'false';
process.env.DEVTOOLS = 'true';
process.env.SLOW_MO = slowMode ? '500' : '0';

// Build cucumber command
const cucumberArgs = ['node_modules/@cucumber/cucumber/bin/cucumber.js'];

if (tags) {
  cucumberArgs.push('--tags', tags);
}

// Add format options
cucumberArgs.push(
  '--format', 'progress',
  '--format', 'json:test-results.json'
);

// Run cucumber
const cucumber = spawn('node', cucumberArgs, {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  env: { ...process.env }
});

cucumber.on('close', (code) => {
  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`Tests completed with exit code: ${code}`);
  console.log('');

  if (code === 0) {
    console.log('✅ All tests passed!');
  } else {
    console.log('❌ Some tests failed. Check the output above.');
    console.log('');
    console.log('Debugging Tips:');
    console.log('  • Check Chrome DevTools Network tab for failed requests');
    console.log('  • Look for red (4xx/5xx) status codes');
    console.log('  • Click on failed requests to see request/response details');
    console.log('  • Check backend logs: railway logs --service deadlands-campaign-manager');
    console.log('  • Look for "JWT FILTER DEBUG" output in server logs');
  }

  console.log('');
  process.exit(code);
});

cucumber.on('error', (error) => {
  console.error('Failed to start test runner:', error);
  process.exit(1);
});
