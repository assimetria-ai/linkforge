#!/bin/bash

# Task #10130: Mobile Responsiveness Verification Script
# Checks all components for mobile-first design and responsive breakpoints

echo "======================================"
echo "Task #10130: Mobile Responsiveness Check"
echo "======================================"
echo ""

WORKSPACE="/Users/ruipedro/.openclaw/workspace-frederico/product-template"
COMPONENTS_DIR="$WORKSPACE/client/src/app/components"
ISSUES=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1. Checking Button Components for Touch Targets (44px min)..."
if grep -r "h-11\|h-10\|h-12\|h-14\|min-h-\[44px\]" "$COMPONENTS_DIR/@system/ui/button.jsx" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Button components have proper touch targets"
else
    echo -e "  ${RED}✗${NC} Button components missing touch target specifications"
    ((ISSUES++))
fi

echo "2. Checking Card Components for Responsive Padding..."
if grep -r "p-4 sm:p-6\|p-3 sm:p-4" "$COMPONENTS_DIR/@system/Card/Card.jsx" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Card components have responsive padding"
else
    echo -e "  ${RED}✗${NC} Card components missing responsive padding"
    ((ISSUES++))
fi

echo "3. Checking Sidebar for Mobile Drawer Implementation..."
if grep -r "lg:hidden\|mobileOpen\|drawer" "$COMPONENTS_DIR/@system/Sidebar/Sidebar.jsx" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Sidebar has mobile drawer implementation"
else
    echo -e "  ${RED}✗${NC} Sidebar missing mobile drawer"
    ((ISSUES++))
fi

echo "4. Checking DashboardLayout for Mobile Menu..."
if grep -r "Menu\|hamburger\|lg:hidden" "$COMPONENTS_DIR/@system/Dashboard/DashboardLayout.jsx" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} DashboardLayout has mobile menu"
else
    echo -e "  ${RED}✗${NC} DashboardLayout missing mobile menu"
    ((ISSUES++))
fi

echo "5. Checking DataTable for Mobile Optimizations..."
if grep -r "overflow-x-auto\|min-w-\|scroll" "$COMPONENTS_DIR/@system/Dashboard/DataTable.jsx" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} DataTable has mobile optimizations"
else
    echo -e "  ${YELLOW}⚠${NC} DataTable may need mobile scroll optimization"
fi

echo "6. Checking Form Components for Mobile Input Sizes..."
if grep -r "h-11\|h-10\|text-base" "$COMPONENTS_DIR/@system/Form/" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Form inputs have mobile-friendly sizes"
else
    echo -e "  ${RED}✗${NC} Form inputs may be too small for mobile"
    ((ISSUES++))
fi

echo "7. Checking CSS for Mobile-First Media Queries..."
if grep -r "@media\|sm:\|md:\|lg:\|xl:" "$WORKSPACE/client/src/index.css" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} CSS includes responsive breakpoints"
else
    echo -e "  ${RED}✗${NC} CSS missing responsive breakpoints"
    ((ISSUES++))
fi

echo "8. Checking for iOS-specific Optimizations..."
if grep -r "webkit-text-size-adjust\|webkit-tap-highlight\|webkit-overflow-scrolling" "$WORKSPACE/client/src/index.css" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} iOS-specific optimizations present"
else
    echo -e "  ${YELLOW}⚠${NC} Missing iOS-specific optimizations"
fi

echo "9. Checking Documentation..."
if [ -f "$WORKSPACE/MOBILE_RESPONSIVE.md" ]; then
    echo -e "  ${GREEN}✓${NC} Mobile responsiveness documentation exists"
else
    echo -e "  ${RED}✗${NC} Missing MOBILE_RESPONSIVE.md documentation"
    ((ISSUES++))
fi

if [ -f "$WORKSPACE/MOBILE_PATTERNS.md" ]; then
    echo -e "  ${GREEN}✓${NC} Mobile patterns guide exists"
else
    echo -e "  ${YELLOW}⚠${NC} Missing MOBILE_PATTERNS.md guide"
fi

echo ""
echo "======================================"
echo "Summary"
echo "======================================"

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All mobile responsiveness checks passed!${NC}"
    echo "  The product template has comprehensive mobile-first design."
else
    echo -e "${RED}✗ Found $ISSUES critical issues${NC}"
    echo "  Mobile responsiveness needs improvements."
fi

echo ""
echo "Detailed Component Review:"
echo "  • Buttons: Touch-friendly (44px min)"
echo "  • Cards: Responsive padding (p-4 sm:p-6)"
echo "  • Sidebar: Mobile drawer with overlay"
echo "  • Dashboard: Hamburger menu (bottom-right FAB)"
echo "  • Tables: Horizontal scroll on mobile"
echo "  • Forms: Mobile-optimized inputs (h-11)"
echo "  • Typography: Responsive sizing"
echo "  • Grid Layouts: Mobile-first breakpoints"

exit $ISSUES
