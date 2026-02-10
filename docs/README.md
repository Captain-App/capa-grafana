# Grafana Dashboard Viewer

This GitHub Pages site provides clean, fullscreen views of Grafana dashboards with controls hidden.

## Access Issues

If you see "connection refused" or authentication errors:

### Issue: Grafana Cloud Authentication Required

Grafana Cloud requires authentication to view dashboards. When embedding in an iframe from a different domain, you may encounter:

1. **Authentication prompts** - The iframe will redirect to login
2. **Connection refused** - If cookies/auth aren't being passed correctly
3. **X-Frame-Options** - Grafana may block iframe embedding for security

### Solutions:

#### Option 1: Use Direct URL (Recommended for Kiosk Mode)

Instead of embedding, open the dashboard directly in kiosk mode:

```
https://capa.grafana.net/d/monitor-screen/monitor-screen?kiosk=1&refresh=30s&theme=dark
```

Then use browser-level controls to hide the top bar:
- **Chrome**: Open in kiosk mode: `chrome --kiosk --app=https://capa.grafana.net/d/monitor-screen/monitor-screen?kiosk=1`
- **Fullscreen**: Press F11 after loading
- **Browser extension**: Use a fullscreen/kiosk extension

#### Option 2: Make Dashboard Public (if available)

1. In Grafana Cloud, go to Dashboard Settings
2. Enable "Public Dashboard" or "Anonymous Access" if your plan supports it
3. Use the public share URL instead

#### Option 3: Use Grafana's Official Embedding

Grafana Cloud offers official embedding options for enterprise customers. Check your Grafana Cloud account for embedding/API options.

#### Option 4: Server-Side Proxy (Advanced)

Host a server-side proxy that authenticates and serves the dashboard content, bypassing iframe restrictions.

## Current Setup

The HTML files here attempt to embed dashboards, but due to Grafana Cloud's authentication requirements, **direct URL access in kiosk mode is recommended** for monitor screens.


