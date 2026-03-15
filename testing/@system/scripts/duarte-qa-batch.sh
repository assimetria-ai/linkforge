#!/usr/bin/env bash
# @system/scripts/duarte-qa-batch.sh
#
# Automated batch QA runner for Duarte agent.
# Queries all deployed products from the DB and runs qa-framework on each.
#
# Usage:
#   bash testing/@system/scripts/duarte-qa-batch.sh [tier]
#
# Tiers:
#   smoke    — preflight + api only, skip UI/visual (~30s total)
#   standard — all checks including UI/visual (~2-5min total)
#   quick    — skip UI/visual, shorter timeouts (~1min total)  [default]
#
# Environment:
#   PSQL               psql binary path (auto-detected)
#   QA_REPORTS_DIR     where to write JSON reports
#   QA_TELEGRAM_TOKEN  Telegram bot token for sending results
#   QA_CHAT_ID         Telegram chat ID (default: 365117590)
#
# Exit codes:
#   0  All products passed
#   1  One or more products had failures
#   2  Fatal error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
QA_RUNNER="${REPO_ROOT}/testing/@system/qa-framework/qa-runner.js"

# ── Config ───────────────────────────────────────────────────────────────────
TIER="${1:-quick}"
PSQL="${PSQL:-/opt/homebrew/opt/postgresql@16/bin/psql}"
DB_NAME="${DB_NAME:-assimetria_os}"
DB_USER="${DB_USER:-ruipedro}"
QA_REPORTS_DIR="${QA_REPORTS_DIR:-${REPO_ROOT}/qa-reports}"
QA_CHAT_ID="${QA_CHAT_ID:-365117590}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

# Tier-specific settings
case "$TIER" in
  smoke)
    TIMEOUT=15000
    EXTRA_FLAGS="--skip-ui --skip-visual"
    ;;
  quick)
    TIMEOUT=30000
    EXTRA_FLAGS="--skip-ui --skip-visual"
    ;;
  standard)
    TIMEOUT=60000
    EXTRA_FLAGS=""
    ;;
  *)
    echo "Unknown tier: $TIER (use: smoke, quick, standard)"
    exit 2
    ;;
esac

# ── Colour helpers ───────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  RED="$(tput setaf 1)"; GREEN="$(tput setaf 2)"; YELLOW="$(tput setaf 3)"
  CYAN="$(tput setaf 6)"; BOLD="$(tput bold)"; RESET="$(tput sgr0)"
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; BOLD=''; RESET=''
fi

log_info()    { echo "${CYAN}[duarte-qa]${RESET} $*"; }
log_ok()      { echo "${GREEN}[duarte-qa] ✓${RESET} $*"; }
log_fail()    { echo "${RED}[duarte-qa] ✗${RESET} $*"; }
log_warn()    { echo "${YELLOW}[duarte-qa] ⚠${RESET} $*"; }

# ── Verify prerequisites ────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found"; exit 2
fi
if [ ! -f "$QA_RUNNER" ]; then
  echo "ERROR: qa-runner.js not found at $QA_RUNNER"; exit 2
fi

# ── Query deployed products from DB ─────────────────────────────────────────
log_info "Querying deployed products from DB..."

PRODUCTS=$($PSQL -h localhost -U "$DB_USER" "$DB_NAME" -t -A -F '|' -c \
  "SELECT slug, railway_url FROM products
   WHERE type NOT IN ('internal', 'template', 'competitor')
     AND railway_url IS NOT NULL AND railway_url != ''
     AND slug != 'assimetria-os'
   ORDER BY slug ASC;" 2>/dev/null || echo "")

if [ -z "$PRODUCTS" ]; then
  log_warn "No deployed products found in DB"
  exit 0
fi

PRODUCT_COUNT=$(echo "$PRODUCTS" | wc -l | tr -d ' ')
log_info "Found $PRODUCT_COUNT deployed products (tier=$TIER, timeout=${TIMEOUT}ms)"
echo ""

# ── Create reports directory ─────────────────────────────────────────────────
BATCH_REPORT_DIR="${QA_REPORTS_DIR}/batch-${TIMESTAMP}"
mkdir -p "$BATCH_REPORT_DIR"

# ── Run QA on each product ──────────────────────────────────────────────────
PASSED=0
FAILED=0
WARNED=0
ERRORS=0
RESULTS=""
TOTAL_START=$(date +%s)

while IFS='|' read -r SLUG URL; do
  [ -z "$SLUG" ] && continue
  [ -z "$URL" ] && continue

  PRODUCT_START=$(date +%s)
  log_info "Testing: $SLUG → $URL"

  set +e
  OUTPUT=$(cd "$REPO_ROOT" && node "$QA_RUNNER" "$SLUG" "$URL" \
    --timeout "$TIMEOUT" \
    --output "$BATCH_REPORT_DIR" \
    $EXTRA_FLAGS 2>&1)
  EXIT_CODE=$?
  set -e

  PRODUCT_END=$(date +%s)
  PRODUCT_ELAPSED=$(( PRODUCT_END - PRODUCT_START ))

  # Use exit code to determine status (more reliable than JSON parsing):
  #   0 = pass, 1 = fail/warning, 2 = fatal error
  # Also try to extract overall_status from JSON for finer detail
  OVERALL_STATUS=$(echo "$OUTPUT" | grep -oE '"overall_status"\s*:\s*"[^"]*"' | head -1 | sed 's/.*"overall_status"\s*:\s*"//' | sed 's/"$//' || echo "")

  if [ "$EXIT_CODE" -eq 0 ]; then
    log_ok "$SLUG — PASS (${PRODUCT_ELAPSED}s)"
    PASSED=$((PASSED + 1))
    RESULTS="${RESULTS}✅ ${SLUG} (${PRODUCT_ELAPSED}s)\n"
  elif [ "$EXIT_CODE" -eq 2 ]; then
    log_fail "$SLUG — FATAL ERROR (${PRODUCT_ELAPSED}s)"
    ERRORS=$((ERRORS + 1))
    RESULTS="${RESULTS}💥 ${SLUG} (${PRODUCT_ELAPSED}s): fatal error\n"
  elif [ "$OVERALL_STATUS" = "warning" ]; then
    log_warn "$SLUG — WARNING (${PRODUCT_ELAPSED}s)"
    WARNED=$((WARNED + 1))
    RESULTS="${RESULTS}⚠️ ${SLUG} (${PRODUCT_ELAPSED}s)\n"
  else
    # exit 1 = fail
    log_fail "$SLUG — FAIL (${PRODUCT_ELAPSED}s)"
    FAILED=$((FAILED + 1))
    # Extract first error from JSON
    FIRST_ERROR=$(echo "$OUTPUT" | grep -oE '"errors"\s*:\s*\[\s*"[^"]*"' | head -1 | sed 's/.*\["//' | sed 's/"$//' | head -c 100 || echo "")
    if [ -n "$FIRST_ERROR" ]; then
      RESULTS="${RESULTS}❌ ${SLUG} (${PRODUCT_ELAPSED}s): ${FIRST_ERROR}\n"
    else
      RESULTS="${RESULTS}❌ ${SLUG} (${PRODUCT_ELAPSED}s)\n"
    fi
  fi

  echo ""
done <<< "$PRODUCTS"

TOTAL_END=$(date +%s)
TOTAL_ELAPSED=$(( TOTAL_END - TOTAL_START ))

# ── Summary ──────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════════"
echo "  ${BOLD}BATCH QA SUMMARY${RESET}  (tier=$TIER, ${TOTAL_ELAPSED}s total)"
echo "────────────────────────────────────────────────────────────────────"
echo -e "$RESULTS"
echo "────────────────────────────────────────────────────────────────────"
echo "  Products: $PRODUCT_COUNT | Pass: $PASSED | Warn: $WARNED | Fail: $FAILED | Error: $ERRORS"
echo "  Reports:  $BATCH_REPORT_DIR"
echo "════════════════════════════════════════════════════════════════════"

# ── Write batch summary JSON ─────────────────────────────────────────────────
cat > "$BATCH_REPORT_DIR/batch-summary.json" <<EOJSON
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "tier": "$TIER",
  "duration_s": $TOTAL_ELAPSED,
  "products_tested": $PRODUCT_COUNT,
  "passed": $PASSED,
  "warned": $WARNED,
  "failed": $FAILED,
  "errors": $ERRORS,
  "overall": "$([ $FAILED -eq 0 ] && [ $ERRORS -eq 0 ] && echo "pass" || echo "fail")"
}
EOJSON

# ── Exit code ────────────────────────────────────────────────────────────────
if [ $FAILED -gt 0 ] || [ $ERRORS -gt 0 ]; then
  exit 1
else
  exit 0
fi
