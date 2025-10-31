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

### Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy-dashboards.yml    # GitHub Actions workflow
├── dashboards/                      # Dashboard JSON definitions
│   └── example-dashboard.json
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

