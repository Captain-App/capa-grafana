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

