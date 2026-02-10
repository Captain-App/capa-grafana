#!/usr/bin/env node

/**
 * Deep debugging - check what Grafana actually stored
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

async function main() {
  const grafanaUrl = process.env.GRAFANA_URL;
  const grafanaApiKey = process.env.GRAFANA_API_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 Deep Debugging\n');

  // Get current data source
  const getUrl = `${grafanaUrl}/api/datasources/uid/supabase-metrics`;
  const getResponse = await makeRequest(getUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const ds = JSON.parse(getResponse.body);
  console.log('Current data source config:');
  console.log(JSON.stringify(ds, null, 2));
  console.log('\n');

  // Try updating with explicit UID
  console.log('Updating with explicit UID and all fields...');
  const updatePayload = {
    id: ds.id,
    version: ds.version,
    uid: 'supabase-metrics',
    name: 'Supabase Metrics',
    type: 'prometheus',
    access: 'proxy',
    url: ds.url,
    isDefault: false,
    basicAuth: true,
    basicAuthUser: 'service_role',
    jsonData: ds.jsonData || {},
    secureJsonData: {
      basicAuthPassword: supabaseServiceRoleKey
    }
  };

  const updateUrl = `${grafanaUrl}/api/datasources/${ds.id}`;
  const updateResponse = await makeRequest(updateUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(updatePayload))
    }
  }, JSON.stringify(updatePayload));

  console.log(`Update response: ${updateResponse.statusCode}`);
  if (updateResponse.statusCode === 200) {
    const result = JSON.parse(updateResponse.body);
    console.log('Updated data source:');
    console.log(JSON.stringify(result, null, 2));
    
    // Wait a moment for Grafana to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test query
    console.log('\nTesting query...');
    const queryUrl = `${grafanaUrl}/api/datasources/proxy/${ds.id}/api/v1/query?query=up`;
    const queryResponse = await makeRequest(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${grafanaApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Query status: ${queryResponse.statusCode}`);
    console.log(`Query response: ${queryResponse.body.substring(0, 500)}`);
  } else {
    console.log(`Failed: ${updateResponse.body}`);
  }
}

main().catch(console.error);

