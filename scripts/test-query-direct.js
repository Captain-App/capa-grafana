#!/usr/bin/env node

/**
 * Test querying the metrics endpoint directly through Grafana's proxy
 * to see the exact error
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

  console.log('Testing different query approaches...\n');

  // Get data source
  const getUrl = `${grafanaUrl}/api/datasources/uid/supabase-metrics`;
  const getResponse = await makeRequest(getUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const ds = JSON.parse(getResponse.body);
  console.log(`Data source ID: ${ds.id}`);
  console.log(`URL: ${ds.url}\n`);

  // Test 1: Simple query through proxy
  console.log('Test 1: Query through Grafana proxy (api/v1/query)...');
  const queryUrl1 = `${grafanaUrl}/api/datasources/proxy/${ds.id}/api/v1/query?query=up`;
  const resp1 = await makeRequest(queryUrl1, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json'
    }
  });
  console.log(`Status: ${resp1.statusCode}`);
  console.log(`Response: ${resp1.body.substring(0, 500)}\n`);

  // Test 2: Try the metrics endpoint directly through proxy
  console.log('Test 2: Direct metrics endpoint through proxy...');
  const metricsUrl = `${grafanaUrl}/api/datasources/proxy/${ds.id}`;
  const resp2 = await makeRequest(metricsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Accept': 'text/plain'
    }
  });
  console.log(`Status: ${resp2.statusCode}`);
  console.log(`Response (first 500 chars): ${resp2.body.substring(0, 500)}\n`);

  // Test 3: Check if we can use the datasource UID instead
  console.log('Test 3: Using datasource UID in proxy path...');
  const queryUrl3 = `${grafanaUrl}/api/datasources/proxy/uid/${ds.uid}/api/v1/query?query=up`;
  const resp3 = await makeRequest(queryUrl3, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json'
    }
  });
  console.log(`Status: ${resp3.statusCode}`);
  console.log(`Response: ${resp3.body.substring(0, 500)}\n`);

  // Test 4: Try with POST method (since jsonData says httpMethod: POST)
  console.log('Test 4: Using POST method (as configured)...');
  const queryUrl4 = `${grafanaUrl}/api/datasources/proxy/${ds.id}/api/v1/query`;
  const postData = JSON.stringify({ query: 'up' });
  const resp4 = await makeRequest(queryUrl4, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);
  console.log(`Status: ${resp4.statusCode}`);
  console.log(`Response: ${resp4.body.substring(0, 500)}\n`);

  // Test 5: Direct Supabase call to verify credentials work
  console.log('Test 5: Direct Supabase call (should work)...');
  const auth = Buffer.from(`service_role:${supabaseServiceRoleKey}`).toString('base64');
  const directUrl = ds.url;
  const resp5 = await makeRequest(directUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'text/plain'
    }
  });
  console.log(`Status: ${resp5.statusCode}`);
  if (resp5.statusCode === 200) {
    console.log(`✓ Direct call works! Got ${resp5.body.split('\\n').filter(l => l && !l.startsWith('#')).length} metrics`);
  } else {
    console.log(`✗ Direct call failed: ${resp5.body.substring(0, 200)}`);
  }
}

main().catch(console.error);

