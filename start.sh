#!/bin/sh
echo "Starting Holytron DM-640 (TempleOS)..."

open_browser() {
  (sleep 1 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null)) &
}

if command -v python3 >/dev/null 2>&1; then
    open_browser
    python3 -m http.server 3000
elif command -v python >/dev/null 2>&1; then
    open_browser
    python -m http.server 3000
elif command -v npx >/dev/null 2>&1; then
    open_browser
    npx serve -l 3000
else
    echo "Could not find Python or Node.js installed to start a local server."
    echo "Please install Python (python.org) or Node.js (nodejs.org)."
    exit 1
fi
