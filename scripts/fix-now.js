#!/usr/bin/env node

/**
 * Comprehensive fix script - will diagnose and fix the 401 error
 * Run with: GRAFANA_URL=... GRAFANA_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-now.js
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
  const supabaseUrl = process.env.SUPABASE_URL || 'https://app.captainapp.co.uk';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔧 Fixing Supabase Data Source Authentication\n');
  console.log('='.repeat(60));

  // Validate inputs
  if (!grafanaUrl || !grafanaApiKey || !supabaseServiceRoleKey) {
    console.error('\n✗ Missing required environment variables:');
    console.error('   GRAFANA_URL:', grafanaUrl ? '✓' : '✗');
    console.error('   GRAFANA_API_KEY:', grafanaApiKey ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✓' : '✗');
    console.error('\nUsage:');
    console.error('  export GRAFANA_URL=https://your-instance.grafana.net');
    console.error('  export GRAFANA_API_KEY=your-key');
    console.error('  export SUPABASE_SERVICE_ROLE_KEY=your-key');
    console.error('  node scripts/fix-now.js');
    process.exit(1);
  }

  // Determine metrics URL
  let metricsUrl;
  if (supabaseUrl.includes('supabase.co')) {
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      metricsUrl = `https://${match[1]}.supabase.co/customer/v1/privileged/metrics`;
    } else {
      metricsUrl = `${supabaseUrl}/customer/v1/privileged/metrics`;
    }
  } else {
    metricsUrl = `${supabaseUrl}/customer/v1/privileged/metrics`;
  }

  console.log(`\n📋 Configuration:`);
  console.log(`   Grafana URL: ${grafanaUrl}`);
  console.log(`   Metrics URL: ${metricsUrl}`);
  console.log(`   Basic Auth User: service_role`);

  // Step 1: Test Supabase endpoint
  console.log(`\n1️⃣  Testing Supabase metrics endpoint...`);
  try {
    const auth = Buffer.from(`service_role:${supabaseServiceRoleKey}`).toString('base64');
    const testResponse = await makeRequest(metricsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'text/plain'
      }
    });

    if (testResponse.statusCode === 200) {
      console.log(`   ✓ Endpoint is accessible`);
    } else {
      console.log(`   ✗ Endpoint returned HTTP ${testResponse.statusCode}`);
      console.log(`   Response: ${testResponse.body.substring(0, 200)}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    process.exit(1);
  }

  // Step 2: Get existing data source
  console.log(`\n2️⃣  Getting existing data source...`);
  let existing;
  try {
    const getUrl = `${grafanaUrl}/api/datasources/uid/supabase-metrics`;
    const getResponse = await makeRequest(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${grafanaApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (getResponse.statusCode === 200) {
      existing = JSON.parse(getResponse.body);
      console.log(`   ✓ Found: ${existing.name} (ID: ${existing.id})`);
      console.log(`   Current URL: ${existing.url}`);
      console.log(`   Basic Auth: ${existing.basicAuth || false}`);
      console.log(`   Basic Auth User: ${existing.basicAuthUser || 'NOT SET'}`);
    } else if (getResponse.statusCode === 404) {
      console.log(`   ⚠ Data source not found, will create new one`);
      existing = null;
    } else {
      console.log(`   ✗ Failed to get data source: ${getResponse.statusCode}`);
      console.log(`   Response: ${getResponse.body}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    process.exit(1);
  }

  // Step 3: Update/Create data source with proper password
  console.log(`\n3️⃣  ${existing ? 'Updating' : 'Creating'} data source with password...`);
  
  const payloadData = {
    name: 'Supabase Metrics',
    type: 'prometheus',
    access: 'proxy',
    url: metricsUrl,
    isDefault: false,
    basicAuth: true,
    basicAuthUser: 'service_role',
    jsonData: {
      httpMethod: 'POST',
      queryTimeout: '60s',
      timeInterval: '30s'
    },
    secureJsonData: {
      basicAuthPassword: supabaseServiceRoleKey
    }
  };

  if (existing) {
    payloadData.id = existing.id;
    payloadData.version = existing.version;
    payloadData.uid = existing.uid || 'supabase-metrics';
  } else {
    payloadData.uid = 'supabase-metrics';
  }

  const url = existing
    ? `${grafanaUrl}/api/datasources/${existing.id}`
    : `${grafanaUrl}/api/datasources`;
  
  const method = existing ? 'PUT' : 'POST';

  try {
    const updateResponse = await makeRequest(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${grafanaApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(payloadData))
      }
    }, JSON.stringify(payloadData));

    if (updateResponse.statusCode === 200 || updateResponse.statusCode === 201) {
      const result = JSON.parse(updateResponse.body);
      console.log(`   ✓ ${existing ? 'Updated' : 'Created'} successfully`);
      console.log(`   Data source ID: ${result.id}`);
      console.log(`   UID: ${result.uid}`);

      // Step 4: Test query
      console.log(`\n4️⃣  Testing query endpoint...`);
      const queryUrl = `${grafanaUrl}/api/datasources/proxy/${result.id}/api/v1/query?query=up`;
      const queryResponse = await makeRequest(queryUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${grafanaApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (queryResponse.statusCode === 200) {
        try {
          const queryResult = JSON.parse(queryResponse.body);
          if (queryResult.status === 'success') {
            console.log(`   ✓ Query successful!`);
            console.log(`   Data points returned: ${queryResult.data?.result?.length || 0}`);
            console.log(`\n🎉 SUCCESS! Data source is working correctly.`);
            console.log(`\n   Your dashboards should now show data.`);
            console.log(`   Refresh your dashboards in Grafana to see the metrics.`);
          } else {
            console.log(`   ⚠ Query returned: ${queryResult.status}`);
            console.log(`   Response: ${queryResponse.body.substring(0, 300)}`);
          }
        } catch (e) {
          console.log(`   ⚠ Could not parse query response`);
          console.log(`   Status: ${queryResponse.statusCode}`);
          console.log(`   Body: ${queryResponse.body.substring(0, 300)}`);
        }
      } else {
        console.log(`   ✗ Query failed: HTTP ${queryResponse.statusCode}`);
        console.log(`   Response: ${queryResponse.body.substring(0, 500)}`);
        
        if (queryResponse.statusCode === 401) {
          console.log(`\n   🔴 Still getting 401! This means the password wasn't saved.`);
          console.log(`   Try manually in Grafana UI:`);
          console.log(`   1. Go to Configuration → Data Sources → Supabase Metrics`);
          console.log(`   2. Re-enter password: ${supabaseServiceRoleKey.substring(0, 20)}...`);
          console.log(`   3. Click Save & Test`);
        }
      }
    } else {
      console.log(`   ✗ Failed to ${existing ? 'update' : 'create'}: HTTP ${updateResponse.statusCode}`);
      console.log(`   Response: ${updateResponse.body}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error.message}`);
    if (error.stack) {
      console.log(error.stack);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n✗ Fatal error:', error);
  process.exit(1);
});

