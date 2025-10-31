#!/bin/bash

# Open Grafana Monitor Screen in Chrome Kiosk Mode
# This hides browser chrome, making Grafana controls less noticeable

CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DASHBOARD_URL="https://capa.grafana.net/d/monitor-screen/monitor-screen?kiosk=1&refresh=30s&theme=dark"

if [ ! -f "$CHROME_PATH" ]; then
    echo "Error: Google Chrome not found at $CHROME_PATH"
    echo "Please install Google Chrome or update the CHROME_PATH in this script"
    exit 1
fi

# Open in kiosk mode (fullscreen, no browser UI)
"$CHROME_PATH" --kiosk --app="$DASHBOARD_URL" &

echo "Monitor screen opened in kiosk mode"
echo "Press Alt+F4 (or Cmd+Q) to exit"

