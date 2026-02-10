#!/usr/bin/env node

const https = require('https');
const http = require('http');

/**
 * Make HTTP request
 */
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

/**
 * Get existing data source by name or UID
 */
async function getDataSource(grafanaUrl, apiKey, name, uid) {
  // Try to get by UID first (more reliable)
  if (uid) {
    try {
      const urlByUid = `${grafanaUrl}/api/datasources/uid/${encodeURIComponent(uid)}`;
      const responseByUid = await makeRequest(urlByUid, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (responseByUid.statusCode === 200) {
        return JSON.parse(responseByUid.body);
      }
    } catch (error) {
      // Continue to try by name
    }
  }

  // Fallback to name lookup
  try {
    const url = `${grafanaUrl}/api/datasources/name/${encodeURIComponent(name)}`;
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      return JSON.parse(response.body);
    } else if (response.statusCode === 404) {
      return null;
    } else {
      throw new Error(`Failed to get data source: ${response.statusCode} - ${response.body}`);
    }
  } catch (error) {
    // If it's a 404, return null (doesn't exist)
    if (error.message.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create or update data source
 */
async function createOrUpdateDataSource(grafanaUrl, apiKey, datasourceConfig) {
  const existing = await getDataSource(grafanaUrl, apiKey, datasourceConfig.name, datasourceConfig.uid);
  
  const url = existing
    ? `${grafanaUrl}/api/datasources/${existing.id}`
    : `${grafanaUrl}/api/datasources`;
  
  const method = existing ? 'PUT' : 'POST';
  
  // Build payload - for updates, we need to be careful about what we include
  const payloadData = {
    name: datasourceConfig.name,
    type: datasourceConfig.type,
    access: datasourceConfig.access,
    url: datasourceConfig.url,
    isDefault: datasourceConfig.isDefault || false,
    basicAuth: true,
    basicAuthUser: datasourceConfig.basicAuthUser,
    jsonData: datasourceConfig.jsonData || {},
    secureJsonData: {
      basicAuthPassword: datasourceConfig.secureJsonData.basicAuthPassword
    }
  };

  // For updates, include ID, version, and UID
  if (existing) {
    payloadData.id = existing.id;
    payloadData.version = existing.version;
    payloadData.uid = datasourceConfig.uid || existing.uid;
    
    // CRITICAL: When updating, we MUST include secureJsonData
    // If we don't, Grafana clears the password!
    // We can't read the existing secureJsonData (it's hidden), so we always set it
    payloadData.secureJsonData = {
      basicAuthPassword: datasourceConfig.secureJsonData.basicAuthPassword
    };
  } else {
    // For new data sources, include UID
    payloadData.uid = datasourceConfig.uid;
  }
  
  const payload = JSON.stringify(payloadData);

  const response = await makeRequest(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);

  if (response.statusCode === 200 || response.statusCode === 201) {
    const result = JSON.parse(response.body);
    console.log(`✓ ${existing ? 'Updated' : 'Created'} data source: ${datasourceConfig.name}`);
    return result;
  } else {
    console.error(`HTTP ${response.statusCode} Response:`, response.body);
    throw new Error(`Failed to ${existing ? 'update' : 'create'} data source: ${response.statusCode} - ${response.body}`);
  }
}

/**
 * Test data source connection
 * Note: Health check endpoint may not be available in all Grafana versions
 */
async function testDataSource(grafanaUrl, apiKey, datasourceId) {
  try {
    const url = `${grafanaUrl}/api/datasources/${datasourceId}/health`;
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      const result = JSON.parse(response.body);
      if (result.status === 'OK') {
        console.log(`✓ Data source health check passed`);
        return true;
      } else {
        console.warn(`⚠ Data source health check: ${result.message || result.status}`);
        console.warn(`  Note: This is not a failure - the data source was created successfully.`);
        console.warn(`  You can test it manually in Grafana UI.`);
        return false;
      }
    } else if (response.statusCode === 404 || response.statusCode === 400) {
      // Health check endpoint not available in this Grafana version - that's OK
      console.log(`ℹ Health check endpoint not available (HTTP ${response.statusCode})`);
      console.log(`  This is normal for some Grafana versions. Data source was created successfully.`);
      return true; // Not a failure
    } else {
      console.warn(`⚠ Could not test data source health: ${response.statusCode}`);
      console.warn(`  Note: This is not a failure - the data source was created successfully.`);
      return false;
    }
  } catch (error) {
    console.warn(`⚠ Health check endpoint not available: ${error.message}`);
    console.warn(`  Note: This is not a failure - the data source was created successfully.`);
    console.warn(`  You can verify it works in Grafana UI by testing the data source.`);
    return true; // Not a failure - endpoint might not exist
  }
}

async function main() {
  const grafanaUrl = process.env.GRAFANA_URL;
  const grafanaApiKey = process.env.GRAFANA_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Debug: Log what we have (without exposing secrets)
  console.log('Configuration check:');
  console.log(`  GRAFANA_URL: ${grafanaUrl ? '✓ Set' : '✗ Missing'}`);
  console.log(`  GRAFANA_API_KEY: ${grafanaApiKey ? '✓ Set' : '✗ Missing'}`);
  console.log(`  SUPABASE_URL: ${supabaseUrl ? `✓ Set (${supabaseUrl})` : '✗ Missing'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? '✓ Set' : '✗ Missing'}`);
  console.log('');

  if (!grafanaUrl || !grafanaApiKey) {
    console.error('Error: GRAFANA_URL and GRAFANA_API_KEY environment variables must be set');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set');
    process.exit(1);
  }

  // Determine metrics URL
  // For custom domains, use the custom domain URL directly
  // Metrics endpoint requires both apikey header and Basic Auth
  let metricsUrl;
  if (supabaseUrl.includes('supabase.co')) {
    // Extract project ref from URL
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      metricsUrl = `https://${match[1]}.supabase.co/customer/v1/privileged/metrics`;
    } else {
      metricsUrl = `${supabaseUrl}/customer/v1/privileged/metrics`;
    }
  } else {
    // Custom domain - use it directly
    metricsUrl = `${supabaseUrl}/customer/v1/privileged/metrics`;
  }

  console.log(`Setting up Supabase Prometheus data source...`);
  console.log(`Metrics URL: ${metricsUrl}`);

  const datasourceConfig = {
    name: 'Supabase Metrics',
    uid: 'supabase-metrics', // Fixed UID for consistent reference in dashboards
    type: 'prometheus',
    access: 'proxy',
    url: metricsUrl,
    isDefault: false,
    jsonData: {
      httpMethod: 'GET',
      queryTimeout: '60s',
      timeInterval: '30s',
      // Try to add custom headers - Grafana may not support this for Prometheus
      // But worth trying: httpHeaderName1 and httpHeaderValue1
      httpHeaderName1: 'apikey',
      httpHeaderValue1: supabaseServiceRoleKey
    },
    secureJsonData: {
      basicAuthPassword: supabaseServiceRoleKey
    },
    basicAuth: true,
    basicAuthUser: 'service_role',
    // Note: Grafana API doesn't accept basicAuthPassword in regular JSON, only secureJsonData
  };

  try {
    const datasource = await createOrUpdateDataSource(grafanaUrl, grafanaApiKey, datasourceConfig);
    
    // Test the connection
    await testDataSource(grafanaUrl, grafanaApiKey, datasource.id);
    
    console.log(`\n✓ Supabase data source configured successfully`);
    console.log(`  Data source ID: ${datasource.id}`);
    console.log(`  Name: ${datasource.name}`);
    console.log(`  UID: ${datasource.uid || datasourceConfig.uid}`);
    console.log(`  URL: ${metricsUrl}`);
    console.log(`\n  Next steps:`);
    console.log(`  1. Verify the data source in Grafana UI: ${grafanaUrl}/connections/datasources`);
    console.log(`  2. Test it by running a query in the Explore view`);
    console.log(`  3. Dashboards will automatically use this data source`);
    
    return datasource;
  } catch (error) {
    console.error(`\n✗ Failed to setup data source: ${error.message}`);
    console.error(`\nDebugging information:`);
    console.error(`  Error type: ${error.constructor.name}`);
    if (error.stack) {
      console.error(`  Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

