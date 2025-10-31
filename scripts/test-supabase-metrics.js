#!/usr/bin/env node

/**
 * Test script to see what metrics Supabase actually exposes
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/test-supabase-metrics.js
 */

const https = require('https');
const http = require('http');

function makeRequest(url, options) {
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
    req.end();
  });
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
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

  console.log(`Fetching metrics from: ${metricsUrl}\n`);

  try {
    const auth = Buffer.from(`service_role:${supabaseServiceRoleKey}`).toString('base64');
    
    const response = await makeRequest(metricsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'text/plain'
      }
    });

    if (response.statusCode !== 200) {
      console.error(`HTTP ${response.statusCode}: ${response.body}`);
      process.exit(1);
    }

    const metrics = response.body;
    
    // Extract unique metric names
    const metricNames = new Set();
    const lines = metrics.split('\n');
    
    lines.forEach(line => {
      // Prometheus format: metric_name{labels} value
      const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\{/);
      if (match && !line.startsWith('#')) {
        metricNames.add(match[1]);
      }
    });

    console.log(`Found ${metricNames.size} unique metrics:\n`);
    
    // Group by prefix
    const grouped = {};
    Array.from(metricNames).sort().forEach(metric => {
      const prefix = metric.split('_')[0];
      if (!grouped[prefix]) {
        grouped[prefix] = [];
      }
      grouped[prefix].push(metric);
    });

    // Show metrics grouped by prefix
    Object.keys(grouped).sort().forEach(prefix => {
      console.log(`\n${prefix}_* (${grouped[prefix].length} metrics):`);
      grouped[prefix].slice(0, 10).forEach(metric => {
        console.log(`  - ${metric}`);
      });
      if (grouped[prefix].length > 10) {
        console.log(`  ... and ${grouped[prefix].length - 10} more`);
      }
    });

    // Look for specific metrics we care about
    console.log(`\n\nLooking for specific metrics:`);
    const interesting = ['cpu', 'error', 'query', 'request', 'connection', 'deadlock', 'conflict', 'load'];
    interesting.forEach(term => {
      const matching = Array.from(metricNames).filter(m => 
        m.toLowerCase().includes(term.toLowerCase())
      );
      if (matching.length > 0) {
        console.log(`\n${term}:`);
        matching.forEach(m => console.log(`  - ${m}`));
      }
    });

    // Show sample of actual metrics
    console.log(`\n\nSample metrics (first 50 lines):`);
    console.log(metrics.split('\n').slice(0, 50).join('\n'));

  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

