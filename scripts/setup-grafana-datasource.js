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
  
  // When updating, preserve existing ID and version, but ensure UID matches
  const payload = JSON.stringify({
    ...datasourceConfig,
    ...(existing && { 
      id: existing.id, 
      version: existing.version,
      // Ensure UID is set correctly (update if it was different)
      uid: datasourceConfig.uid || existing.uid
    })
  });

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
    throw new Error(`Failed to ${existing ? 'update' : 'create'} data source: ${response.statusCode} - ${response.body}`);
  }
}

/**
 * Test data source connection
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
        return false;
      }
    } else {
      console.warn(`⚠ Could not test data source health: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.warn(`⚠ Health check failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const grafanaUrl = process.env.GRAFANA_URL;
  const grafanaApiKey = process.env.GRAFANA_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!grafanaUrl || !grafanaApiKey) {
    console.error('Error: GRAFANA_URL and GRAFANA_API_KEY environment variables must be set');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set');
    process.exit(1);
  }

  // Extract project ref from Supabase URL if needed
  // Support both formats: https://app.captainapp.co.uk or https://xxxxx.supabase.co
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
    // Custom domain - try both possible paths
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
      httpMethod: 'POST',
      queryTimeout: '60s',
      timeInterval: '30s'
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
    console.log(`  URL: ${metricsUrl}`);
    
    return datasource;
  } catch (error) {
    console.error(`✗ Failed to setup data source: ${error.message}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

