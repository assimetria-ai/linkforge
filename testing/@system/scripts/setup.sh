#!/usr/bin/env bash
# @system/testing — Setup Script
# Installs test dependencies and Playwright browsers.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== @system/testing — Setup ==="

# Install server test dependencies
echo "→ Installing Jest & supertest..."
cd "$ROOT_DIR/server"
npm install --save-dev \
  jest@^29 \
  supertest@^6 \
  @types/jest@^29 \
  @types/supertest@^6 2>/dev/null || true

# Install Playwright
echo "→ Installing Playwright..."
cd "$ROOT_DIR"
npm install --save-dev \
  @playwright/test@^1 2>/dev/null || true

# Install Playwright browsers (Chromium only for speed)
echo "→ Installing Playwright browsers..."
npx playwright install chromium

# Create screenshot directories
echo "→ Creating screenshot directories..."
mkdir -p "$ROOT_DIR/testing/screenshots/baseline"
mkdir -p "$ROOT_DIR/testing/screenshots/current"
mkdir -p "$ROOT_DIR/testing/screenshots/diff"

# Create @custom test directories if they don't exist
mkdir -p "$ROOT_DIR/server/test/unit/@custom"
mkdir -p "$ROOT_DIR/server/test/api/@custom"
mkdir -p "$ROOT_DIR/e2e/@custom"

# Add .gitkeep files
for dir in "$ROOT_DIR/server/test/unit/@custom" "$ROOT_DIR/server/test/api/@custom" "$ROOT_DIR/e2e/@custom"; do
  [ -f "$dir/.gitkeep" ] || touch "$dir/.gitkeep"
done

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Start test services: docker compose -f testing/@system/ci/docker-compose.test.yml up -d"
echo "  2. Seed test DB: bash testing/@system/scripts/seed-db.sh"
echo "  3. Run tests: bash testing/@system/scripts/run-all.sh"
