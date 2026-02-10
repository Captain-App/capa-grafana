#!/usr/bin/env node

/**
 * Final comprehensive test to see what's working
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

  console.log('📊 Current Status Check\n');
  console.log('='.repeat(60));

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
  
  console.log('\n✅ Data Source Configuration:');
  console.log(`   Name: ${ds.name}`);
  console.log(`   ID: ${ds.id}`);
  console.log(`   UID: ${ds.uid}`);
  console.log(`   URL: ${ds.url}`);
  console.log(`   Basic Auth: ${ds.basicAuth}`);
  console.log(`   Basic Auth User: ${ds.basicAuthUser}`);
  console.log(`   Password Saved: ${ds.secureJsonFields?.basicAuthPassword ? '✓ Yes' : '✗ No'}`);
  console.log(`   HTTP Method: ${ds.jsonData?.httpMethod || 'GET'}`);

  // Test 1: Direct metrics endpoint (this worked before)
  console.log('\n🔍 Test 1: Direct metrics endpoint through Grafana proxy...');
  const metricsUrl = `${grafanaUrl}/api/datasources/proxy/${ds.id}`;
  const resp1 = await makeRequest(metricsUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Accept': 'text/plain'
    }
  });
  
  if (resp1.statusCode === 200) {
    const metricCount = resp1.body.split('\n').filter(l => l && !l.startsWith('#')).length;
    console.log(`   ✅ SUCCESS! Got ${metricCount} metrics`);
    console.log(`   This means Basic Auth IS working!`);
  } else {
    console.log(`   ❌ FAILED: HTTP ${resp1.statusCode}`);
    console.log(`   ${resp1.body.substring(0, 200)}`);
  }

  // Test 2: Prometheus query API
  console.log('\n🔍 Test 2: Prometheus query API (what dashboards use)...');
  const queryUrl = `${grafanaUrl}/api/datasources/proxy/${ds.id}/api/v1/query?query=up`;
  const resp2 = await makeRequest(queryUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (resp2.statusCode === 200) {
    try {
      const result = JSON.parse(resp2.body);
      if (result.status === 'success') {
        console.log(`   ✅ SUCCESS! Query works!`);
        console.log(`   Data points: ${result.data?.result?.length || 0}`);
      } else {
        console.log(`   ⚠ Query returned: ${result.status}`);
        console.log(`   ${resp2.body.substring(0, 300)}`);
      }
    } catch (e) {
      console.log(`   ⚠ Response not JSON: ${resp2.body.substring(0, 200)}`);
    }
  } else {
    console.log(`   ❌ FAILED: HTTP ${resp2.statusCode}`);
    console.log(`   Response: ${resp2.body.substring(0, 500)}`);
    
    if (resp2.statusCode === 400 && resp2.body.includes('Authentication')) {
      console.log(`\n   🔴 ISSUE: Authentication failing for Prometheus queries`);
      console.log(`   But direct metrics endpoint works, so this might be:`);
      console.log(`   1. Prometheus API endpoint path issue`);
      console.log(`   2. Grafana Cloud proxy configuration`);
      console.log(`   3. Need to use different query endpoint`);
    }
  }

  // Test 3: Try querying a real metric
  console.log('\n🔍 Test 3: Query actual Supabase metric...');
  const queryUrl3 = `${grafanaUrl}/api/datasources/proxy/${ds.id}/api/v1/query?query=node_cpu_seconds_total`;
  const resp3 = await makeRequest(queryUrl3, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${grafanaApiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (resp3.statusCode === 200) {
    console.log(`   ✅ SUCCESS!`);
  } else {
    console.log(`   Status: ${resp3.statusCode}`);
    console.log(`   Response: ${resp3.body.substring(0, 300)}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Summary:');
  if (resp1.statusCode === 200) {
    console.log('   ✅ Basic Auth is working - metrics endpoint accessible');
    if (resp2.statusCode === 200) {
      console.log('   ✅ Prometheus queries work - dashboards should work!');
    } else {
      console.log('   ⚠ Prometheus query API has issues - check error above');
      console.log('   💡 Try refreshing dashboards - they might still work');
    }
  } else {
    console.log('   ❌ Basic Auth not working - password needs to be set');
  }
  console.log('');
}

main().catch(console.error);

