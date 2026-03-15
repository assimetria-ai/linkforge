#!/usr/bin/env bash
# @system/testing — Seed Test Database
# Seeds the test DB with migrations + default test data.
# Requires: docker compose services running (postgres-test on port 5433)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "=== @system/testing — Seed DB ==="

export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://test:test@localhost:5433/test}"

# Wait for PostgreSQL to be ready
echo "→ Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if pg_isready -h localhost -p 5433 -U test >/dev/null 2>&1; then
    echo "  PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "  ERROR: PostgreSQL not ready after 30s. Is docker compose running?"
    echo "  Run: docker compose -f testing/@system/ci/docker-compose.test.yml up -d"
    exit 1
  fi
  sleep 1
done

# Run migrations
MIGRATIONS_DIR="$ROOT_DIR/server/src/db/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  echo "→ Running migrations..."
  for f in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    echo "  Applying $(basename "$f")..."
    PGPASSWORD=test psql -h localhost -p 5433 -U test -d test -f "$f" -q 2>/dev/null || true
  done
  echo "  Migrations complete."
else
  echo "→ No migrations directory found at $MIGRATIONS_DIR — skipping."
fi

# Seed test users via Node helper
echo "→ Seeding test data..."
cd "$ROOT_DIR"
node -e "
const { createTestDb, seedTestData, closeTestDb } = require('./testing/@system/helpers/db-seed');
(async () => {
  const db = createTestDb();
  try {
    await seedTestData(db, { users: true, teams: true });
    console.log('  Test data seeded successfully.');
  } catch (err) {
    console.error('  Seed error:', err.message);
    process.exitCode = 1;
  } finally {
    await closeTestDb(db);
  }
})();
"

echo "=== Seed complete ==="
