#!/usr/bin/env bash
# @system/testing — Run Full Test Suite
# Runs unit tests, API tests, and E2E tests in sequence.
# Exit code is non-zero if any suite fails.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$ROOT_DIR"

FAILED=0

echo "========================================"
echo " @system/testing — Full Test Suite"
echo "========================================"
echo ""

# 1. Unit tests
echo "--- Unit Tests ---"
if npx jest --project unit --passWithNoTests 2>&1; then
  echo "✓ Unit tests passed"
else
  echo "✗ Unit tests failed"
  FAILED=1
fi
echo ""

# 2. API tests
echo "--- API Tests ---"
if npx jest --project api --passWithNoTests 2>&1; then
  echo "✓ API tests passed"
else
  echo "✗ API tests failed"
  FAILED=1
fi
echo ""

# 3. E2E tests (Playwright)
echo "--- E2E Tests ---"
if npx playwright test --project chromium 2>&1; then
  echo "✓ E2E tests passed"
else
  echo "✗ E2E tests failed"
  FAILED=1
fi
echo ""

echo "========================================"
if [ "$FAILED" -eq 0 ]; then
  echo " All test suites passed ✓"
else
  echo " Some test suites failed ✗"
fi
echo "========================================"

exit $FAILED
