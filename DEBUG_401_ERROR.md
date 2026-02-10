# Debugging 401 Unauthorized Error

## The Problem

You're seeing `401 Unauthorized` errors in Grafana dashboards. This means:
- ✅ Data source is created
- ✅ Supabase metrics endpoint is accessible (we tested it)
- ❌ Grafana can't authenticate when querying Supabase

## Root Cause

When updating a Grafana data source via API, **you MUST include `secureJsonData`** even when updating, otherwise Grafana clears the password. This is a Grafana API requirement.

## Quick Fix Options

### Option 1: Run Fix Script (Recommended)

Run this locally with your Grafana credentials:

```bash
export GRAFANA_URL=https://your-instance.grafana.net
export GRAFANA_API_KEY=your-grafana-api-key
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

npm run fix-datasource-auth
```

This will:
1. Get the existing data source
2. Update it with the password properly saved
3. Test the query endpoint to verify it works

### Option 2: Manual Fix in Grafana UI

1. Go to Grafana → **Configuration** → **Data Sources**
2. Click **"Supabase Metrics"**
3. Scroll to **"Basic Auth Details"**
4. Re-enter:
   - **User**: `service_role`
   - **Password**: Your Supabase `service_role` key
5. Click **"Save & Test"**
6. You should see: ✅ "Data source is working"

### Option 3: Redeploy (Automatic Fix)

The updated `setup-grafana-datasource.js` script now properly handles password saving. Just push changes and the workflow will fix it automatically.

## Debugging Script

To diagnose the issue:

```bash
export GRAFANA_URL=https://your-instance.grafana.net
export GRAFANA_API_KEY=your-grafana-api-key
export SUPABASE_URL=https://app.captainapp.co.uk
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

npm run debug-datasource
```

This will show:
- ✅ Environment variables status
- ✅ Supabase endpoint accessibility
- ✅ Current Grafana data source configuration
- ✅ Query test results
- 🔍 What needs to be fixed

## What I Fixed

1. **Improved setup script**: Now explicitly includes all required fields when updating
2. **Fixed fix script**: Properly constructs update payload with password
3. **Added debug script**: Comprehensive diagnostics
4. **Better error handling**: More detailed error messages

## Verify It's Fixed

After running the fix, check your dashboard. You should see:
- ✅ CPU usage graph with data
- ✅ Error counts (if any errors occurred)
- ✅ No more 401 errors

If you still see 401:
1. Run `npm run debug-datasource` to see what's wrong
2. Check Grafana logs for more details
3. Verify the service_role key is correct
4. Test the metrics endpoint directly: `curl -u "service_role:KEY" https://app.captainapp.co.uk/customer/v1/privileged/metrics`

