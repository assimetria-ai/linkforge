#!/usr/bin/env bash
# @system/scripts/run-qa.sh
#
# Wrapper around qa-runner.js with sensible defaults, coloured output,
# and optional report archiving.
#
# Usage:
#   bash testing/@system/scripts/run-qa.sh <product-slug> <deployed-url> [options]
#
# Options (passed through to qa-runner.js):
#   --skip-visual       Skip visual regression checks
#   --skip-ui           Skip Playwright browser checks
#   --timeout <ms>      Per-check timeout (default: 60000)
#   --output <path>     Write JSON report to file/directory
#
# Environment variables:
#   QA_REPORTS_DIR        Where to write JSON reports (default: ./qa-reports/)
#   QA_SKIP_UI            Set to '1' to always skip UI checks
#   QA_SKIP_VISUAL        Set to '1' to always skip visual regression
#   QA_TIMEOUT_MS         Per-check timeout in ms (default: 60000)
#   PAGE_LOAD_THRESHOLD_MS  Perf threshold: page load (default: 5000)
#   API_THRESHOLD_MS        Perf threshold: API latency (default: 2000)
#   TTFB_THRESHOLD_MS       Perf threshold: TTFB (default: 1000)
#   P95_THRESHOLD_MS        Perf threshold: concurrent p95 (default: 3000)
#   VISUAL_DIFF_THRESHOLD   Fraction of pixels allowed to differ (default: 0.02)
#
# Exit codes:
#   0   All checks passed
#   1   One or more checks failed
#   2   Fatal error (bad args, node not found, etc.)
#
set -euo pipefail

# ── Locate the repo root (two levels above this script's directory) ─────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
QA_RUNNER="${REPO_ROOT}/testing/@system/qa-framework/qa-runner.js"

# ── Colour helpers ───────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput >/dev/null 2>&1; then
  RED="$(tput setaf 1)"
  GREEN="$(tput setaf 2)"
  YELLOW="$(tput setaf 3)"
  CYAN="$(tput setaf 6)"
  BOLD="$(tput bold)"
  RESET="$(tput sgr0)"
else
  RED='' GREEN='' YELLOW='' CYAN='' BOLD='' RESET=''
fi

log_info()    { echo "${CYAN}[qa]${RESET} $*"; }
log_success() { echo "${GREEN}[qa] $*${RESET}"; }
log_warn()    { echo "${YELLOW}[qa] WARNING: $*${RESET}"; }
log_error()   { echo "${RED}[qa] ERROR: $*${RESET}" >&2; }

# ── Argument parsing ─────────────────────────────────────────────────────────
if [ $# -lt 2 ]; then
  echo ""
  echo "  ${BOLD}Usage:${RESET} bash $0 <product-slug> <deployed-url> [options]"
  echo ""
  echo "  ${BOLD}Examples:${RESET}"
  echo "    bash $0 unosend https://unosend.up.railway.app"
  echo "    bash $0 planora https://planora.up.railway.app --skip-visual"
  echo "    bash $0 unosend https://... --skip-ui --output ./reports/"
  echo ""
  exit 2
fi

PRODUCT_SLUG="$1"
DEPLOYED_URL="$2"
shift 2

# Collect pass-through flags
RUNNER_FLAGS=()

# Apply env-var defaults
if [ "${QA_SKIP_UI:-0}" = "1" ]; then
  RUNNER_FLAGS+=(--skip-ui)
fi
if [ "${QA_SKIP_VISUAL:-0}" = "1" ]; then
  RUNNER_FLAGS+=(--skip-visual)
fi
if [ -n "${QA_TIMEOUT_MS:-}" ]; then
  RUNNER_FLAGS+=(--timeout "${QA_TIMEOUT_MS}")
fi

# Append any remaining CLI flags
RUNNER_FLAGS+=("$@")

# ── Resolve output directory ─────────────────────────────────────────────────
QA_REPORTS_DIR="${QA_REPORTS_DIR:-${REPO_ROOT}/qa-reports}"

# Only add --output if not already specified in flags
HAS_OUTPUT=0
for flag in "${RUNNER_FLAGS[@]:-}"; do
  if [ "${flag}" = "--output" ]; then
    HAS_OUTPUT=1
    break
  fi
done

if [ "${HAS_OUTPUT}" = "0" ]; then
  RUNNER_FLAGS+=(--output "${QA_REPORTS_DIR}")
fi

# ── Verify Node.js ───────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  log_error "node not found — please install Node.js 18+"
  exit 2
fi

NODE_MAJOR="$(node -e 'process.stdout.write(String(process.version.match(/^v(\d+)/)[1]))')"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  log_error "Node.js 18+ required (found: $(node --version)) — native fetch not available"
  exit 2
fi

# ── Verify qa-runner.js exists ───────────────────────────────────────────────
if [ ! -f "${QA_RUNNER}" ]; then
  log_error "qa-runner.js not found at: ${QA_RUNNER}"
  exit 2
fi

# ── Print summary ────────────────────────────────────────────────────────────
echo ""
echo "${BOLD}  Assimetria OS — QA Framework${RESET}"
echo "  ─────────────────────────────────────────────────────────────────"
log_info "Product:  ${PRODUCT_SLUG}"
log_info "URL:      ${DEPLOYED_URL}"
log_info "Reports:  ${QA_REPORTS_DIR}"
if [ "${QA_SKIP_UI:-0}" = "1" ] || [[ " ${RUNNER_FLAGS[*]} " =~ " --skip-ui " ]]; then
  log_warn "UI/browser checks skipped (--skip-ui)"
fi
if [ "${QA_SKIP_VISUAL:-0}" = "1" ] || [[ " ${RUNNER_FLAGS[*]} " =~ " --skip-visual " ]]; then
  log_warn "Visual regression checks skipped (--skip-visual)"
fi
echo "  ─────────────────────────────────────────────────────────────────"
echo ""

# ── Run ──────────────────────────────────────────────────────────────────────
START_TIME="$(date +%s)"

set +e
node "${QA_RUNNER}" "${PRODUCT_SLUG}" "${DEPLOYED_URL}" "${RUNNER_FLAGS[@]}"
EXIT_CODE=$?
set -e

END_TIME="$(date +%s)"
ELAPSED=$(( END_TIME - START_TIME ))

echo ""
echo "  ─────────────────────────────────────────────────────────────────"
if [ "${EXIT_CODE}" = "0" ]; then
  log_success "QA passed for ${PRODUCT_SLUG} (${ELAPSED}s)"
elif [ "${EXIT_CODE}" = "1" ]; then
  log_error "QA failed for ${PRODUCT_SLUG} (${ELAPSED}s)"
else
  log_error "QA runner exited with fatal error code ${EXIT_CODE} (${ELAPSED}s)"
fi
echo ""

exit "${EXIT_CODE}"
