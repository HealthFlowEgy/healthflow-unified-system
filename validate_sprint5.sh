#!/bin/bash

echo "========================================="
echo "Sprint 5 Validation Script"
echo "========================================="
echo ""

PASS=0
FAIL=0

check() {
  if [ $? -eq 0 ]; then
    echo "✅ $1"
    ((PASS++))
  else
    echo "❌ $1"
    ((FAIL++))
  fi
}

# Check Sprint 5 services exist
echo "Checking Sprint 5 Services..."
[ -d "services/file-service" ]; check "File Service directory exists"
[ -d "services/user-management-service" ]; check "User Management Service directory exists"
[ -d "services/bi-dashboard-service" ]; check "BI Dashboard Service directory exists"
[ -d "portals/admin-portal" ]; check "Admin Portal directory exists"

# Check database migrations
echo ""
echo "Checking Database Migrations..."
[ -f "shared/database/migrations/007_sprint5_file_service.sql" ]; check "File Service migration exists"
[ -f "shared/database/migrations/008_sprint5_user_management.sql" ]; check "User Management migration exists"
[ -f "shared/database/migrations/009_sprint5_bi_dashboard.sql" ]; check "BI Dashboard migration exists"

# Check File Service files
echo ""
echo "Checking File Service..."
[ -f "services/file-service/package.json" ]; check "File Service package.json"
[ -f "services/file-service/src/models/schema.ts" ]; check "File Service schema"
[ -f "services/file-service/src/controllers/fileController.ts" ]; check "File Service controller"
[ -f "services/file-service/src/services/storageService.ts" ]; check "Storage service"

# Check User Management Service files
echo ""
echo "Checking User Management Service..."
[ -f "services/user-management-service/package.json" ]; check "User Management package.json"
[ -f "services/user-management-service/src/models/schema.ts" ]; check "User Management schema"
[ -f "services/user-management-service/src/controllers/userController.ts" ]; check "User controller"
[ -f "services/user-management-service/src/controllers/roleController.ts" ]; check "Role controller"
[ -f "services/user-management-service/src/controllers/organizationController.ts" ]; check "Organization controller"

# Check BI Dashboard Service files
echo ""
echo "Checking BI Dashboard Service..."
[ -f "services/bi-dashboard-service/package.json" ]; check "BI Dashboard package.json"
[ -f "services/bi-dashboard-service/src/models/schema.ts" ]; check "BI Dashboard schema"
[ -f "services/bi-dashboard-service/src/controllers/dashboardController.ts" ]; check "Dashboard controller"
[ -f "services/bi-dashboard-service/src/controllers/analyticsController.ts" ]; check "Analytics controller"
[ -f "services/bi-dashboard-service/src/services/analyticsService.ts" ]; check "Analytics service"

# Check Admin Portal files
echo ""
echo "Checking Admin Portal..."
[ -f "portals/admin-portal/package.json" ]; check "Admin Portal package.json"
[ -f "portals/admin-portal/src/App.tsx" ]; check "Admin Portal App.tsx"
[ -f "portals/admin-portal/src/pages/Dashboard.tsx" ]; check "Dashboard page"
[ -f "portals/admin-portal/src/pages/UserList.tsx" ]; check "UserList page"
[ -f "portals/admin-portal/src/pages/AnalyticsDashboard.tsx" ]; check "AnalyticsDashboard page"

# Check OAuth2 implementation
echo ""
echo "Checking OAuth2 Implementation..."
[ -f "services/auth-service/src/services/oauthProvider.ts" ]; check "OAuth Provider service"
[ -f "services/auth-service/src/routes/oauthRoutes.ts" ]; check "OAuth routes"

# Check enhanced Notification Service
echo ""
echo "Checking Enhanced Notification Service..."
[ -f "services/notification-service/src/services/emailService.ts" ]; check "Enhanced Email Service"
[ -f "services/notification-service/src/services/smsService.ts" ]; check "Enhanced SMS Service"

# Check Testing Suite
echo ""
echo "Checking Testing Suite..."
[ -d "tests" ]; check "Tests directory exists"
[ -f "tests/package.json" ]; check "Tests package.json"
[ -f "tests/user-management.test.ts" ]; check "User Management tests"
[ -f "tests/bi-dashboard.test.ts" ]; check "BI Dashboard tests"
[ -f "tests/file-service.test.ts" ]; check "File Service tests"

# Check Docker integration
echo ""
echo "Checking Docker Integration..."
grep -q "file-service" docker-compose.yml; check "File Service in docker-compose"
grep -q "user-management-service" docker-compose.yml; check "User Management Service in docker-compose"
grep -q "bi-dashboard-service" docker-compose.yml; check "BI Dashboard Service in docker-compose"
grep -q "admin-portal" docker-compose.yml; check "Admin Portal in docker-compose"

# Summary
echo ""
echo "========================================="
echo "Validation Summary"
echo "========================================="
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo "Total Checks: $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 All Sprint 5 validations passed!"
  exit 0
else
  echo "⚠️  Some validations failed. Please review."
  exit 1
fi
