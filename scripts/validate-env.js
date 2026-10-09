const fs = require('fs');
const path = require('path');

const required = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const envValues = { ...process.env };

for (const candidate of ['.env.local', '.env']) {
  const envPath = path.resolve(process.cwd(), candidate);
  if (!fs.existsSync(envPath)) continue;

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    envValues[key] = value;
  }
}

const missing = required.filter((key) => !envValues[key]?.trim());

if (missing.length > 0) {
  console.error('Missing required environment variables: ' + missing.join(', '));
  console.error('Create a .env.local file using the example in .env.example and add your Supabase values.');
  process.exit(1);
}

console.log('Environment appears configured for Supabase auth.');
