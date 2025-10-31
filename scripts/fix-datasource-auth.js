#!/usr/bin/env node

/**
 * Script to fix Basic Auth password for existing Supabase data source
 * This ensures the password is properly saved in Grafana
 */

const https = require('https');
const http = require('http');

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

async function fixDataSource() {
  const grafanaUrl = process.env.GRAFANA_URL;
  const grafanaApiKey = process.env.GRAFANA_API_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!grafanaUrl || !grafanaApiKey || !supabaseServiceRoleKey) {
    console.error('Error: GRAFANA_URL, GRAFANA_API_KEY, and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  // Get existing data source
  const getUrl = `${grafanaUrl}/api/datasources/uid/supabase-metrics`;
  const getResponse = await makeRequest(getUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (getResponse.statusCode !== 200) {
    console.error(`Failed to get data source: ${getResponse.statusCode} - ${getResponse.body}`);
    process.exit(1);
  }

  const existing = JSON.parse(getResponse.body);
  console.log(`Found data source: ${existing.name} (ID: ${existing.id})`);

  // Update with secureJsonData to set the password
  const updatePayload = {
    ...existing,
    secureJsonData: {
      basicAuthPassword: supabaseServiceRoleKey
    }
  };

  const updateUrl = `${grafanaUrl}/api/datasources/${existing.id}`;
  const updateResponse = await makeRequest(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(updatePayload))
    }
  }, JSON.stringify(updatePayload));

  if (updateResponse.statusCode === 200) {
    console.log('✓ Successfully updated data source with Basic Auth password');
    console.log('  Password has been securely saved in Grafana');
    console.log('\n  Test the data source in Grafana UI to verify it works');
  } else {
    console.error(`Failed to update: ${updateResponse.statusCode} - ${updateResponse.body}`);
    process.exit(1);
  }
}

fixDataSource().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

