# Hiding Grafana Dashboard Controls

Grafana's `?kiosk=1` parameter doesn't fully hide the top controls. Here are solutions:

## Solution 1: Browser Extension (Tampermonkey) - RECOMMENDED

1. **Install Tampermonkey** (Chrome/Edge/Firefox):
   - Chrome: https://chrome.google.com/webstore/detail/tampermonkey
   - Firefox: https://addons.mozilla.org/firefox/addon/tampermonkey

2. **Install the User Script**:
   - Open Tampermonkey → Dashboard → Create a new script
   - Copy the contents of `hide-grafana-controls.user.js`
   - Save (Ctrl+S / Cmd+S)

3. **Open your dashboard**:
   ```
   https://capa.grafana.net/d/monitor-screen/monitor-screen?kiosk=1&refresh=30s&theme=dark
   ```

The script will automatically hide the top controls bar.

## Solution 2: Stylus Extension (CSS Injection)

1. **Install Stylus** extension:
   - Chrome: https://chrome.google.com/webstore/detail/stylus
   - Firefox: https://addons.mozilla.org/firefox/addon/stylus

2. **Create a style for capa.grafana.net**:
   - Click Stylus icon → Write style for → Insert domain: `capa.grafana.net`
   - Add this CSS:
   ```css
   /* Hide Grafana top navigation */
   [class*="navbar"],
   [class*="topnav"],
   [data-testid="topnav"],
   .navbar,
   .page-toolbar,
   header {
       display: none !important;
       height: 0 !important;
       visibility: hidden !important;
   }
   
   /* Adjust main content */
   [class*="main-view"],
   .dashboard-container {
       margin-top: 0 !important;
       padding-top: 0 !important;
   }
   
   /* Hide time picker and refresh controls */
   [class*="timepicker"],
   [class*="refresh-picker"],
   [aria-label*="Refresh"],
   [aria-label*="Time range"] {
       display: none !important;
   }
   ```

## Solution 3: Direct Browser Kiosk Mode (Simplest)

Use Chrome's kiosk mode - it hides browser chrome, and Grafana's controls are minimal:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --app="https://capa.grafana.net/d/monitor-screen/monitor-screen?kiosk=1&refresh=30s&theme=dark"

# Or create an AppleScript app:
```

Save this as `Monitor Screen.app`:

```applescript
tell application "Google Chrome"
    activate
    open location "https://capa.grafana.net/d/monitor-screen/monitor-screen?kiosk=1&refresh=30s&theme=dark"
    delay 1
    tell application "System Events"
        keystroke "f" using {command down, control down}
    end tell
end tell
```

## Solution 4: Local Proxy Server (Advanced)

Run a local proxy that injects CSS to hide controls. This requires Node.js/Python but gives full control.

## Quick Test

Try Solution 1 (Tampermonkey) first - it's the easiest and most reliable. The user script will automatically hide controls when you visit the Grafana dashboard.

