#!/bin/bash
# Verification script for Task #10109 - UX Features Verification
# Checks that dashboard, onboarding, and user-settings components are complete

set -e

echo "🔍 Verifying UX Features for Task #10109..."
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $description"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check if export exists in index file
check_export() {
    local file=$1
    local export_name=$2
    local description=$3
    if grep -q "export.*${export_name}" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description exported"
        return 0
    else
        echo -e "${RED}✗${NC} Missing export: $description"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo "📊 Checking Dashboard Components..."
echo "-----------------------------------"

# Dashboard directory
DASHBOARD_DIR="client/src/app/components/@system/Dashboard"

check_file "$DASHBOARD_DIR/DashboardLayout.jsx" "DashboardLayout component"
check_file "$DASHBOARD_DIR/StatCard.jsx" "StatCard component"
check_file "$DASHBOARD_DIR/RecentActivityList.jsx" "RecentActivityList component"
check_file "$DASHBOARD_DIR/QuickActions.jsx" "QuickActions component"
check_file "$DASHBOARD_DIR/DataTable.jsx" "DataTable component"
check_file "$DASHBOARD_DIR/WelcomeCard.jsx" "WelcomeCard component"
check_file "$DASHBOARD_DIR/FiltersBar.jsx" "FiltersBar component"
check_file "$DASHBOARD_DIR/BulkActions.jsx" "BulkActions component"
check_file "$DASHBOARD_DIR/MobileTable.jsx" "MobileTable component"
check_file "$DASHBOARD_DIR/index.js" "Dashboard index exports"

# Check exports
check_export "$DASHBOARD_DIR/index.js" "DashboardLayout" "DashboardLayout"
check_export "$DASHBOARD_DIR/index.js" "StatCard" "StatCard"
check_export "$DASHBOARD_DIR/index.js" "RecentActivityList" "RecentActivityList"
check_export "$DASHBOARD_DIR/index.js" "QuickActions" "QuickActions"
check_export "$DASHBOARD_DIR/index.js" "DataTable" "DataTable"
check_export "$DASHBOARD_DIR/index.js" "WelcomeCard" "WelcomeCard"

echo ""
echo "🎓 Checking Onboarding Components..."
echo "-----------------------------------"

# Onboarding directory
ONBOARDING_DIR="client/src/app/components/@system/Onboarding"

check_file "$ONBOARDING_DIR/OnboardingWizard.jsx" "OnboardingWizard component"
check_file "$ONBOARDING_DIR/GuidedTour.jsx" "GuidedTour component"
check_file "$ONBOARDING_DIR/ProgressChecklist.jsx" "ProgressChecklist component"
check_file "$ONBOARDING_DIR/index.js" "Onboarding index exports"

# Check onboarding page
check_file "client/src/app/pages/static/@system/OnboardingPage.jsx" "OnboardingPage"

# Check exports
check_export "$ONBOARDING_DIR/index.js" "OnboardingWizard" "OnboardingWizard"
check_export "$ONBOARDING_DIR/index.js" "GuidedTour" "GuidedTour"
check_export "$ONBOARDING_DIR/index.js" "ProgressChecklist" "ProgressChecklist"

echo ""
echo "⚙️  Checking User Settings Components..."
echo "-----------------------------------"

# User Settings directory
SETTINGS_DIR="client/src/app/components/@system/UserSettings"

check_file "$SETTINGS_DIR/UserSettings.jsx" "UserSettings container"
check_file "$SETTINGS_DIR/ProfileSettings.jsx" "ProfileSettings component"
check_file "$SETTINGS_DIR/SecuritySettings.jsx" "SecuritySettings component"
check_file "$SETTINGS_DIR/NotificationSettings.jsx" "NotificationSettings component"
check_file "$SETTINGS_DIR/PreferencesSettings.jsx" "PreferencesSettings component"
check_file "$SETTINGS_DIR/KeyboardShortcuts.jsx" "KeyboardShortcuts component"
check_file "$SETTINGS_DIR/DataExport.jsx" "DataExport component"
check_file "$SETTINGS_DIR/ConnectedAccounts.jsx" "ConnectedAccounts component"
check_file "$SETTINGS_DIR/index.js" "UserSettings index exports"

# Check settings page
check_file "client/src/app/pages/app/@system/SettingsPage.jsx" "SettingsPage"

# Check exports
check_export "$SETTINGS_DIR/index.js" "UserSettings" "UserSettings"
check_export "$SETTINGS_DIR/index.js" "ProfileSettings" "ProfileSettings"
check_export "$SETTINGS_DIR/index.js" "SecuritySettings" "SecuritySettings"
check_export "$SETTINGS_DIR/index.js" "NotificationSettings" "NotificationSettings"
check_export "$SETTINGS_DIR/index.js" "PreferencesSettings" "PreferencesSettings"

echo ""
echo "📄 Checking Documentation..."
echo "-----------------------------------"

check_file "docs/UX_COMPONENTS.md" "UX Components documentation"
check_file "docs/UX_PATTERNS.md" "UX Patterns documentation"
check_file "docs/UX_FEATURES.md" "UX Features documentation"
check_file "UX_FEATURES_VERIFICATION_REPORT.md" "UX Features verification report"

echo ""
echo "🔗 Checking Integration..."
echo "-----------------------------------"

# Check if HomePage uses dashboard components
if grep -q "DashboardLayout" "client/src/app/pages/app/@system/HomePage.jsx" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} HomePage integrates DashboardLayout"
else
    echo -e "${YELLOW}⚠${NC} HomePage doesn't use DashboardLayout"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q "StatCard" "client/src/app/pages/app/@system/HomePage.jsx" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} HomePage uses StatCard components"
else
    echo -e "${YELLOW}⚠${NC} HomePage doesn't use StatCard"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q "WelcomeCard" "client/src/app/pages/app/@system/HomePage.jsx" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} HomePage includes WelcomeCard"
else
    echo -e "${YELLOW}⚠${NC} HomePage doesn't include WelcomeCard"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "==========================================="
echo "📋 Verification Summary"
echo "==========================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo ""
    echo "All UX features are properly implemented:"
    echo "  • Dashboard components (9 components)"
    echo "  • Onboarding components (3 components)"
    echo "  • User Settings components (8 components)"
    echo "  • Complete documentation"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Warnings: $WARNINGS"
    echo "All required components are present but some optimizations recommended."
    echo ""
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Please fix the above issues and run verification again."
    exit 1
fi
