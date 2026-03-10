#!/bin/bash

# Task #9977 Mobile Responsiveness Verification Script
# Verifies that all grid layouts in @custom pages have responsive breakpoints

set -e

echo "=================================================="
echo "Task #9977: Mobile Responsiveness Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Test 1: Check for non-responsive grids
echo "Test 1: Checking for non-responsive grid layouts..."
NON_RESPONSIVE=$(grep -r "grid grid-cols-[23]" client/src/app/pages/app/@custom/*.{tsx,jsx} 2>/dev/null | grep -v "sm:\|md:\|lg:" | wc -l | tr -d ' ')

if [ "$NON_RESPONSIVE" -eq 0 ]; then
  echo -e "${GREEN}✓ PASS${NC}: No non-responsive grids found"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: Found $NON_RESPONSIVE non-responsive grids"
  echo "Details:"
  grep -r "grid grid-cols-[23]" client/src/app/pages/app/@custom/*.{tsx,jsx} 2>/dev/null | grep -v "sm:\|md:\|lg:"
  ((FAILED++))
fi
echo ""

# Test 2: Verify CollaboratorsPage stats grid
echo "Test 2: Verifying CollaboratorsPage stats grid..."
if grep -q "grid grid-cols-1 sm:grid-cols-3" client/src/app/pages/app/@custom/CollaboratorsPage.jsx; then
  echo -e "${GREEN}✓ PASS${NC}: CollaboratorsPage stats grid is responsive"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: CollaboratorsPage stats grid is not responsive"
  ((FAILED++))
fi
echo ""

# Test 3: Verify PricingPlansPage modal grids
echo "Test 3: Verifying PricingPlansPage modal form grids..."
PRICING_GRIDS=$(grep -c "grid grid-cols-1 sm:grid-cols-" client/src/app/pages/app/@custom/PricingPlansPage.tsx 2>/dev/null || echo "0")

if [ "$PRICING_GRIDS" -ge 4 ]; then
  echo -e "${GREEN}✓ PASS${NC}: PricingPlansPage has $PRICING_GRIDS responsive grids"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: PricingPlansPage only has $PRICING_GRIDS responsive grids (expected >= 4)"
  ((FAILED++))
fi
echo ""

# Test 4: Verify EmailTrackingPage grid
echo "Test 4: Verifying EmailTrackingPage details grid..."
if grep -q "grid grid-cols-1 sm:grid-cols-2" client/src/app/pages/app/@custom/EmailTrackingPage.jsx; then
  echo -e "${GREEN}✓ PASS${NC}: EmailTrackingPage details grid is responsive"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: EmailTrackingPage details grid is not responsive"
  ((FAILED++))
fi
echo ""

# Test 5: Verify ErrorTrackingPage grid
echo "Test 5: Verifying ErrorTrackingPage metadata grid..."
if grep -q "grid grid-cols-1 sm:grid-cols-2" client/src/app/pages/app/@custom/ErrorTrackingPage.jsx; then
  echo -e "${GREEN}✓ PASS${NC}: ErrorTrackingPage metadata grid is responsive"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: ErrorTrackingPage metadata grid is not responsive"
  ((FAILED++))
fi
echo ""

# Test 6: Verify BlogAdminPage (TypeScript)
echo "Test 6: Verifying BlogAdminPage.tsx form grid..."
if grep -q "grid grid-cols-1 sm:grid-cols-2" client/src/app/pages/app/@custom/BlogAdminPage.tsx; then
  echo -e "${GREEN}✓ PASS${NC}: BlogAdminPage.tsx form grid is responsive"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: BlogAdminPage.tsx form grid is not responsive"
  ((FAILED++))
fi
echo ""

# Test 7: Verify BlogAdminPage (JavaScript)
echo "Test 7: Verifying BlogAdminPage.jsx form grid..."
if grep -q "grid grid-cols-1 sm:grid-cols-2" client/src/app/pages/app/@custom/BlogAdminPage.jsx; then
  echo -e "${GREEN}✓ PASS${NC}: BlogAdminPage.jsx form grid is responsive"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}: BlogAdminPage.jsx form grid is not responsive"
  ((FAILED++))
fi
echo ""

# Test 8: Verify mobile-first pattern usage
echo "Test 8: Checking mobile-first pattern usage..."
DESKTOP_FIRST=$(grep -r "grid-cols-[23] sm:grid-cols-1\|grid-cols-[23] md:grid-cols-1" client/src/app/pages/app/@custom/*.{tsx,jsx} 2>/dev/null | wc -l | tr -d ' ')

if [ "$DESKTOP_FIRST" -eq 0 ]; then
  echo -e "${GREEN}✓ PASS${NC}: No desktop-first anti-patterns found"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC}: Found $DESKTOP_FIRST potential desktop-first patterns"
  echo "Details:"
  grep -r "grid-cols-[23] sm:grid-cols-1\|grid-cols-[23] md:grid-cols-1" client/src/app/pages/app/@custom/*.{tsx,jsx} 2>/dev/null
fi
echo ""

# Summary
echo "=================================================="
echo "Verification Summary"
echo "=================================================="
echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
echo -e "Tests Failed: ${RED}$FAILED${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  echo "Task #9977 mobile responsiveness implementation verified successfully!"
  exit 0
else
  echo -e "${RED}✗ SOME TESTS FAILED${NC}"
  echo "Please review the failed tests above and fix the issues."
  exit 1
fi
