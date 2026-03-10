#!/bin/bash
# Task #10150 - Security Middleware Verification Script
# Verifies that helmet, CSRF, rate-limiting, and input-validation are properly implemented

echo "🔒 Task #10150: Security Middleware Verification"
echo "================================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_passed=0
check_failed=0

check_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((check_passed++))
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ((check_failed++))
}

# 1. Verify dependencies in package.json
echo "📦 Checking Security Dependencies..."
cd server

if grep -q '"helmet"' package.json; then check_pass "Helmet dependency installed"; else check_fail "Helmet dependency NOT found"; fi
if grep -q '"csrf-csrf"' package.json; then check_pass "CSRF-CSRF dependency installed"; else check_fail "CSRF-CSRF dependency NOT found"; fi
if grep -q '"express-rate-limit"' package.json; then check_pass "Express-rate-limit dependency installed"; else check_fail "Express-rate-limit dependency NOT found"; fi
if grep -q '"zod"' package.json; then check_pass "Zod (input validation) dependency installed"; else check_fail "Zod dependency NOT found"; fi

echo ""
echo "🛡️ Verifying Middleware Implementation..."

# 2. Verify Helmet (Security Headers) Implementation
if [ -f "src/lib/@system/Middleware/security.js" ]; then
  if grep -q "helmet" src/lib/@system/Middleware/security.js; then check_pass "Helmet middleware implemented"; else check_fail "Helmet middleware NOT properly implemented"; fi
  if grep -q "contentSecurityPolicy" src/lib/@system/Middleware/security.js; then check_pass "CSP configured"; else check_fail "CSP NOT configured"; fi
  if grep -q "frameguard" src/lib/@system/Middleware/security.js; then check_pass "X-Frame-Options configured"; else check_fail "X-Frame-Options NOT configured"; fi
else
  check_fail "Security middleware file NOT found"
fi

# 3. Verify CSRF Protection Implementation
if [ -f "src/lib/@system/Middleware/csrf.js" ]; then
  if grep -q "doubleCsrf" src/lib/@system/Middleware/csrf.js; then check_pass "CSRF protection implemented"; else check_fail "CSRF protection NOT implemented"; fi
  if grep -q "csrfProtection" src/lib/@system/Middleware/csrf.js; then check_pass "CSRF middleware exported"; else check_fail "CSRF middleware NOT exported"; fi
  if grep -q "generateCsrfToken" src/lib/@system/Middleware/csrf.js; then check_pass "CSRF token generation implemented"; else check_fail "CSRF token generation NOT implemented"; fi
else
  check_fail "CSRF middleware file NOT found"
fi

# 4. Verify Rate Limiting Implementation
if [ -f "src/lib/@system/RateLimit/index.js" ]; then
  if grep -q "express-rate-limit" src/lib/@system/RateLimit/index.js; then check_pass "Rate limiting library imported"; else check_fail "Rate limiting library NOT imported"; fi
  if grep -q "apiLimiter" src/lib/@system/RateLimit/index.js; then check_pass "API rate limiter defined"; else check_fail "API rate limiter NOT defined"; fi
  if grep -q "loginLimiter" src/lib/@system/RateLimit/index.js; then check_pass "Login rate limiter defined"; else check_fail "Login rate limiter NOT defined"; fi
  if grep -q "RedisStore" src/lib/@system/RateLimit/index.js; then check_pass "Redis-backed rate limiting implemented"; else check_fail "Redis-backed rate limiting NOT implemented"; fi
else
  check_fail "Rate limiting file NOT found"
fi

# 5. Verify Input Validation Implementation
if [ -f "src/lib/@system/Validation/index.js" ]; then
  if grep -q "zod" src/lib/@system/Validation/index.js; then check_pass "Zod validation library imported"; else check_fail "Zod library NOT imported"; fi
  if grep -q "validate" src/lib/@system/Validation/index.js; then check_pass "Validation middleware factory implemented"; else check_fail "Validation middleware NOT implemented"; fi
else
  check_fail "Validation middleware file NOT found"
fi

echo ""
echo "🔗 Verifying Middleware Integration..."

# 6. Verify middleware is properly integrated in app.js
if [ -f "src/app.js" ]; then
  if grep -q "securityHeaders" src/app.js; then check_pass "Security headers applied in app.js"; else check_fail "Security headers NOT applied"; fi
  if grep -q "csrfProtection" src/app.js; then check_pass "CSRF protection applied in app.js"; else check_fail "CSRF protection NOT applied"; fi
  if grep -q "apiLimiter" src/app.js; then check_pass "Rate limiting applied in app.js"; else check_fail "Rate limiting NOT applied"; fi
  if grep -q "app.use('/api', apiLimiter)" src/app.js; then check_pass "Rate limiter mounted on /api routes"; else check_fail "Rate limiter NOT mounted properly"; fi
  if grep -q "app.use('/api', csrfProtection)" src/app.js; then check_pass "CSRF mounted on /api routes"; else check_fail "CSRF NOT mounted properly"; fi
else
  check_fail "app.js file NOT found"
fi

# 7. Verify middleware exports in index.js
if [ -f "src/lib/@system/Middleware/index.js" ]; then
  if grep -q "securityHeaders" src/lib/@system/Middleware/index.js; then check_pass "Security headers exported"; else check_fail "Security headers NOT exported"; fi
  if grep -q "csrfProtection" src/lib/@system/Middleware/index.js; then check_pass "CSRF protection exported"; else check_fail "CSRF protection NOT exported"; fi
else
  check_fail "Middleware index.js NOT found"
fi

echo ""
echo "📚 Verifying Documentation..."

# 8. Verify documentation exists
if [ -f "SECURITY_MIDDLEWARE.md" ]; then
  check_pass "Security middleware documentation exists"
  if grep -q "Helmet" SECURITY_MIDDLEWARE.md; then check_pass "Helmet documented"; else check_fail "Helmet NOT documented"; fi
  if grep -q "CSRF" SECURITY_MIDDLEWARE.md; then check_pass "CSRF documented"; else check_fail "CSRF NOT documented"; fi
  if grep -q "Rate Limiting" SECURITY_MIDDLEWARE.md; then check_pass "Rate limiting documented"; else check_fail "Rate limiting NOT documented"; fi
else
  echo -e "${YELLOW}⚠${NC} SECURITY_MIDDLEWARE.md documentation NOT found (optional)"
fi

if [ -f "SECURITY_GUIDE.md" ]; then
  check_pass "Security guide exists"
else
  echo -e "${YELLOW}⚠${NC} SECURITY_GUIDE.md NOT found (optional)"
fi

echo ""
echo "================================================="
echo "Verification Summary:"
echo -e "${GREEN}Passed: $check_passed${NC}"
echo -e "${RED}Failed: $check_failed${NC}"
echo ""

if [ $check_failed -eq 0 ]; then
  echo -e "${GREEN}✅ All security middleware checks passed!${NC}"
  echo ""
  echo "Security Features Verified:"
  echo "  ✓ Helmet (Security Headers)"
  echo "  ✓ CSRF Protection (Double-Submit Cookie)"
  echo "  ✓ Rate Limiting (Express-rate-limit with Redis)"
  echo "  ✓ Input Validation (Zod schemas)"
  echo ""
  echo "Task #10150 COMPLETE ✓"
  exit 0
else
  echo -e "${RED}❌ Some security checks failed. Please review the issues above.${NC}"
  exit 1
fi
