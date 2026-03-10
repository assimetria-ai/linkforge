#!/bin/bash
# Verification script for Task #10254 - UX Features Integration

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Task #10254 - UX Features Verification               ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((passed++))
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    ((failed++))
  fi
}

check_component_export() {
  if grep -q "$2" "$1"; then
    echo -e "${GREEN}✓${NC} $3"
    ((passed++))
  else
    echo -e "${RED}✗${NC} $3 (NOT EXPORTED)"
    ((failed++))
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. DASHBOARD COMPONENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "client/src/app/components/@system/Dashboard/DashboardLayout.jsx"
check_file "client/src/app/components/@system/Dashboard/StatCard.jsx"
check_file "client/src/app/components/@system/Dashboard/RecentActivityList.jsx"
check_file "client/src/app/components/@system/Dashboard/QuickActions.jsx"
check_file "client/src/app/components/@system/Dashboard/DataTable.jsx"
check_file "client/src/app/components/@system/Dashboard/WelcomeCard.jsx"
check_file "client/src/app/components/@system/Dashboard/FiltersBar.jsx"
check_file "client/src/app/components/@system/Dashboard/BulkActions.jsx"
check_file "client/src/app/components/@system/Dashboard/MobileTable.jsx"
check_file "client/src/app/components/@system/Dashboard/index.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. ONBOARDING COMPONENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "client/src/app/components/@system/OnboardingWizard/OnboardingWizard.jsx"
check_file "client/src/app/components/@system/Onboarding/OnboardingWizard.jsx"
check_file "client/src/app/components/@system/Onboarding/GuidedTour.jsx"
check_file "client/src/app/components/@system/Onboarding/ProgressChecklist.jsx"
check_file "client/src/app/components/@system/Onboarding/index.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. USER SETTINGS COMPONENTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "client/src/app/components/@system/UserSettings/UserSettings.jsx"
check_file "client/src/app/components/@system/UserSettings/ProfileSettings.jsx"
check_file "client/src/app/components/@system/UserSettings/SecuritySettings.jsx"
check_file "client/src/app/components/@system/UserSettings/NotificationSettings.jsx"
check_file "client/src/app/components/@system/UserSettings/PreferencesSettings.jsx"
check_file "client/src/app/components/@system/UserSettings/ConnectedAccounts.jsx"
check_file "client/src/app/components/@system/UserSettings/DataExport.jsx"
check_file "client/src/app/components/@system/UserSettings/KeyboardShortcuts.jsx"
check_file "client/src/app/components/@system/UserSettings/index.js"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. PAGES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "client/src/app/pages/app/@system/HomePage.jsx"
check_file "client/src/app/pages/static/@system/OnboardingPage.jsx"
check_file "client/src/app/pages/app/@system/SettingsPage.tsx"
check_file "client/src/app/pages/app/@system/UXDemoPage.jsx"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. ROUTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "client/src/app/routes/@system/AppRoutes.jsx"

if grep -q "UXDemoPage" "client/src/app/routes/@system/AppRoutes.jsx"; then
  echo -e "${GREEN}✓${NC} UXDemoPage route registered"
  ((passed++))
else
  echo -e "${RED}✗${NC} UXDemoPage route NOT registered"
  ((failed++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. DOCUMENTATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_file "docs/UX_FEATURES_IMPLEMENTATION.md"
check_file "UX_COMPONENTS_GUIDE.md"
check_file ".task-10254-completion-report.md"
check_file ".task-10254-summary-for-frederico.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. COMPONENT EXPORTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MAIN_INDEX="client/src/app/components/@system/index.js"
check_component_export "$MAIN_INDEX" "DashboardLayout" "DashboardLayout export"
check_component_export "$MAIN_INDEX" "StatCard" "StatCard export"
check_component_export "$MAIN_INDEX" "RecentActivityList" "RecentActivityList export"
check_component_export "$MAIN_INDEX" "UserSettings" "UserSettings export"
check_component_export "$MAIN_INDEX" "OnboardingWizard" "OnboardingWizard export"
check_component_export "$MAIN_INDEX" "GuidedTour" "GuidedTour export"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. SETTINGS PAGE INTEGRATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SETTINGS_PAGE="client/src/app/pages/app/@system/SettingsPage.tsx"
if grep -q "import.*UserSettings.*from.*UserSettings" "$SETTINGS_PAGE"; then
  echo -e "${GREEN}✓${NC} SettingsPage imports UserSettings component"
  ((passed++))
else
  echo -e "${RED}✗${NC} SettingsPage does NOT import UserSettings component"
  ((failed++))
fi

if grep -q "<UserSettings" "$SETTINGS_PAGE"; then
  echo -e "${GREEN}✓${NC} SettingsPage uses UserSettings component"
  ((passed++))
else
  echo -e "${RED}✗${NC} SettingsPage does NOT use UserSettings component"
  ((failed++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9. GIT COMMIT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if git log -1 --pretty=%B | grep -q "task #10254"; then
  echo -e "${GREEN}✓${NC} Commit includes task #10254 reference"
  ((passed++))
else
  echo -e "${RED}✗${NC} Commit does NOT include task #10254 reference"
  ((failed++))
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  VERIFICATION SUMMARY                                  ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
  echo ""
  echo "Task #10254 has been successfully completed!"
  echo ""
  echo "Next steps:"
  echo "  • Visit /app/settings to see the updated Settings page"
  echo "  • Visit /app/ux-demo for component showcase"
  echo "  • Read docs/UX_FEATURES_IMPLEMENTATION.md for documentation"
  exit 0
else
  echo -e "${RED}✗ SOME CHECKS FAILED${NC}"
  echo ""
  echo "Please review the failures above and fix them."
  exit 1
fi
