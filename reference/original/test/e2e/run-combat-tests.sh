#!/bin/bash

# Run Combat Initiative E2E Tests
# This script starts the Selenium grid and runs the combat initiative tests

set -e

echo "=== Combat Initiative E2E Tests ==="
echo ""

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://deadlands-frontend-production.up.railway.app}"
API_URL="${API_URL:-https://deadlands-campaign-manager-production-053e.up.railway.app/api}"
TAGS="${1:-@combat}"

echo "Target Environment:"
echo "  Frontend: $FRONTEND_URL"
echo "  API:      $API_URL"
echo "  Tags:     $TAGS"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed"
    exit 1
fi

# Start Selenium Grid
echo "Starting Selenium Grid..."
docker-compose up -d selenium-hub chrome-gm chrome-player1 chrome-player2

# Wait for grid to be ready
echo "Waiting for Selenium Grid to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:4444/status | grep -q '"ready": true'; then
        echo "Selenium Grid is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "  Waiting... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "Error: Selenium Grid did not become ready in time"
    docker-compose logs selenium-hub
    docker-compose down
    exit 1
fi

# Run tests
echo ""
echo "Running combat initiative tests..."
echo ""

FRONTEND_URL="$FRONTEND_URL" \
API_URL="$API_URL" \
SELENIUM_HUB_URL="http://localhost:4444" \
npx cucumber-js --tags "$TAGS" features/combat-initiative.feature

test_exit_code=$?

# Cleanup
echo ""
echo "Cleaning up..."
docker-compose down

if [ $test_exit_code -eq 0 ]; then
    echo ""
    echo "=== All tests passed! ==="
else
    echo ""
    echo "=== Some tests failed (exit code: $test_exit_code) ==="
fi

exit $test_exit_code
