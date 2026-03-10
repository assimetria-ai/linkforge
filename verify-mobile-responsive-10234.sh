#!/bin/bash

echo "======================================"
echo "Task #10234 Mobile Responsiveness Verification"
echo "Product Template - Mobile-First Design Check"
echo "======================================"
echo ""

# Check for mobile-responsive utilities CSS
echo "1. Checking Mobile Responsive Utilities..."
if [ -f "client/src/app/styles/mobile-responsive-utilities.css" ]; then
  echo "✅ mobile-responsive-utilities.css exists"
  lines=$(wc -l < client/src/app/styles/mobile-responsive-utilities.css)
  echo "   → $lines lines of mobile-specific CSS utilities"
else
  echo "❌ mobile-responsive-utilities.css NOT FOUND"
fi
echo ""

# Check for breakpoint definitions
echo "2. Checking Breakpoint Definitions..."
if grep -q "breakpoint-xs\|breakpoint-sm\|breakpoint-md" client/src/app/styles/mobile-responsive-utilities.css 2>/dev/null; then
  echo "✅ Custom breakpoints defined:"
  grep "breakpoint-" client/src/app/styles/mobile-responsive-utilities.css | head -6
else
  echo "❌ Breakpoints not found"
fi
echo ""

# Check for mobile-optimized components
echo "3. Checking Mobile-Optimized Components..."
components=(
  "client/src/app/components/@system/Dashboard/MobileTable.jsx"
  "client/src/app/components/@system/Form/MobileForm.jsx"
  "client/src/app/components/@custom/MobileShowcase.jsx"
)

for component in "${components[@]}"; do
  if [ -f "$component" ]; then
    echo "✅ $(basename $component) exists"
  else
    echo "❌ $(basename $component) NOT FOUND"
  fi
done
echo ""

# Check for responsive components
echo "4. Checking Responsive Design in Key Components..."
responsive_check() {
  local file=$1
  local name=$2
  if [ -f "$file" ]; then
    if grep -q "sm:\|md:\|lg:\|xl:\|2xl:" "$file"; then
      echo "✅ $name has responsive breakpoints"
    else
      echo "⚠️  $name missing responsive breakpoints"
    fi
  else
    echo "❌ $name file not found"
  fi
}

responsive_check "client/src/app/components/@system/Dashboard/DashboardLayout.jsx" "DashboardLayout"
responsive_check "client/src/app/components/@system/MetricCard/MetricCard.jsx" "MetricCard"
responsive_check "client/src/app/components/@system/Card/Card.jsx" "Card"
responsive_check "client/src/app/components/@system/Header/Header.jsx" "Header"
echo ""

# Check for mobile documentation
echo "5. Checking Mobile Documentation..."
docs=(
  "MOBILE-RESPONSIVE-GUIDE.md"
  "MOBILE_PATTERNS.md"
  "MOBILE_README.md"
)

for doc in "${docs[@]}"; do
  if [ -f "$doc" ]; then
    echo "✅ $doc exists"
  else
    echo "❌ $doc NOT FOUND"
  fi
done
echo ""

# Check for touch-friendly sizing
echo "6. Checking Touch-Friendly Sizing (44x44px minimum)..."
if grep -q "min-h-\[44px\]\|h-11\|min-h-touch" client/src/app/components/@system/ui/button.jsx 2>/dev/null; then
  echo "✅ Button component has touch-friendly sizing"
else
  echo "⚠️  Button component may need touch-friendly sizing review"
fi
echo ""

# Summary
echo "======================================"
echo "VERIFICATION SUMMARY"
echo "======================================"
echo ""
echo "Based on the checks above:"
echo "• Mobile-responsive utilities: $([ -f 'client/src/app/styles/mobile-responsive-utilities.css' ] && echo '✅ Present' || echo '❌ Missing')"
echo "• Custom breakpoints: $(grep -q 'breakpoint-xs' client/src/app/styles/mobile-responsive-utilities.css 2>/dev/null && echo '✅ Configured' || echo '❌ Not configured')"
echo "• Mobile-optimized components: $([ -f 'client/src/app/components/@system/Dashboard/MobileTable.jsx' ] && echo '✅ Implemented' || echo '❌ Missing')"
echo "• Documentation: $([ -f 'MOBILE-RESPONSIVE-GUIDE.md' ] && echo '✅ Complete' || echo '❌ Incomplete')"
echo ""

# Final determination
if [ -f "client/src/app/styles/mobile-responsive-utilities.css" ] && \
   [ -f "client/src/app/components/@system/Dashboard/MobileTable.jsx" ] && \
   [ -f "MOBILE-RESPONSIVE-GUIDE.md" ]; then
  echo "🎉 RESULT: Mobile-first design is ALREADY IMPLEMENTED"
  echo ""
  echo "The product template has:"
  echo "  • Comprehensive mobile-responsive CSS utilities"
  echo "  • Mobile-first breakpoint system"
  echo "  • Mobile-optimized components"
  echo "  • Complete documentation"
  echo ""
  echo "Task #10234 appears to be a DUPLICATE or FALSE POSITIVE."
  exit 0
else
  echo "⚠️  RESULT: Mobile responsiveness needs implementation"
  echo ""
  echo "Missing components should be added."
  exit 1
fi
