#!/bin/sh
# wait-for-grid.sh - Wait for Selenium Grid to be ready

set -e

GRID_URL="${1:-http://selenium-hub:4444}"
MAX_ATTEMPTS=30
ATTEMPT=0

echo "Waiting for Selenium Grid at $GRID_URL..."

until $(curl --output /dev/null --silent --head --fail "$GRID_URL/wd/hub/status"); do
    ATTEMPT=$((ATTEMPT+1))
    if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
        echo "Grid did not become ready in time"
        exit 1
    fi
    printf '.'
    sleep 1
done

echo ""
echo "Selenium Grid is ready!"
exit 0
