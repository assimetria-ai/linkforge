#!/usr/bin/env bash
# testing/@system/qa-framework/scripts/run-qa.sh
#
# Wrapper around qa-runner.js with sensible defaults.
# Visual regression is skipped by default (baselines rarely available).
#
# Usage:
#   bash testing/@system/qa-framework/scripts/run-qa.sh <product-slug> <deployed-url> [options]
#
# Options (passed through to qa-runner.js):
#   --skip-visual       Skip visual regression (default: ON)
#   --skip-ui           Skip Playwright browser checks
#   --no-skip-visual    Re-enable visual regression if baselines exist
#   --timeout <ms>      Per-check timeout (default: 60000)
#   --output <path>     Write JSON report to file/directory
#
# Environment variables:
#   QA_REPORTS_DIR      Where to write JSON reports (default: ./qa-reports/)
#   QA_TIMEOUT_MS       Per-check timeout in ms (default: 60000)
#
# Exit codes:
#   0   All checks passed
#   1   One or more checks failed
#   2   Fatal error (bad args, node not found, etc.)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../.." && pwd)"
QA_RUNNER="${SCRIPT_DIR}/../qa-runner.js"

# ── Usage ────────────────────────────────────────────────────────────────────
usage() {
  echo ""
  echo "  Usage:    bash $0 <product-slug> <deployed-url> [options]"
  echo ""
  echo "  Examples:"
  echo "    bash $0 unosend https://unosend.up.railway.app"
  echo "    bash $0 planora https://planora.up.railway.app --skip-ui"
  echo "    bash $0 unosend https://... --no-skip-visual --output ./reports/"
  echo ""
  exit 2
}

if [ $# -lt 2 ]; then
  usage
fi

PRODUCT_SLUG="$1"
DEPLOYED_URL="$2"
shift 2

# ── Defaults ─────────────────────────────────────────────────────────────────
TIMEOUT_MS="${QA_TIMEOUT_MS:-60000}"
QA_REPORTS_DIR="${QA_REPORTS_DIR:-${REPO_ROOT}/qa-reports}"

# Visual regression skipped by default — baselines are rarely committed
SKIP_VISUAL=1
HAS_OUTPUT=0
RUNNER_FLAGS=()

# ── Parse remaining flags ─────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --no-skip-visual)
      SKIP_VISUAL=0
      shift
      ;;
    --skip-visual)
      SKIP_VISUAL=1
      shift
      ;;
    --timeout)
      TIMEOUT_MS="$2"
      shift 2
      ;;
    --output)
      HAS_OUTPUT=1
      RUNNER_FLAGS+=(--output "$2")
      shift 2
      ;;
    *)
      RUNNER_FLAGS+=("$1")
      shift
      ;;
  esac
done

# ── Apply defaults to runner flags ────────────────────────────────────────────
RUNNER_FLAGS+=(--timeout "${TIMEOUT_MS}")
[ "${SKIP_VISUAL}" = "1" ] && RUNNER_FLAGS+=(--skip-visual)
[ "${HAS_OUTPUT}" = "0" ] && RUNNER_FLAGS+=(--output "${QA_REPORTS_DIR}")

# ── Create output directory if needed ────────────────────────────────────────
mkdir -p "${QA_REPORTS_DIR}"

# ── Verify Node.js ────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "[qa] ERROR: node not found — please install Node.js 18+" >&2
  exit 2
fi

NODE_MAJOR="$(node -e 'process.stdout.write(String(process.version.match(/^v(\d+)/)[1]))')"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "[qa] ERROR: Node.js 18+ required (found: $(node --version))" >&2
  exit 2
fi

# ── Verify qa-runner.js exists ────────────────────────────────────────────────
if [ ! -f "${QA_RUNNER}" ]; then
  echo "[qa] ERROR: qa-runner.js not found at: ${QA_RUNNER}" >&2
  exit 2
fi

# ── Run ───────────────────────────────────────────────────────────────────────
echo "[qa] product:  ${PRODUCT_SLUG}"
echo "[qa] url:      ${DEPLOYED_URL}"
echo "[qa] reports:  ${QA_REPORTS_DIR}"
echo "[qa] timeout:  ${TIMEOUT_MS}ms"
[ "${SKIP_VISUAL}" = "1" ] && echo "[qa] visual regression: skipped (pass --no-skip-visual to enable)"
echo ""

set +e
node "${QA_RUNNER}" "${PRODUCT_SLUG}" "${DEPLOYED_URL}" "${RUNNER_FLAGS[@]}"
EXIT_CODE=$?
set -e

echo ""
if [ "${EXIT_CODE}" = "0" ]; then
  echo "[qa] PASSED: ${PRODUCT_SLUG}"
elif [ "${EXIT_CODE}" = "1" ]; then
  echo "[qa] FAILED: ${PRODUCT_SLUG}" >&2
else
  echo "[qa] FATAL: runner exited with code ${EXIT_CODE}" >&2
fi

exit "${EXIT_CODE}"
