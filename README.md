# Grafana Dashboard as Code

This repository contains Grafana dashboards managed as code and deployed to Grafana Cloud via GitHub Actions.

## Setup

### Prerequisites

- Grafana Cloud account
- GitHub repository with Actions enabled

### Configuration

1. **Get your Grafana Cloud API Key:**
   - Log in to your Grafana Cloud instance
   - Go to Configuration → API Keys (or visit `https://your-instance.grafana.net/org/apikeys`)
   - Create a new API key with Admin role
   - Copy the API key (you'll only see it once)

2. **Get your Grafana Cloud URL:**
   - Your Grafana Cloud URL is typically: `https://your-instance.grafana.net`
   - Replace `your-instance` with your actual Grafana Cloud instance name

3. **Add GitHub Secrets:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `GRAFANA_CLOUD_API_KEY`: Your Grafana Cloud API key
     - `GRAFANA_CLOUD_URL`: Your Grafana Cloud instance URL (e.g., `https://your-instance.grafana.net`)

### Monitoring Supabase

These dashboards are configured to monitor your Supabase instance (CPU usage and error counts).

**Fully Automated Setup (Infrastructure as Code):**

The GitHub Actions workflow automatically:
1. ✅ Creates/updates the Supabase Prometheus data source in Grafana
2. ✅ Deploys all dashboards configured to use it

**No manual configuration needed!** Just ensure these GitHub secrets are set:
- `GRAFANA_CLOUD_URL` - Your Grafana Cloud instance URL
- `GRAFANA_CLOUD_API_KEY` - Grafana API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for metrics

**For details on how Supabase Prometheus integration works, see [SUPABASE_PROMETHEUS_EXPLAINED.md](./SUPABASE_PROMETHEUS_EXPLAINED.md)**

**If dashboards show no data, see [QUERY_TROUBLESHOOTING.md](./QUERY_TROUBLESHOOTING.md) for help finding the right metrics.**

### Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy-dashboards.yml    # GitHub Actions workflow
├── dashboards/                      # Dashboard JSON definitions
│   └── example-dashboard.json
├── scripts/
│   ├── deploy-dashboards.js        # Deployment script
│   ├── setup-grafana-datasource.js # Automated data source setup
│   └── validate-dashboards.js      # Dashboard validation
├── SUPABASE_SETUP.md               # Supabase monitoring setup guide
├── SUPABASE_PROMETHEUS_EXPLAINED.md # How Supabase Prometheus works
└── README.md
```

## Deployment

Dashboards are automatically deployed to Grafana Cloud when changes are pushed to the `main` branch. You can also trigger manual deployments via GitHub Actions.

## Adding Dashboards

1. Create a JSON file in the `dashboards/` directory
2. Export your dashboard from Grafana UI or create it manually
3. Commit and push to trigger deployment

## Dashboard Naming

- Use lowercase with hyphens for filenames (e.g., `my-dashboard.json`)
- The dashboard UID will be derived from the filename

## Hiding Dashboard Controls

Grafana's built-in kiosk mode (`?kiosk=1`) may still show some controls. For a completely clean view without any toolbar or controls:

### Option 1: Use the Embed URL (Recommended)

The deployment script outputs an **Embed URL** for each dashboard. This URL works best when embedded in an iframe:

1. Copy the embed URL from the deployment logs
2. Use it in an iframe or the provided wallboard HTML wrapper
3. See `scripts/generate-wallboard.html` for a ready-to-use template

### Option 2: Use the Wallboard HTML Wrapper

A wallboard HTML file is included (`scripts/generate-wallboard.html`) that provides a clean fullscreen view:

```bash
# Open the wallboard with your dashboard URL
open scripts/generate-wallboard.html?url=https://capa.grafana.net/d/monitor-screen/monitor-screen?kiosk=1
```

Or serve it and pass the dashboard URL as a parameter:
- `?url=<dashboard-url>` - The dashboard URL to display
- `?refresh=<seconds>` - Auto-refresh interval (default: 180 seconds, set to 0 to disable)

### Option 3: GitHub Pages (Recommended for Clean Display)

This repository includes a GitHub Pages site that wraps dashboards and hides the top controls:

1. **Access your dashboard**: After enabling GitHub Pages, visit:
   ```
   https://captain-app.github.io/capa-grafana/monitor-screen.html
   ```

2. **Custom dashboard**: Use the index page with a URL parameter:
   ```
   https://captain-app.github.io/capa-grafana/?url=https://capa.grafana.net/d/your-dashboard/your-dashboard?kiosk=1
   ```

3. **Enable GitHub Pages** (if not already enabled):
   - Go to Settings → Pages in your GitHub repository
   - Source: Deploy from a branch
   - Branch: `gh-pages` (will be created automatically) or `main` / `docs`

The GitHub Pages site uses CSS clipping to hide the top controls bar, giving you a completely clean display.

### Option 4: Direct Embed URL

Each deployment outputs an embed URL that's optimized for iframe embedding. Use this URL directly in your own HTML page or viewer.

## Monitoring Supabase

The dashboards in this repository are configured to monitor your Supabase instance, specifically:

- **CPU Usage**: Database CPU utilization metrics
- **Error Counts**: Database deadlocks, conflicts, and other error metrics

### Available Dashboards

- **monitor-screen**: Main monitoring dashboard with CPU and error metrics
- **cpu-and-errors**: Dedicated dashboard focused on CPU usage and error counts

### Setting Up Supabase Metrics

1. Configure the Prometheus data source in Grafana to point to your Supabase metrics endpoint
2. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions
3. After setup, dashboards will automatically display your Supabase instance metrics

**Note**: You'll need your Supabase `service_role` API key to access the metrics endpoint. Keep this key secure!
