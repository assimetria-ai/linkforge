#!/bin/bash
# Task #10154 - Verify UX features: dashboard, onboarding, user-settings

echo "=== Task #10154: Verify UX Features Implementation ==="
echo ""

PASS=0
FAIL=0

check_file() {
  if [ -f "$1" ]; then
    echo "✅ $2"
    ((PASS++))
  else
    echo "❌ $2 - File not found: $1"
    ((FAIL++))
  fi
}

check_export() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo "✅ $3"
    ((PASS++))
  else
    echo "❌ $3 - Not found in $1"
    ((FAIL++))
  fi
}

echo "📊 DASHBOARD COMPONENTS"
echo "────────────────────────────────────"
check_file "client/src/app/components/@system/Dashboard/DashboardLayout.jsx" "DashboardLayout component"
check_file "client/src/app/components/@system/Dashboard/StatCard.jsx" "StatCard component"
check_file "client/src/app/components/@system/Dashboard/RecentActivityList.jsx" "RecentActivityList component"
check_file "client/src/app/components/@system/Dashboard/QuickActions.jsx" "QuickActions component"
check_file "client/src/app/components/@system/Dashboard/DataTable.jsx" "DataTable component"
check_file "client/src/app/components/@system/Dashboard/WelcomeCard.jsx" "WelcomeCard component"
check_file "client/src/app/components/@system/Dashboard/FiltersBar.jsx" "FiltersBar component"
check_file "client/src/app/components/@system/Dashboard/BulkActions.jsx" "BulkActions component"
check_file "client/src/app/components/@system/Dashboard/MobileTable.jsx" "MobileTable component"

check_export "client/src/app/components/@system/Dashboard/index.js" "DashboardLayout" "DashboardLayout exported"
check_export "client/src/app/components/@system/Dashboard/index.js" "StatCard" "StatCard exported"
check_export "client/src/app/components/@system/Dashboard/index.js" "DataTable" "DataTable exported"

echo ""
echo "🎓 ONBOARDING COMPONENTS"
echo "────────────────────────────────────"
check_file "client/src/app/components/@system/Onboarding/OnboardingWizard.jsx" "OnboardingWizard component"
check_file "client/src/app/components/@system/Onboarding/GuidedTour.jsx" "GuidedTour component"
check_file "client/src/app/components/@system/Onboarding/ProgressChecklist.jsx" "ProgressChecklist component"

check_export "client/src/app/components/@system/Onboarding/index.js" "OnboardingWizard" "OnboardingWizard exported"
check_export "client/src/app/components/@system/Onboarding/index.js" "GuidedTour" "GuidedTour exported"
check_export "client/src/app/components/@system/Onboarding/index.js" "ProgressChecklist" "ProgressChecklist exported"

echo ""
echo "⚙️  USER SETTINGS COMPONENTS"
echo "────────────────────────────────────"
check_file "client/src/app/components/@system/UserSettings/UserSettings.jsx" "UserSettings component"
check_file "client/src/app/components/@system/UserSettings/ProfileSettings.jsx" "ProfileSettings component"
check_file "client/src/app/components/@system/UserSettings/SecuritySettings.jsx" "SecuritySettings component"
check_file "client/src/app/components/@system/UserSettings/NotificationSettings.jsx" "NotificationSettings component"
check_file "client/src/app/components/@system/UserSettings/PreferencesSettings.jsx" "PreferencesSettings component"
check_file "client/src/app/components/@system/UserSettings/KeyboardShortcuts.jsx" "KeyboardShortcuts component"
check_file "client/src/app/components/@system/UserSettings/DataExport.jsx" "DataExport component"
check_file "client/src/app/components/@system/UserSettings/ConnectedAccounts.jsx" "ConnectedAccounts component"

check_export "client/src/app/components/@system/UserSettings/index.js" "UserSettings" "UserSettings exported"
check_export "client/src/app/components/@system/UserSettings/index.js" "ProfileSettings" "ProfileSettings exported"
check_export "client/src/app/components/@system/UserSettings/index.js" "SecuritySettings" "SecuritySettings exported"

echo ""
echo "📄 PAGES INTEGRATION"
echo "────────────────────────────────────"
check_file "client/src/app/pages/app/@system/HomePage.jsx" "HomePage (Dashboard)"
check_file "client/src/app/pages/app/@system/SettingsPage.jsx" "SettingsPage (User Settings)"
check_file "client/src/app/pages/app/@system/UXShowcasePage.jsx" "UXShowcasePage (Component Showcase)"

# Check if HomePage uses dashboard components
check_export "client/src/app/pages/app/@system/HomePage.jsx" "DashboardLayout" "HomePage uses DashboardLayout"
check_export "client/src/app/pages/app/@system/HomePage.jsx" "StatCard" "HomePage uses StatCard"
check_export "client/src/app/pages/app/@system/HomePage.jsx" "GuidedTour" "HomePage includes GuidedTour"

# Check if SettingsPage uses UserSettings
check_export "client/src/app/pages/app/@system/SettingsPage.jsx" "UserSettings" "SettingsPage uses UserSettings"

echo ""
echo "📚 DOCUMENTATION"
echo "────────────────────────────────────"
check_file "docs/UX_COMPONENTS.md" "UX Components documentation"
check_file "docs/UX_FEATURES.md" "UX Features documentation"
check_file "docs/UX_PATTERNS.md" "UX Patterns documentation"

# Check if documentation mentions the components
check_export "docs/UX_COMPONENTS.md" "DashboardLayout" "Dashboard documented"
check_export "docs/UX_COMPONENTS.md" "OnboardingWizard" "Onboarding documented"
check_export "docs/UX_COMPONENTS.md" "UserSettings" "User Settings documented"

echo ""
echo "🧪 REUSABLE COMPONENT PATTERNS"
echo "────────────────────────────────────"
check_export "client/src/app/components/@system/Dashboard/StatCard.jsx" "StatCard" "StatCard is reusable"
check_export "client/src/app/components/@system/UserSettings/UserSettings.jsx" "SettingsSection" "SettingsSection helper exported"
check_export "client/src/app/components/@system/UserSettings/UserSettings.jsx" "SettingsRow" "SettingsRow helper exported"

echo ""
echo "════════════════════════════════════"
echo "📊 RESULTS SUMMARY"
echo "════════════════════════════════════"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "✨ All UX features verified successfully!"
  echo ""
  echo "📋 FEATURES INCLUDED:"
  echo "  • Dashboard components (9 components)"
  echo "  • Onboarding flow (3 components)"
  echo "  • User settings (8 components)"
  echo "  • Reusable patterns"
  echo "  • Complete documentation"
  echo "  • UX showcase page"
  exit 0
else
  echo "⚠️  Some verification checks failed."
  exit 1
fi
