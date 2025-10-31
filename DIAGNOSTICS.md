# Troubleshooting Guide

## Viewing Failed Workflow Logs

### Option 1: Using GitHub CLI
```bash
# List recent runs
gh run list --workflow=deploy-dashboards.yml

# View logs for the latest run
gh run view --log $(gh run list --workflow=deploy-dashboards.yml --limit 1 --json databaseId -q '.[0].databaseId')

# View only failed steps
gh run view --log-failed $(gh run list --workflow=deploy-dashboards.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

### Option 2: Via GitHub Web UI
1. Go to your repository → **Actions** tab
2. Click on the failed workflow run
3. Expand the failed step to see error logs

## Understanding the Output

### Success Indicators
- ✅ `✓ Created data source: Supabase Metrics` - Data source was created successfully
- ✅ `✓ Supabase data source configured successfully` - Setup completed
- ⚠️ `⚠ Could not test data source health: 400` - **This is normal!** Health check endpoint may not be available in your Grafana version, but the data source was created successfully.

### What to Check After Deployment
1. Go to Grafana → Configuration → Data Sources
2. Look for "Supabase Metrics" 
3. Click "Test" to verify it's working
4. Check your dashboards - they should automatically use this data source

## Common Issues

### 1. Data Source Creation Fails

**Symptoms:**
- HTTP 401/403 errors
- "Failed to create data source" error

**Solutions:**
- Verify `GRAFANA_CLOUD_API_KEY` has admin permissions
- Check that the API key is not expired
- Ensure the Grafana URL is correct (no trailing slash)

### 2. Authentication Errors

**Symptoms:**
- HTTP 401 Unauthorized
- "Invalid credentials" errors

**Solutions:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check that the key hasn't been rotated
- Ensure Basic Auth is configured correctly

### 3. Metrics URL Issues

**Symptoms:**
- Connection timeout
- HTTP 404 Not Found
- "Metrics endpoint not accessible"

**Solutions:**
- Verify `SUPABASE_URL` is correct
- For custom domains, ensure metrics endpoint is accessible at `/customer/v1/privileged/metrics`
- Test the endpoint manually:
  ```bash
  curl -u "service_role:YOUR_KEY" \
    https://app.captainapp.co.uk/customer/v1/privileged/metrics
  ```

### 4. Data Source Already Exists

**Symptoms:**
- HTTP 409 Conflict
- "Data source with this name already exists"

**Solutions:**
- The script should handle this automatically (updates existing)
- If it doesn't, manually delete the data source in Grafana UI and retry

## Testing Locally

You can test the setup script locally:

```bash
# Set environment variables
export GRAFANA_URL=https://your-instance.grafana.net
export GRAFANA_API_KEY=your-grafana-key
export SUPABASE_URL=https://app.captainapp.co.uk
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run the test script
node scripts/test-datasource-setup.js

# Or run the setup script directly
node scripts/setup-grafana-datasource.js
```

## Debugging Steps

1. **Check GitHub Secrets:**
   ```bash
   gh secret list
   ```
   Verify all required secrets are set.

2. **Check Workflow Logs:**
   - Look for the "Configuration check" output
   - Check HTTP status codes and error messages
   - Verify URLs are correct

3. **Test Metrics Endpoint:**
   ```bash
   curl -u "service_role:YOUR_KEY" \
     https://app.captainapp.co.uk/customer/v1/privileged/metrics | head -20
   ```
   Should return Prometheus-formatted metrics.

4. **Test Grafana API:**
   ```bash
   curl -H "Authorization: Bearer YOUR_GRAFANA_KEY" \
     https://your-instance.grafana.net/api/datasources
   ```
   Should return list of data sources.

## Getting Help

If issues persist:
1. Check the improved error messages in the script output
2. Review the HTTP response bodies for detailed error messages
3. Verify all secrets are correctly set
4. Test the endpoints manually to isolate the issue

