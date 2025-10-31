#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dashboardsDir = path.join(__dirname, '..', 'dashboards');

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function deployDashboard(filePath, grafanaUrl, apiKey) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const dashboardData = JSON.parse(content);
    
    // Ensure dashboard has required fields
    const dashboardName = path.basename(filePath, '.json');
    if (!dashboardData.dashboard.uid) {
      dashboardData.dashboard.uid = dashboardName;
    }
    if (!dashboardData.dashboard.title) {
      dashboardData.dashboard.title = dashboardName;
    }
    
    // Ensure overwrite is set
    dashboardData.overwrite = true;
    if (!dashboardData.message) {
      dashboardData.message = 'Deployed via GitHub Actions';
    }
    
    const url = `${grafanaUrl}/api/dashboards/db`;
    const payload = JSON.stringify(dashboardData);
    
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log(`✓ Successfully deployed: ${dashboardName}`);
      return true;
    } else {
      console.error(`✗ Failed to deploy: ${dashboardName}`);
      console.error(`HTTP Code: ${response.statusCode}`);
      console.error(`Response: ${response.body}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error deploying ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

async function main() {
  const grafanaUrl = process.env.GRAFANA_URL;
  const apiKey = process.env.GRAFANA_API_KEY;
  
  if (!grafanaUrl || !apiKey) {
    console.error('Error: GRAFANA_URL and GRAFANA_API_KEY environment variables must be set');
    process.exit(1);
  }
  
  if (!fs.existsSync(dashboardsDir)) {
    console.log('Dashboards directory does not exist');
    process.exit(0);
  }
  
  const files = fs.readdirSync(dashboardsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(dashboardsDir, file));
  
  if (files.length === 0) {
    console.log('No dashboard files found');
    process.exit(0);
  }
  
  console.log(`Found ${files.length} dashboard(s) to deploy\n`);
  
  const results = await Promise.all(
    files.map(file => deployDashboard(file, grafanaUrl, apiKey))
  );
  
  const allSuccessful = results.every(result => result === true);
  
  if (!allSuccessful) {
    process.exit(1);
  }
  
  console.log('\n✓ All dashboards deployed successfully');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

