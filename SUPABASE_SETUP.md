# Monitoring Supabase with Grafana

This guide shows you how to configure Grafana to monitor your Supabase instance's CPU usage and error counts.

> **📖 Want to understand how it works?** See [SUPABASE_PROMETHEUS_EXPLAINED.md](./SUPABASE_PROMETHEUS_EXPLAINED.md) for a detailed explanation of Supabase's built-in Prometheus integration.

## Step 1: Add Supabase Metrics Data Source in Grafana

Supabase provides a Prometheus-compatible metrics endpoint. To add it:

1. **Get your Supabase Project Reference**
   - Your project ref is in your Supabase dashboard URL or project settings
   - Example: If your URL is `https://xxxxx.supabase.co`, then `xxxxx` is your project ref

2. **Get your Service Role Key**
   - Go to Supabase Dashboard → Settings → API
   - Copy your `service_role` key (keep this secret!)

3. **Add Prometheus Data Source in Grafana**
   - In Grafana, go to **Configuration → Data Sources → Add data source**
   - Select **Prometheus**
   - Configure:
     - **URL**: `https://<project-ref>.supabase.co/customer/v1/privileged/metrics`
     - **Auth**: Enable **Basic Auth**
     - **User**: `service_role`
     - **Password**: Your `service_role` API key
   - Click **Save & Test**

## Step 2: Update Dashboard Queries

After adding the data source, you'll need to update the dashboard queries to match your Supabase metrics. The dashboards currently use placeholder Prometheus queries that you'll need to customize.

### Common Supabase Metrics

**CPU Usage:**
- Database CPU: `pg_stat_database` metrics
- System CPU: Look for `node_cpu_seconds_total` if available
- Or use: `rate(pg_stat_database_blk_read_time{datname="postgres"}[5m])`

**Error Counts:**
- Database errors: `pg_stat_database_deadlocks` or `pg_stat_database_conflicts`
- Connection errors: Look for connection pool metrics
- API errors: HTTP 5xx responses from Supabase API

### Quick Query Examples

**CPU Usage (PostgreSQL):**
```promql
100 - (avg(rate(pg_stat_database_blk_read_time{datname="postgres"}[5m])) * 100)
```

**Database Errors:**
```promql
sum(rate(pg_stat_database_deadlocks[5m]))
```

**Connection Errors:**
```promql
sum(rate(pg_stat_database_conflicts[5m]))
```

## Step 3: Using Grafana Cloud (Alternative)

If you're using Grafana Cloud, you can set up agentless monitoring:

1. Go to **Connections** → **Metrics Endpoint**
2. Create a new scrape job:
   - **Scrape URL**: `https://<project-ref>.supabase.co/customer/v1/privileged/metrics`
   - **Auth Type**: Basic Auth
   - **Username**: `service_role`
   - **Password**: Your `service_role` key

## Step 4: Import Supabase Dashboard (Recommended)

Supabase provides an official Grafana dashboard with 200+ metrics:

1. Go to Grafana → **Dashboards** → **Import**
2. Use dashboard ID or import from: https://github.com/supabase/supabase-grafana
3. This includes pre-configured panels for CPU, errors, and much more

## Troubleshooting

- **No data showing?** Check that your service_role key is correct and the metrics endpoint is accessible
- **Authentication errors?** Verify Basic Auth credentials match exactly
- **Missing metrics?** Some metrics may require Supabase Pro plan or specific configuration

