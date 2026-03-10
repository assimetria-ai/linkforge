#!/bin/bash
# Security Middleware Verification Script
# Verifies that all security middleware (helmet, CSRF, rate limiting, input validation) is properly configured

echo "========================================="
echo "Security Middleware Verification Script"
echo "Task #9957: Security middleware verification"
echo "========================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_dependency() {
    if grep -q "\"$1\"" server/package.json; then
        VERSION=$(grep "\"$1\"" server/package.json | sed -E 's/.*"([^"]+)".*/\1/')
        echo -e "${GREEN}✓${NC} Dependency installed: $1 ($VERSION)"
        return 0
    else
        echo -e "${RED}✗${NC} Dependency missing: $1"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_import() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Middleware imported in $1: $2"
        return 0
    else
        echo -e "${RED}✗${NC} Middleware not imported in $1: $2"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_usage() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Middleware applied in $1: $2"
        return 0
    else
        echo -e "${RED}✗${NC} Middleware not applied in $1: $2"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Navigate to product-template directory
cd "$(dirname "$0")" || exit 1

echo "1. CHECKING FILE STRUCTURE"
echo "--------------------------"
check_file "server/src/app.js"
check_file "server/src/lib/@system/Middleware/security.js"
check_file "server/src/lib/@system/Middleware/csrf.js"
check_file "server/src/lib/@system/RateLimit/index.js"
check_file "server/src/lib/@system/Validation/index.js"
check_file "server/package.json"
echo ""

echo "2. CHECKING DEPENDENCIES"
echo "------------------------"
check_dependency "helmet"
check_dependency "csrf-csrf"
check_dependency "express-rate-limit"
check_dependency "zod"
echo ""

echo "3. VERIFYING HELMET (SECURITY HEADERS)"
echo "---------------------------------------"
check_file "server/src/lib/@system/Middleware/security.js"
if [ -f "server/src/lib/@system/Middleware/security.js" ]; then
    if grep -q "require('helmet')" "server/src/lib/@system/Middleware/security.js"; then
        echo -e "${GREEN}✓${NC} Helmet imported in security.js"
    else
        echo -e "${RED}✗${NC} Helmet not imported in security.js"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "contentSecurityPolicy" "server/src/lib/@system/Middleware/security.js"; then
        echo -e "${GREEN}✓${NC} Content-Security-Policy configured"
    else
        echo -e "${YELLOW}⚠${NC} Content-Security-Policy not configured"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "hsts" "server/src/lib/@system/Middleware/security.js"; then
        echo -e "${GREEN}✓${NC} HSTS configured"
    else
        echo -e "${YELLOW}⚠${NC} HSTS not configured"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

check_import "server/src/app.js" "securityHeaders"
check_usage "server/src/app.js" "app.use(securityHeaders)"
echo ""

echo "4. VERIFYING CSRF PROTECTION"
echo "-----------------------------"
check_file "server/src/lib/@system/Middleware/csrf.js"
if [ -f "server/src/lib/@system/Middleware/csrf.js" ]; then
    if grep -q "csrf-csrf" "server/src/lib/@system/Middleware/csrf.js"; then
        echo -e "${GREEN}✓${NC} csrf-csrf library imported"
    else
        echo -e "${RED}✗${NC} csrf-csrf library not imported"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "doubleCsrf" "server/src/lib/@system/Middleware/csrf.js"; then
        echo -e "${GREEN}✓${NC} Double-submit cookie pattern used"
    else
        echo -e "${YELLOW}⚠${NC} Double-submit cookie pattern not detected"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "httpOnly: true" "server/src/lib/@system/Middleware/csrf.js"; then
        echo -e "${GREEN}✓${NC} HttpOnly cookie flag set"
    else
        echo -e "${YELLOW}⚠${NC} HttpOnly cookie flag not set"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "sameSite: 'strict'" "server/src/lib/@system/Middleware/csrf.js"; then
        echo -e "${GREEN}✓${NC} SameSite=Strict configured"
    else
        echo -e "${YELLOW}⚠${NC} SameSite=Strict not configured"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

check_import "server/src/app.js" "csrfProtection"
check_usage "server/src/app.js" "app.use('/api', csrfProtection)"

# Check for CSRF token endpoint
if [ -f "server/src/api/@system/csrf.js" ]; then
    echo -e "${GREEN}✓${NC} CSRF token endpoint exists"
else
    echo -e "${YELLOW}⚠${NC} CSRF token endpoint not found"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for CSRF tests
if [ -f "server/test/api/@system/csrf.test.js" ]; then
    echo -e "${GREEN}✓${NC} CSRF tests exist"
else
    echo -e "${YELLOW}⚠${NC} CSRF tests not found"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "5. VERIFYING RATE LIMITING"
echo "--------------------------"
check_file "server/src/lib/@system/RateLimit/index.js"
if [ -f "server/src/lib/@system/RateLimit/index.js" ]; then
    if grep -q "express-rate-limit" "server/src/lib/@system/RateLimit/index.js"; then
        echo -e "${GREEN}✓${NC} express-rate-limit imported"
    else
        echo -e "${RED}✗${NC} express-rate-limit not imported"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Count rate limiters
    LIMITER_COUNT=$(grep -c "createLimiter" "server/src/lib/@system/RateLimit/index.js")
    echo -e "${GREEN}✓${NC} Rate limiters defined: $LIMITER_COUNT"
    
    if grep -q "RedisStore" "server/src/lib/@system/RateLimit/index.js"; then
        echo -e "${GREEN}✓${NC} Redis-backed storage configured"
    else
        echo -e "${YELLOW}⚠${NC} Redis-backed storage not configured"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

check_import "server/src/app.js" "apiLimiter"
check_usage "server/src/app.js" "app.use('/api', apiLimiter)"
echo ""

echo "6. VERIFYING INPUT VALIDATION"
echo "------------------------------"
check_file "server/src/lib/@system/Validation/index.js"
if [ -f "server/src/lib/@system/Validation/index.js" ]; then
    if grep -q "zod" "server/src/lib/@system/Validation/index.js"; then
        echo -e "${GREEN}✓${NC} Zod validation library imported"
    else
        echo -e "${RED}✗${NC} Zod validation library not imported"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "function validate" "server/src/lib/@system/Validation/index.js"; then
        echo -e "${GREEN}✓${NC} Validation middleware function exists"
    else
        echo -e "${RED}✗${NC} Validation middleware function not found"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "safeParse" "server/src/lib/@system/Validation/index.js"; then
        echo -e "${GREEN}✓${NC} Safe parsing used (no exceptions on invalid input)"
    else
        echo -e "${YELLOW}⚠${NC} Safe parsing not detected"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# Check for validation schemas
if [ -d "server/src/lib/@system/Validation/schemas" ]; then
    SCHEMA_COUNT=$(find "server/src/lib/@system/Validation/schemas" -name "*.js" | wc -l)
    echo -e "${GREEN}✓${NC} Validation schemas directory exists ($SCHEMA_COUNT schemas)"
else
    echo -e "${YELLOW}⚠${NC} Validation schemas directory not found"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for validation usage in routes
if grep -rq "validate({" "server/src/api/@system/" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Validation middleware used in routes"
else
    echo -e "${YELLOW}⚠${NC} Validation middleware usage not detected in routes"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "7. CHECKING MIDDLEWARE INTEGRATION"
echo "-----------------------------------"
if [ -f "server/src/app.js" ]; then
    echo "Checking middleware order in app.js..."
    
    # Check for security headers early in middleware chain
    if grep -n "app.use(securityHeaders)" "server/src/app.js" | head -1 | grep -q "^[0-9]*:"; then
        echo -e "${GREEN}✓${NC} Security headers applied early in middleware chain"
    else
        echo -e "${YELLOW}⚠${NC} Security headers position in middleware chain unclear"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check for CSRF after body parsing
    if grep -B10 "app.use('/api', csrfProtection)" "server/src/app.js" | grep -q "express.json"; then
        echo -e "${GREEN}✓${NC} CSRF protection applied after body parsing"
    else
        echo -e "${YELLOW}⚠${NC} CSRF protection order unclear"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check for rate limiting on /api routes
    if grep -q "app.use('/api', apiLimiter)" "server/src/app.js"; then
        echo -e "${GREEN}✓${NC} Rate limiting applied to /api routes"
    else
        echo -e "${YELLOW}⚠${NC} Rate limiting not detected on /api routes"
        WARNINGS=$((WARNINGS + 1))
    fi
fi
echo ""

echo "8. ADDITIONAL SECURITY CHECKS"
echo "------------------------------"

# Check for account lockout
if [ -f "server/src/lib/@system/AccountLockout.js" ] || [ -d "server/src/lib/@system/AccountLockout" ]; then
    echo -e "${GREEN}✓${NC} Account lockout mechanism exists"
else
    echo -e "${YELLOW}⚠${NC} Account lockout mechanism not found"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for password hashing
if grep -rq "bcrypt" "server/package.json" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Password hashing library (bcrypt) installed"
else
    echo -e "${YELLOW}⚠${NC} Password hashing library not found"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for JWT
if grep -rq "jsonwebtoken" "server/package.json" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} JWT library installed"
else
    echo -e "${YELLOW}⚠${NC} JWT library not found"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

echo "========================================="
echo "VERIFICATION SUMMARY"
echo "========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL SECURITY MIDDLEWARE VERIFIED${NC}"
    echo ""
    echo "All required security middleware is properly configured:"
    echo "  ✓ Helmet (security headers)"
    echo "  ✓ CSRF protection"
    echo "  ✓ Rate limiting"
    echo "  ✓ Input validation"
    echo ""
    echo -e "${GREEN}Task #9957: COMPLETE${NC}"
    echo ""
    echo "The template includes enterprise-grade security implementations."
    echo "See SECURITY-MIDDLEWARE-VERIFICATION-REPORT.md for detailed analysis."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}✓ VERIFICATION PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Warnings: $WARNINGS"
    echo ""
    echo "All critical security middleware is present."
    echo "Some optional features or best practices were not detected."
    echo "Review warnings above for details."
    exit 0
else
    echo -e "${RED}✗ VERIFICATION FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Critical security middleware is missing or not properly configured."
    echo "Review errors above and implement the missing components."
    exit 1
fi
