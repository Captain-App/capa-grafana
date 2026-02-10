#!/usr/bin/env node

/**
 * Comprehensive debugging script for Supabase data source
 * Checks configuration, tests endpoints, and identifies issues
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

async function debugDataSource() {
  const grafanaUrl = process.env.GRAFANA_URL;
  const grafanaApiKey = process.env.GRAFANA_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('🔍 Debugging Supabase Data Source Configuration\n');
  console.log('='.repeat(60));

  // 1. Check environment variables
  console.log('\n1️⃣  Checking Environment Variables:');
  console.log(`   GRAFANA_URL: ${grafanaUrl ? '✓ Set' : '✗ Missing'}`);
  console.log(`   GRAFANA_API_KEY: ${grafanaApiKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`   SUPABASE_URL: ${supabaseUrl ? `✓ Set (${supabaseUrl})` : '✗ Missing'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? '✓ Set' : '✗ Missing'}`);

  if (!grafanaUrl || !grafanaApiKey || !supabaseUrl || !supabaseServiceRoleKey) {
    console.error('\n✗ Missing required environment variables');
    process.exit(1);
  }

  // 2. Test Supabase metrics endpoint directly
  console.log('\n2️⃣  Testing Supabase Metrics Endpoint:');
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

  console.log(`   URL: ${metricsUrl}`);
  
  try {
    const auth = Buffer.from(`service_role:${supabaseServiceRoleKey}`).toString('base64');
    const metricsResponse = await makeRequest(metricsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'text/plain'
      }
    });

    if (metricsResponse.statusCode === 200) {
      console.log(`   ✓ Endpoint accessible (HTTP ${metricsResponse.statusCode})`);
      const metricCount = metricsResponse.body.split('\n').filter(l => l && !l.startsWith('#')).length;
      console.log(`   ✓ Metrics available: ~${metricCount} data points`);
    } else {
      console.log(`   ✗ Endpoint failed (HTTP ${metricsResponse.statusCode})`);
      console.log(`   Response: ${metricsResponse.body.substring(0, 200)}`);
    }
  } catch (error) {
    console.log(`   ✗ Connection error: ${error.message}`);
  }

  // 3. Get data source from Grafana
  console.log('\n3️⃣  Checking Grafana Data Source Configuration:');
  
  try {
    const getUrl = `${grafanaUrl}/api/datasources/uid/supabase-metrics`;
    const getResponse = await makeRequest(getUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${grafanaApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (getResponse.statusCode !== 200) {
      console.log(`   ✗ Failed to get data source (HTTP ${getResponse.statusCode})`);
      console.log(`   Response: ${getResponse.body}`);
      return;
    }

    const ds = JSON.parse(getResponse.body);
    console.log(`   ✓ Data source found: ${ds.name} (ID: ${ds.id}, UID: ${ds.uid})`);
    console.log(`   URL: ${ds.url}`);
    console.log(`   Type: ${ds.type}`);
    console.log(`   Access: ${ds.access}`);
    console.log(`   Basic Auth Enabled: ${ds.basicAuth || false}`);
    console.log(`   Basic Auth User: ${ds.basicAuthUser || 'NOT SET'}`);
    
    // Check if secureJsonData is set (we can't read it, but we can check if it exists)
    // Grafana doesn't return secureJsonData for security reasons
    console.log(`   Secure JSON Data: [hidden by Grafana API]`);
    
    // Check jsonData
    if (ds.jsonData) {
      console.log(`   JSON Data:`, JSON.stringify(ds.jsonData, null, 2));
    }

    // 4. Test data source query through Grafana
    console.log('\n4️⃣  Testing Data Source Query via Grafana:');
    
    // Try to query a simple metric
    const queryUrl = `${grafanaUrl}/api/datasources/proxy/${ds.id}/api/v1/query?query=up`;
    const queryResponse = await makeRequest(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${grafanaApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Query URL: ${queryUrl}`);
    console.log(`   Response Status: ${queryResponse.statusCode}`);
    
    if (queryResponse.statusCode === 200) {
      try {
        const queryResult = JSON.parse(queryResponse.body);
        if (queryResult.status === 'success') {
          console.log(`   ✓ Query successful!`);
          console.log(`   Data points: ${queryResult.data?.result?.length || 0}`);
        } else {
          console.log(`   ⚠ Query returned: ${queryResult.status}`);
          console.log(`   Response: ${queryResponse.body.substring(0, 300)}`);
        }
      } catch (e) {
        console.log(`   ⚠ Could not parse response: ${queryResponse.body.substring(0, 300)}`);
      }
    } else {
      console.log(`   ✗ Query failed (HTTP ${queryResponse.statusCode})`);
      console.log(`   Response: ${queryResponse.body.substring(0, 500)}`);
      
      // Check if it's a 401
      if (queryResponse.statusCode === 401) {
        console.log('\n   🔴 401 Unauthorized detected!');
        console.log('   This means Grafana cannot authenticate with Supabase.');
        console.log('   Possible causes:');
        console.log('   1. Basic Auth password not saved in Grafana');
        console.log('   2. Wrong service_role key');
        console.log('   3. Metrics endpoint requires different auth');
      }
    }

    // 5. Check if we need to update the data source
    console.log('\n5️⃣  Checking Configuration:');
    const needsUpdate = 
      ds.url !== metricsUrl ||
      ds.basicAuthUser !== 'service_role' ||
      !ds.basicAuth;

    if (needsUpdate) {
      console.log('   ⚠ Configuration mismatch detected:');
      if (ds.url !== metricsUrl) {
        console.log(`     - URL mismatch: ${ds.url} vs ${metricsUrl}`);
      }
      if (ds.basicAuthUser !== 'service_role') {
        console.log(`     - User mismatch: ${ds.basicAuthUser} vs service_role`);
      }
      if (!ds.basicAuth) {
        console.log(`     - Basic Auth not enabled`);
      }
      console.log('\n   💡 Run: npm run setup-datasource (or fix-datasource-auth)');
    } else {
      console.log('   ✓ Configuration looks correct');
      console.log('   ⚠ But password might not be saved!');
      console.log('   💡 Try: npm run fix-datasource-auth');
    }

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Next Steps:');
  console.log('   1. If 401 error: Run "npm run fix-datasource-auth"');
  console.log('   2. If endpoint not accessible: Check SUPABASE_URL and credentials');
  console.log('   3. If query fails: Check that metrics endpoint is correct');
  console.log('   4. Manual fix: Go to Grafana UI → Data Sources → Supabase Metrics');
  console.log('                 → Re-enter password → Save & Test\n');
}

debugDataSource().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

