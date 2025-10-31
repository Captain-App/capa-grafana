# Query Troubleshooting - Finding the Right Metrics

## The Problem

Your data source is connected, but dashboards show no data. This usually means:
1. The queries don't match the actual metric names Supabase exposes
2. The metrics might have different labels or formats

## Step 1: Discover Available Metrics

Run this script to see what metrics Supabase actually exposes:

```bash
export SUPABASE_URL=https://app.captainapp.co.uk
export SUPABASE_SERVICE_ROLE_KEY=your-key
node scripts/test-supabase-metrics.js
```

This will show you:
- All available metric names
- Grouped by prefix (pg_, supabase_, etc.)
- Specifically look for CPU, error, and query metrics

## Step 2: Test Queries in Grafana Explore

1. Go to Grafana → **Explore** (compass icon)
2. Select **Supabase Metrics** data source
3. Try these queries one by one:

```promql
# List all metrics
{__name__=~".+"}

# Look for CPU-related metrics
{__name__=~".*cpu.*"}

# Look for error-related metrics  
{__name__=~".*error.*"}

# Look for query-related metrics
{__name__=~".*query.*"}

# Look for PostgreSQL stats
{__name__=~"pg_stat.*"}
```

## Step 3: Common Supabase Metrics

Based on Supabase's metrics endpoint, common metrics include:

### Database Metrics
- `pg_stat_database_*` - PostgreSQL database statistics
- `pg_stat_statements_*` - Query performance metrics
- `pg_stat_activity_*` - Active connections/queries

### Supabase-Specific Metrics
- `supabase_postgres_*` - Custom Supabase metrics
- `supabase_api_*` - API-related metrics
- `supabase_auth_*` - Authentication metrics

### System Metrics (if available)
- `node_cpu_seconds_total` - CPU usage
- `node_memory_*` - Memory usage

## Step 4: Update Dashboard Queries

Once you know what metrics are available, update the dashboard queries:

1. Open the dashboard in Grafana
2. Click **Edit** (pencil icon)
3. Click on a panel
4. In the query editor, update the PromQL query
5. Test the query - you should see data
6. Save the dashboard

## Quick Fix: Use the Official Supabase Dashboard

The easiest solution is to import Supabase's official dashboard:

1. Go to Grafana → **Dashboards** → **Import**
2. Use this URL: https://github.com/supabase/supabase-grafana
3. Or import dashboard ID (check their repo for the latest)

This dashboard has all queries pre-configured correctly!

