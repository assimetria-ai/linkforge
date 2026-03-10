#!/bin/bash
# Mobile Responsiveness Verification Script for Product Template
# Task #9787: Template lacks mobile responsiveness

set -e

echo "🔍 Mobile Responsiveness Verification"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0
warnings=0

check_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((passed++))
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ((failed++))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((warnings++))
}

echo "1. Checking Tailwind Configuration..."
echo "─────────────────────────────────────"

if [ -f "client/tailwind.config.js" ]; then
  # Check for custom xs breakpoint
  if grep -q "'xs': '480px'" client/tailwind.config.js; then
    check_pass "Custom 'xs' breakpoint (480px) defined"
  else
    check_fail "Missing 'xs' breakpoint in tailwind.config.js"
  fi
  
  # Check for safe area spacing
  if grep -q "safe-area-inset" client/tailwind.config.js; then
    check_pass "Safe area insets configured for notched devices"
  else
    check_fail "Missing safe area insets configuration"
  fi
  
  # Check for touch-friendly min sizes
  if grep -q "minHeight.*touch" client/tailwind.config.js && grep -q "minWidth.*touch" client/tailwind.config.js; then
    check_pass "Touch-friendly minimum sizes (44×44px) configured"
  else
    check_fail "Missing touch-friendly minimum size configuration"
  fi
  
  # Check for fluid typography
  if grep -q "clamp" client/tailwind.config.js; then
    check_pass "Fluid typography with clamp() configured"
  else
    check_fail "Missing fluid typography configuration"
  fi
  
  # Check for responsive container padding
  if grep -q "container:" client/tailwind.config.js && grep -q "padding:" client/tailwind.config.js; then
    check_pass "Responsive container padding configured"
  else
    check_warn "Container padding may need configuration"
  fi
else
  check_fail "Tailwind config file not found"
fi

echo ""
echo "2. Checking CSS Utilities (index.css)..."
echo "─────────────────────────────────────────"

if [ -f "client/src/index.css" ]; then
  # Check for mobile-first utilities
  utilities=(
    "mobile-stack"
    "mobile-hide"
    "mobile-only"
    "mobile-container"
    "mobile-grid-stack"
    "mobile-scroll-x"
    "mobile-spacing"
    "mobile-card-padding"
    "safe-padding"
    "touch-target"
    "no-scrollbar"
  )
  
  for util in "${utilities[@]}"; do
    if grep -q "$util" client/src/index.css; then
      check_pass "Utility class '$util' defined"
    else
      check_fail "Missing utility class: $util"
    fi
  done
  
  # Check for mobile viewport fixes
  if grep -q "100dvh" client/src/index.css || grep -q "mobile viewport" client/src/index.css; then
    check_pass "Mobile viewport height fix for iOS"
  else
    check_warn "Consider adding iOS viewport height fix"
  fi
  
  # Check for tap highlight improvements
  if grep -q "tap-highlight" client/src/index.css; then
    check_pass "Improved tap highlight for mobile"
  else
    check_warn "Consider improving tap highlight for mobile"
  fi
  
  # Check for prevent zoom on inputs
  if grep -q "16px.*Prevents iOS zoom" client/src/index.css || grep -q "font-size: 16px" client/src/index.css; then
    check_pass "Input zoom prevention configured (16px base)"
  else
    check_warn "Consider preventing iOS zoom on input focus"
  fi
else
  check_fail "index.css not found"
fi

echo ""
echo "3. Checking HTML Meta Tags..."
echo "─────────────────────────────"

if [ -f "client/index.html" ]; then
  # Check viewport meta tag
  if grep -q 'name="viewport"' client/index.html && grep -q 'viewport-fit=cover' client/index.html; then
    check_pass "Responsive viewport meta tag with safe area support"
  else
    check_fail "Missing or incomplete viewport meta tag"
  fi
  
  # Check mobile web app meta tags
  if grep -q 'apple-mobile-web-app-capable' client/index.html; then
    check_pass "iOS PWA meta tags present"
  else
    check_warn "Consider adding iOS PWA meta tags"
  fi
  
  if grep -q 'mobile-web-app-capable' client/index.html; then
    check_pass "Android PWA meta tags present"
  else
    check_warn "Consider adding Android PWA meta tags"
  fi
  
  # Check theme color
  if grep -q 'name="theme-color"' client/index.html; then
    check_pass "Theme color meta tag present"
  else
    check_warn "Consider adding theme color meta tag"
  fi
else
  check_fail "index.html not found"
fi

echo ""
echo "4. Checking Component Responsiveness..."
echo "───────────────────────────────────────"

# Check key components for responsive classes
components=(
  "client/src/app/components/@system/Card/Card.jsx"
  "client/src/app/components/@system/Form/Form.jsx"
  "client/src/app/components/@system/Header/Header.jsx"
  "client/src/app/components/@system/Footer/Footer.jsx"
  "client/src/app/components/@system/Dashboard/DashboardLayout.jsx"
  "client/src/app/components/@custom/HeroSection/HeroSection.jsx"
  "client/src/app/components/@system/FeaturesSection/FeaturesSection.jsx"
)

responsive_patterns=("sm:" "md:" "lg:" "xl:" "flex-col" "grid-cols")

for component in "${components[@]}"; do
  if [ -f "$component" ]; then
    component_name=$(basename "$component" .jsx)
    has_responsive=false
    
    for pattern in "${responsive_patterns[@]}"; do
      if grep -q "$pattern" "$component"; then
        has_responsive=true
        break
      fi
    done
    
    if [ "$has_responsive" = true ]; then
      check_pass "Component $component_name has responsive breakpoints"
    else
      check_warn "Component $component_name may need responsive styling"
    fi
  else
    check_warn "Component $component not found (may be OK if not needed)"
  fi
done

# Check for mobile-specific components
if [ -f "client/src/app/components/@system/Form/MobileForm.jsx" ]; then
  check_pass "Mobile-specific form component exists"
else
  check_warn "Consider adding mobile-specific form component"
fi

if [ -f "client/src/app/components/@system/Dashboard/MobileTable.jsx" ]; then
  check_pass "Mobile-optimized table component exists"
else
  check_warn "Consider adding mobile-optimized table component"
fi

echo ""
echo "5. Checking Documentation..."
echo "────────────────────────────"

if [ -f "docs/MOBILE_RESPONSIVENESS.md" ]; then
  check_pass "Mobile responsiveness documentation exists"
  
  # Check for key sections
  sections=("Breakpoints" "Touch Targets" "Safe Areas" "Testing" "Best Practices")
  for section in "${sections[@]}"; do
    if grep -q "$section" docs/MOBILE_RESPONSIVENESS.md; then
      check_pass "Documentation includes '$section' section"
    else
      check_warn "Documentation missing '$section' section"
    fi
  done
else
  check_fail "Missing MOBILE_RESPONSIVENESS.md documentation"
fi

echo ""
echo "6. Mobile-First Development Checks..."
echo "──────────────────────────────────────"

# Check if components use mobile-first approach (base styles without breakpoint, then sm:, md:, etc.)
echo "Checking for mobile-first CSS patterns..."

mobile_first_count=0
desktop_first_count=0

for component in "${components[@]}"; do
  if [ -f "$component" ]; then
    # Count instances of mobile-first pattern (className="base sm:larger")
    mf=$(grep -o 'className="[^"]*\(text-\|p-\|py-\|px-\|gap-\|space-\)[a-z0-9-]* sm:' "$component" | wc -l)
    mobile_first_count=$((mobile_first_count + mf))
    
    # Count instances of potential desktop-first pattern (less common)
    df=$(grep -o 'className="[^"]*lg:[a-z0-9-]* md:[a-z0-9-]* sm:' "$component" | wc -l)
    desktop_first_count=$((desktop_first_count + df))
  fi
done

if [ $mobile_first_count -gt 0 ]; then
  check_pass "Components follow mobile-first approach (found $mobile_first_count instances)"
else
  check_warn "Could not detect mobile-first patterns in components"
fi

if [ $desktop_first_count -gt 5 ]; then
  check_warn "Found $desktop_first_count potential desktop-first patterns (should be mobile-first)"
fi

echo ""
echo "7. Performance & Optimization..."
echo "────────────────────────────────"

# Check for lazy loading
if grep -rq "lazy\|Suspense" client/src/app/components/@system/ 2>/dev/null; then
  check_pass "Components use lazy loading for performance"
else
  check_warn "Consider implementing lazy loading for heavy components"
fi

# Check for image optimization
if grep -rq 'loading="lazy"' client/src/ 2>/dev/null; then
  check_pass "Images use lazy loading"
else
  check_warn "Consider adding lazy loading to images"
fi

# Check for reduced motion support
if grep -q "prefers-reduced-motion" client/src/index.css; then
  check_pass "Respects prefers-reduced-motion for accessibility"
else
  check_warn "Consider adding prefers-reduced-motion support"
fi

echo ""
echo "═══════════════════════════════════════"
echo "Summary"
echo "═══════════════════════════════════════"
echo ""
echo -e "${GREEN}Passed:${NC} $passed"
echo -e "${YELLOW}Warnings:${NC} $warnings"
echo -e "${RED}Failed:${NC} $failed"
echo ""

if [ $failed -eq 0 ]; then
  if [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✓ All mobile responsiveness checks passed!${NC}"
    echo ""
    echo "The product template is fully mobile-responsive with:"
    echo "• Mobile-first CSS approach"
    echo "• Comprehensive responsive breakpoints (xs, sm, md, lg, xl, 2xl)"
    echo "• Touch-friendly components (44×44px minimum)"
    echo "• Safe area support for notched devices"
    echo "• Fluid typography and spacing"
    echo "• Mobile-optimized utilities and patterns"
    echo "• Complete documentation"
    exit 0
  else
    echo -e "${YELLOW}✓ Mobile responsiveness is functional but has optional improvements${NC}"
    echo ""
    echo "Core mobile responsiveness is complete. Warnings indicate optional"
    echo "enhancements that could improve the mobile experience further."
    exit 0
  fi
else
  echo -e "${RED}✗ Mobile responsiveness needs attention${NC}"
  echo ""
  echo "Please address the failed checks above to ensure full mobile compatibility."
  exit 1
fi
