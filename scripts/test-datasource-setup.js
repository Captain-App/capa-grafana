#!/usr/bin/env node

/**
 * Test script to verify data source setup locally
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GRAFANA_URL=... GRAFANA_API_KEY=... node scripts/test-datasource-setup.js
 */

const { execSync } = require('child_process');

console.log('Testing data source setup...\n');

// Check environment variables
const required = ['GRAFANA_URL', 'GRAFANA_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`✗ Missing environment variables: ${missing.join(', ')}`);
  console.error('\nSet them like:');
  console.error('  export GRAFANA_URL=https://your-instance.grafana.net');
  console.error('  export GRAFANA_API_KEY=your-key');
  console.error('  export SUPABASE_URL=https://app.captainapp.co.uk');
  console.error('  export SUPABASE_SERVICE_ROLE_KEY=your-key');
  process.exit(1);
}

console.log('✓ All required environment variables are set\n');

// Run the setup script
try {
  console.log('Running setup script...\n');
  execSync('node scripts/setup-grafana-datasource.js', {
    stdio: 'inherit',
    env: process.env
  });
  console.log('\n✓ Test completed successfully!');
} catch (error) {
  console.error('\n✗ Test failed');
  process.exit(1);
}

