// Quick script to verify Replicate API key format
const key = process.env.REPLICATE_API_KEY || '';

console.log('=== REPLICATE API KEY CHECK ===');
console.log('Key exists:', key ? 'YES' : 'NO');
console.log('Key length:', key.length);
console.log('Key starts with r8_:', key.startsWith('r8_'));
console.log('First 10 chars:', key ? key.substring(0, 10) + '...' : 'N/A');

if (!key) {
  console.error('❌ No API key found!');
  process.exit(1);
}

if (!key.startsWith('r8_')) {
  console.error('❌ API key does not start with r8_ - might be invalid!');
  process.exit(1);
}

if (key.length < 30) {
  console.error('❌ API key too short - might be incomplete!');
  process.exit(1);
}

console.log('✅ API key format looks valid!');
