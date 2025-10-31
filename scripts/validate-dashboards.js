#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dashboardsDir = path.join(__dirname, '..', 'dashboards');

function validateDashboard(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const dashboard = JSON.parse(content);
    
    // Check required fields
    if (!dashboard.dashboard) {
      throw new Error('Missing "dashboard" field');
    }
    
    if (!dashboard.dashboard.uid) {
      throw new Error('Missing "dashboard.uid" field');
    }
    
    if (!dashboard.dashboard.title) {
      throw new Error('Missing "dashboard.title" field');
    }
    
    console.log(`✓ Valid: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`✗ Invalid: ${path.basename(filePath)} - ${error.message}`);
    return false;
  }
}

function main() {
  const files = fs.readdirSync(dashboardsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dashboardsDir, file));
  
  if (files.length === 0) {
    console.log('No dashboard files found');
    return;
  }
  
  const results = files.map(validateDashboard);
  const allValid = results.every(result => result === true);
  
  process.exit(allValid ? 0 : 1);
}

main();

