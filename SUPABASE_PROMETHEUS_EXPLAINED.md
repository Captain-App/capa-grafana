# How Supabase Prometheus Integration Works

## Overview

Yes, Supabase has **built-in Prometheus metrics**! Supabase exposes a Prometheus-compatible metrics endpoint for each project, allowing you to monitor database performance, connection pools, query performance, and more.

## Architecture

```
┌─────────────────┐
│   Supabase      │
│   PostgreSQL    │ ───┐
│   Database      │    │
└─────────────────┘    │
                       │ Exposes metrics
┌─────────────────┐    │ via HTTP endpoint
│   Supabase      │    │
│   Metrics       │ ◄──┘
│   Endpoint      │
│   (Prometheus   │
│   compatible)   │
└─────────────────┘
         │
         │ HTTP GET requests
         │ (scraped periodically)
         ▼
┌─────────────────┐
│   Prometheus    │ ◄─── Scrapes metrics every N seconds
│   (Optional)    │      Stores time-series data
└─────────────────┘
         │
         │ Queries
         ▼
┌─────────────────┐
│    Grafana      │ ◄─── Visualizes metrics
│                 │      (can query Prometheus directly
│                 │       OR use Prometheus as backend)
└─────────────────┘
```

## Two Integration Methods

### Method 1: Direct Integration (What We're Using)

Grafana connects **directly** to Supabase's metrics endpoint:

```
Grafana → HTTPS → Supabase Metrics Endpoint
```

**Pros:**
- ✅ No additional infrastructure needed
- ✅ Simpler setup
- ✅ Works great for Grafana Cloud

**Cons:**
- ⚠️ Grafana scrapes metrics on-demand (not continuous)
- ⚠️ Limited historical data retention
- ⚠️ No metrics aggregation layer

**Configuration:**
- Grafana data source type: **Prometheus**
- URL: `https://<project-ref>.supabase.co/customer/v1/privileged/metrics`
- Auth: Basic Auth (`service_role` / `service_role_key`)

### Method 2: Prometheus + Grafana (Full Stack)

Use Prometheus as an intermediary:

```
Grafana → Prometheus → Supabase Metrics Endpoint
```

**Pros:**
- ✅ Continuous metric collection
- ✅ Long-term data retention
- ✅ Metric aggregation and alerting
- ✅ Better for multiple data sources

**Cons:**
- ⚠️ Requires running Prometheus server
- ⚠️ More complex setup

**Prometheus Configuration (`prometheus.yml`):**
```yaml
scrape_configs:
  - job_name: 'supabase'
    metrics_path: '/customer/v1/privileged/metrics'
    scheme: https
    basic_auth:
      username: 'service_role'
      password: '<YOUR_SERVICE_ROLE_JWT>'
    static_configs:
      - targets: ['<project-ref>.supabase.co:443']
    scrape_interval: 30s  # How often to collect metrics
```

## What Metrics Are Available?

Supabase exposes **200+ metrics** including:

### Database Performance
- **CPU Usage**: `pg_stat_database_blk_read_time`, `pg_stat_database_blk_write_time`
- **Query Performance**: `pg_stat_statements_*` (query execution times, counts)
- **Connection Pool**: Connection pool metrics, active connections
- **Database Size**: Table sizes, database growth

### Error Metrics
- **Deadlocks**: `pg_stat_database_deadlocks`
- **Conflicts**: `pg_stat_database_conflicts`
- **Connection Errors**: Failed connection attempts
- **Query Errors**: Failed queries, timeout errors

### Infrastructure Metrics
- **I/O Stats**: Disk read/write operations
- **Cache Hit Ratios**: Buffer cache performance
- **Transaction Metrics**: Commits, rollbacks, transactions per second

### Example Metric Names
```
pg_stat_database_blk_read_time
pg_stat_database_blk_write_time
pg_stat_database_deadlocks
pg_stat_database_conflicts
pg_stat_database_xact_commit
pg_stat_database_xact_rollback
pg_stat_statements_calls
pg_stat_statements_total_time
```

## How It Works Internally

1. **Supabase's PostgreSQL** runs with extensions enabled:
   - `pg_stat_statements` - Query performance tracking
   - `pg_stat_database` - Database-level statistics
   - Custom Supabase metrics exporters

2. **Metrics Endpoint** (`/customer/v1/privileged/metrics`):
   - Exposes metrics in Prometheus format (text/plain)
   - Updates in real-time as queries execute
   - Requires authentication (service_role only)

3. **Prometheus Format**:
   ```
   # HELP pg_stat_database_deadlocks Number of deadlocks
   # TYPE pg_stat_database_deadlocks counter
   pg_stat_database_deadlocks{datname="postgres"} 42.0
   ```

## Authentication

The metrics endpoint uses **HTTP Basic Authentication**:
- **Username**: Always `service_role`
- **Password**: Your project's `service_role` JWT token
- **Why service_role?**: Metrics are privileged information, not available to regular users

⚠️ **Security Note**: Never expose your `service_role` key publicly. It bypasses Row Level Security (RLS) and has full database access.

## Grafana Cloud Integration

If using **Grafana Cloud**, you can use **agentless monitoring**:

1. Go to **Connections → Metrics Endpoint**
2. Add Supabase endpoint:
   - Scrape URL: `https://<project-ref>.supabase.co/customer/v1/privileged/metrics`
   - Auth: Basic Auth with `service_role` credentials
3. Grafana Cloud will scrape metrics automatically
4. No Prometheus server needed!

## Query Examples

Once connected, you can query metrics using PromQL:

**Current CPU Usage:**
```promql
rate(pg_stat_database_blk_read_time{datname="postgres"}[5m])
```

**Error Rate:**
```promql
rate(pg_stat_database_deadlocks[5m])
```

**Total Connections:**
```promql
pg_stat_database_numbackends
```

**Query Performance:**
```promql
rate(pg_stat_statements_calls[5m])
```

## Official Supabase Dashboard

Supabase provides an official Grafana dashboard with pre-configured panels:
- 📊 200+ metrics visualized
- 🔍 Query performance analysis
- 📈 Database growth tracking
- ⚠️ Error monitoring
- 💾 Connection pool metrics

**Import it from**: https://github.com/supabase/supabase-grafana

## Summary

**Yes, Supabase has Prometheus built-in!** It's a first-class feature:

1. ✅ Every Supabase project exposes `/customer/v1/privileged/metrics`
2. ✅ Metrics are in standard Prometheus format
3. ✅ Grafana can connect directly (no Prometheus needed)
4. ✅ Or use Prometheus for advanced features
5. ✅ 200+ metrics available out of the box

This makes monitoring your Supabase instance as simple as configuring a Grafana data source! 🎉

